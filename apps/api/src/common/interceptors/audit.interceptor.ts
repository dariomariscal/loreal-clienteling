import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditService } from "../services/audit.service";
import type { Request } from "express";

// Map URL path prefix (first segment) to entity type for audit logs.
// Anything not listed here is logged with the raw path segment.
const ENTITY_MAP: Record<string, string> = {
  brands: "brand",
  stores: "store",
  zones: "zone",
  products: "product",
  customers: "customer",
  beauty: "beauty_profile",
  consents: "consent",
  recommendations: "recommendation",
  orders: "order",
  samples: "sample",
  appointments: "appointment",
  "service-types": "service_type",
  messages: "message",
  notes: "note",
  users: "user",
  uploads: "upload",
};

const METHOD_TO_ACTION: Record<string, string> = {
  POST: "create",
  PATCH: "update",
  PUT: "update",
  DELETE: "delete",
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(@Inject(AuditService) private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: any; session?: any }>();
    const method = req.method;
    const action = METHOD_TO_ACTION[method];

    // Only audit writes
    if (!action) return next.handle();

    // Webhooks are inbound integration events, not user-driven writes.
    const path = req.path ?? req.url ?? "";
    if (path.startsWith("/webhooks/")) {
      return next.handle();
    }

    const segments = path.replace(/^\/+/, "").split("/").filter(Boolean);
    const resource = segments[0] ?? "unknown";
    const entityType = ENTITY_MAP[resource] ?? resource;

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      req.socket?.remoteAddress ??
      undefined;
    const userAgent = req.headers["user-agent"] ?? undefined;

    return next.handle().pipe(
      tap({
        next: (response: any) => {
          const actor =
            (req as any).session?.user ?? (req as any).user ?? null;

          // Best-effort entity id resolution: response.id > param :id > "bulk"
          const entityId =
            (response && typeof response === "object" && response.id) ||
            (req.params && (req.params as any).id) ||
            "bulk";

          // Capture body as changes for create/update; for delete just record the id
          const changes =
            action === "delete" ? undefined : this.safeBody(req.body);

          this.audit
            .log(actor, action, entityType, String(entityId), changes, {
              ipAddress,
              userAgent,
            })
            .catch((err) =>
              this.logger.warn(`Audit log failed: ${err?.message ?? err}`),
            );
        },
      }),
    );
  }

  private safeBody(body: unknown): Record<string, unknown> | undefined {
    if (!body || typeof body !== "object") return undefined;
    const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    // Strip secrets if they ever appear in a request body
    for (const key of ["password", "currentPassword", "newPassword", "token"]) {
      if (key in clone) clone[key] = "[redacted]";
    }
    return clone;
  }
}
