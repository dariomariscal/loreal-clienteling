import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { verifyToken } from "@clerk/backend";
import type { Request } from "express";
import { CLERK_CLIENT, type ClerkClient } from "../../integrations/clerk/clerk.provider";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { SessionUser, UserSession } from "../../common/types/session";

type AuthRequest = Request & { session?: UserSession; user?: SessionUser };

/**
 * Verifies a Clerk-issued JWT on `Authorization: Bearer <token>` and populates
 * `req.session` with our canonical `UserSession`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(CLERK_CLIENT) private readonly clerk: ClerkClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = extractBearer(req);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        jwtKey: process.env.CLERK_JWT_KEY,
      });

      const meta = (payload.metadata ?? {}) as Record<string, unknown>;
      const claims = payload as unknown as Record<string, unknown>;

      const user: SessionUser = {
        id: payload.sub,
        email: String(claims.email ?? claims.primary_email_address ?? ""),
        role: (meta.role as SessionUser["role"]) ?? "ba",
        storeId: (meta.storeId as string) ?? null,
        zoneId: (meta.zoneId as string) ?? null,
        brandId: (meta.brandId as string) ?? null,
        active: meta.active === undefined ? true : Boolean(meta.active),
        fullName: (meta.fullName as string) ?? (claims.name as string) ?? "",
      };

      req.session = {
        user,
        session: {
          id: payload.sid ?? payload.sub,
          token,
          expiresAt: new Date((payload.exp ?? 0) * 1000),
          userId: payload.sub,
        },
      };
      req.user = user;
      return true;
    } catch (err) {
      this.logger.debug(`Clerk token verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException("Invalid bearer token");
    }
  }
}

function extractBearer(req: AuthRequest): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}
