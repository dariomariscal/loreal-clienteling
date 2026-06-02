import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";

/**
 * Thin wrapper over the `web-push` library.
 *
 * VAPID keys must be provided via env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
 * `VAPID_SUBJECT` — a mailto: URL or page URL). If they are not set the
 * service starts in "disabled" mode: subscribe endpoints still work (so the
 * frontend can register the subscription) but `send()` is a no-op. This is
 * intentional so local dev without VAPID keys does not break notifications.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;
  private publicKey = "";

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const publicKey = this.config.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.config.get<string>("VAPID_PRIVATE_KEY");
    const subject =
      this.config.get<string>("VAPID_SUBJECT") ?? "mailto:notifications@loreal.local";

    if (!publicKey || !privateKey) {
      this.logger.warn(
        "VAPID keys not configured — Web Push disabled. " +
          "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable.",
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.publicKey = publicKey;
    this.enabled = true;
    this.logger.log("Web Push enabled");
  }

  getPublicKey(): string | null {
    return this.enabled ? this.publicKey : null;
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Dispatch a payload to a single subscription. Returns:
   *   - `"ok"`   on success
   *   - `"gone"` on 404/410 (subscription is dead, caller should revoke it)
   *   - `"error"` on transient failures (caller may retry later)
   */
  async send(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: Record<string, unknown>,
  ): Promise<"ok" | "gone" | "error"> {
    if (!this.enabled) return "ok";
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 },
      );
      return "ok";
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;
      if (status === 404 || status === 410) return "gone";
      this.logger.warn(
        `Push send failed (status=${status ?? "?"}): ${(err as Error).message}`,
      );
      return "error";
    }
  }
}
