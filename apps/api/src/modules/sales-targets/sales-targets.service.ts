import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { salesTargets, orders } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type {
  CreateSalesTargetDto,
  UpdateSalesTargetDto,
  SalesTargetFiltersDto,
} from "../../dtos/sales-targets.dto";

@Injectable()
export class SalesTargetsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  async findAll(user: SessionUser, filters: SalesTargetFiltersDto) {
    const scope = await this.scopeService.scopeByStore(
      user,
      salesTargets.storeId,
    );

    const conditions = [
      ...(scope ? [scope] : []),
      ...(filters.ownerType ? [eq(salesTargets.ownerType, filters.ownerType)] : []),
      ...(filters.storeId ? [eq(salesTargets.storeId, filters.storeId)] : []),
      ...(filters.brandId ? [eq(salesTargets.brandId, filters.brandId)] : []),
      ...(filters.ownerUserId
        ? [eq(salesTargets.ownerUserId, filters.ownerUserId)]
        : []),
      ...(filters.metricKind
        ? [eq(salesTargets.metricKind, filters.metricKind)]
        : []),
      ...(filters.periodKind
        ? [eq(salesTargets.periodKind, filters.periodKind)]
        : []),
      ...(filters.from ? [gte(salesTargets.periodStart, filters.from)] : []),
      ...(filters.to ? [lte(salesTargets.periodEnd, filters.to)] : []),
    ];

    return this.db
      .select()
      .from(salesTargets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(salesTargets.periodStart);
  }

  async create(data: CreateSalesTargetDto, user: SessionUser) {
    const ownerType = data.ownerType ?? "counter";
    this.assertCanManageTargets(user, ownerType, data.storeId, data.brandId);

    if (ownerType === "counter" && (!data.storeId || !data.brandId)) {
      throw new BadRequestException(
        "Counter-level targets require storeId and brandId",
      );
    }
    if (ownerType === "user" && !data.ownerUserId) {
      throw new BadRequestException(
        "User-level targets require ownerUserId",
      );
    }

    const [target] = await this.db
      .insert(salesTargets)
      .values({
        ownerType,
        storeId: data.storeId,
        brandId: data.brandId,
        ownerUserId: data.ownerUserId,
        metricKind: data.metricKind ?? "sales_amount",
        periodKind: data.periodKind,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        targetValue: data.targetValue.toString(),
        currency: data.currency ?? "MXN",
        parentTargetId: data.parentTargetId,
        notes: data.notes,
        createdByUserId: user.id,
      })
      .returning()
      .catch((err: unknown) => {
        if (err instanceof Error && err.message.includes("targets_owner_idx")) {
          throw new ConflictException(
            "A target for this owner / metric / period already exists",
          );
        }
        throw err;
      });

    await this.auditService.log(user, "create", "sales_target", target.id, {
      ownerType,
      storeId: data.storeId,
      brandId: data.brandId,
      ownerUserId: data.ownerUserId,
      metricKind: data.metricKind,
      periodKind: data.periodKind,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      targetValue: data.targetValue,
    });

    return target;
  }

  async update(id: string, data: UpdateSalesTargetDto, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(salesTargets)
      .where(eq(salesTargets.id, id));
    if (!existing) throw new NotFoundException("Sales target not found");

    this.assertCanManageTargets(
      user,
      existing.ownerType,
      existing.storeId,
      existing.brandId,
    );

    const [updated] = await this.db
      .update(salesTargets)
      .set({
        ...(data.targetValue !== undefined
          ? { targetValue: data.targetValue.toString() }
          : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(salesTargets.id, id))
      .returning();

    await this.auditService.log(
      user,
      "update",
      "sales_target",
      id,
      data as unknown as Record<string, unknown>,
    );

    return updated;
  }

  async remove(id: string, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(salesTargets)
      .where(eq(salesTargets.id, id));
    if (!existing) throw new NotFoundException("Sales target not found");

    this.assertCanManageTargets(
      user,
      existing.ownerType,
      existing.storeId,
      existing.brandId,
    );

    await this.db.delete(salesTargets).where(eq(salesTargets.id, id));
    await this.auditService.log(user, "delete", "sales_target", id);

    return { success: true };
  }

  /**
   * Returns target + actual sales for the user's current counter, for the given
   * date. Used by the counter manager dashboard hero card.
   */
  async getTodayProgress(
    user: SessionUser,
    opts: { date?: string; storeId?: string; brandId?: string } = {},
  ) {
    const storeId = opts.storeId ?? user.storeId;
    const brandId = opts.brandId ?? user.brandId;

    if (!storeId || !brandId) {
      throw new ForbiddenException(
        "Cannot resolve counter target without storeId and brandId",
      );
    }

    const date = opts.date ?? new Date().toISOString().split("T")[0];

    // Today's daily counter target (if set). Match by period range so the
    // caller doesn't have to know whether the configured target is daily or
    // a monthly one that covers today.
    const [target] = await this.db
      .select()
      .from(salesTargets)
      .where(
        and(
          eq(salesTargets.ownerType, "counter"),
          eq(salesTargets.metricKind, "sales_amount"),
          eq(salesTargets.storeId, storeId),
          eq(salesTargets.brandId, brandId),
          eq(salesTargets.periodKind, "daily"),
          lte(salesTargets.periodStart, date),
          gte(salesTargets.periodEnd, date),
        ),
      );

    // Sum of orders processed on that date at this store. We use orders.storeId
    // for the store filter; brand attribution lives elsewhere — for now we
    // assume each counter has one brand per store, so storeId is sufficient.
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const [actual] = await this.db
      .select({
        total: sql<string | null>`coalesce(sum(${orders.totalPrice}), 0)`,
        currency: orders.currency,
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          gte(orders.processedAt, dayStart),
          lte(orders.processedAt, dayEnd),
        ),
      )
      .groupBy(orders.currency);

    const targetValue = target ? Number(target.targetValue) : null;
    const actualAmount = Number(actual?.total ?? 0);
    const attainmentPct =
      targetValue && targetValue > 0
        ? Math.round((actualAmount / targetValue) * 100)
        : null;

    return {
      date,
      storeId,
      brandId,
      targetValue,
      actualAmount,
      attainmentPct,
      currency: target?.currency ?? actual?.currency ?? "MXN",
    };
  }

  /**
   * Counter Managers can set targets for their own counter. Higher roles
   * (area/national/admin) can set targets within their scope. BAs can read
   * but not write.
   */
  private assertCanManageTargets(
    user: SessionUser,
    ownerType: string,
    storeId: string | null | undefined,
    brandId: string | null | undefined,
  ): void {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.NATIONAL_RETAIL_MANAGER) return;
    if (user.role === UserRole.AREA_MANAGER) return;

    if (user.role === UserRole.COUNTER_MANAGER) {
      if (ownerType !== "counter" && ownerType !== "user") {
        throw new ForbiddenException(
          "Counter Manager can only set counter- or user-level targets",
        );
      }
      if (storeId && user.storeId !== storeId) {
        throw new ForbiddenException(
          "Counter Manager can only set targets for their own counter",
        );
      }
      if (brandId && user.brandId !== brandId) {
        throw new ForbiddenException(
          "Counter Manager can only set targets for their own counter",
        );
      }
      return;
    }

    throw new ForbiddenException("This role cannot manage sales targets");
  }
}
