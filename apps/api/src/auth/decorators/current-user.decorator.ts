import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { SessionUser, UserSession } from "../../common/types/session";

/** Inject the authenticated user (the SessionUser populated by the auth guard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const req = ctx.switchToHttp().getRequest<{ session?: UserSession }>();
    if (!req.session?.user) {
      throw new Error("CurrentUser used on an unauthenticated request");
    }
    return req.session.user;
  },
);
