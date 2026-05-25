import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { users } from "@loreal/database";
import {
  DATABASE_TOKEN,
  type Database,
} from "../../config/database.provider";

type ClerkEmail = { id: string; email_address: string };

interface ClerkUserData {
  id: string;
  email_addresses?: ClerkEmail[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  public_metadata?: Record<string, unknown>;
}

interface ClerkSessionData {
  user_id: string;
  created_at: number;
}

export type ClerkWebhookEvent =
  | { type: "user.created"; data: ClerkUserData }
  | { type: "user.updated"; data: ClerkUserData }
  | { type: "user.deleted"; data: { id: string; deleted: boolean } }
  | { type: "session.created"; data: ClerkSessionData };

@Injectable()
export class ClerkWebhooksService {
  private readonly logger = new Logger(ClerkWebhooksService.name);

  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async handle(event: ClerkWebhookEvent): Promise<void> {
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await this.upsertUser(event.data);
        return;
      case "user.deleted":
        await this.deactivateUser(event.data.id);
        return;
      case "session.created":
        await this.markLoggedIn(event.data.user_id);
        return;
      default:
        this.logger.debug(`Unhandled Clerk event: ${(event as { type: string }).type}`);
    }
  }

  private async upsertUser(data: ClerkUserData): Promise<void> {
    const email = primaryEmail(data);
    if (!email) {
      this.logger.warn(`Clerk user ${data.id} has no primary email; skipping`);
      return;
    }

    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || email;
    const meta = data.public_metadata ?? {};

    const isActiveFromMeta =
      meta.isActive !== undefined
        ? Boolean(meta.isActive)
        : meta.active !== undefined
          ? Boolean(meta.active)
          : true;

    const values = {
      id: data.id,
      email,
      fullName,
      avatarUrl: data.image_url ?? null,
      role: (meta.role as string) ?? "ba",
      storeId: (meta.storeId as string) ?? null,
      zoneId: (meta.zoneId as string) ?? null,
      brandId: (meta.brandId as string) ?? null,
      isActive: isActiveFromMeta,
      invitationStatus: (meta.invitationStatus as string) ?? "accepted",
      invitedByUserId: (meta.invitedByUserId as string) ?? null,
    };

    // An email may already be claimed by an older mirror row whose Clerk user
    // was deleted out-of-band (e.g. wiped via the dashboard during dev). Drop
    // the stale row before inserting so the unique(email) constraint doesn't
    // bounce the upsert.
    await this.db
      .delete(users)
      .where(and(eq(users.email, email), sql`${users.id} <> ${data.id}`));

    await this.db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: values.email,
          fullName: values.fullName,
          avatarUrl: values.avatarUrl,
          role: values.role,
          storeId: values.storeId,
          zoneId: values.zoneId,
          brandId: values.brandId,
          isActive: values.isActive,
          invitationStatus: values.invitationStatus,
        },
      });
  }

  private async deactivateUser(id: string): Promise<void> {
    // Soft delete: domain rows reference users.id (customers, audit logs).
    await this.db.update(users).set({ isActive: false }).where(eq(users.id, id));
  }

  private async markLoggedIn(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastSignInAt: new Date() })
      .where(eq(users.id, userId));
  }
}

function primaryEmail(data: ClerkUserData): string | null {
  const list = data.email_addresses ?? [];
  if (list.length === 0) return null;
  const primary = list.find((e) => e.id === data.primary_email_address_id);
  return (primary ?? list[0])?.email_address ?? null;
}
