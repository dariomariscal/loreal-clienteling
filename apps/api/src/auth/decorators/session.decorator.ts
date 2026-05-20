import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { UserSession } from "../../common/types/session";

/** Inject the full UserSession (user + session metadata). */
export const Session = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserSession => {
    const req = ctx.switchToHttp().getRequest<{ session?: UserSession }>();
    if (!req.session) {
      throw new Error("Session used on an unauthenticated request");
    }
    return req.session;
  },
);
