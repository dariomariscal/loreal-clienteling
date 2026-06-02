import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, sql, gte } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { scanEvents, productVariants } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type { CreateScanEventDto } from "../../dtos/scan.dto";

@Injectable()
export class ScansService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  /**
   * Persist a scan event. actionTaken is optional at this point — the BA may
   * scan first and pick an action later via PATCH. Customer attachment is
   * also optional (anonymous stock checks are legitimate).
   */
  async create(data: CreateScanEventDto, user: SessionUser) {
    const storeId = this.scopeService.assertStore(user);

    // Verify the variant exists; this also protects against typo'd UUIDs that
    // would otherwise blow up on FK insertion with an opaque pg error.
    const [variant] = await this.db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.id, data.variantId));
    if (!variant) throw new NotFoundException("Variant not found");

    if (data.customerId) {
      await this.scopeService.assertCustomerAccess(data.customerId, user);
    }

    const [event] = await this.db
      .insert(scanEvents)
      .values({
        userId: user.id,
        variantId: data.variantId,
        customerId: data.customerId ?? null,
        storeId,
        actionTaken: data.actionTaken ?? null,
      })
      .returning();

    await this.auditService.log(user, "create", "scan_event", event.id, {
      variantId: data.variantId,
      customerId: data.customerId ?? null,
      actionTaken: data.actionTaken ?? null,
    });

    return event;
  }

  /**
   * Update an existing scan with the action the BA ended up taking
   * (add_to_cart, sample_logged, etc.). The Today screen / dashboards key
   * conversion off this field.
   */
  async setAction(id: string, actionTaken: string, user: SessionUser) {
    const [updated] = await this.db
      .update(scanEvents)
      .set({ actionTaken })
      .where(and(eq(scanEvents.id, id), eq(scanEvents.userId, user.id)))
      .returning();
    if (!updated) {
      throw new NotFoundException(
        "Scan event not found or not owned by current user",
      );
    }
    return updated;
  }

  /**
   * Today's scans for the BA, with a converted/total breakdown. Drives the
   * "12 escaneos hoy · 4 → carrito" strip on the Today screen.
   */
  async todayForUser(user: SessionUser) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const rows = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        converted: sql<number>`count(*) FILTER (WHERE ${scanEvents.actionTaken} IN ('add_to_cart','sample_logged','reserve'))::int`,
      })
      .from(scanEvents)
      .where(
        and(
          eq(scanEvents.userId, user.id),
          gte(scanEvents.scannedAt, startOfDay),
        ),
      );

    return {
      total: rows[0]?.total ?? 0,
      converted: rows[0]?.converted ?? 0,
    };
  }
}
