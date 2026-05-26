import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { eq, and, gte, lte, sql, sum } from "drizzle-orm";
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
      ...(filters.storeId ? [eq(salesTargets.storeId, filters.storeId)] : []),
      ...(filters.brandId ? [eq(salesTargets.brandId, filters.brandId)] : []),
      ...(filters.period ? [eq(salesTargets.period, filters.period)] : []),
      ...(filters.from ? [gte(salesTargets.periodDate, filters.from)] : []),
      ...(filters.to ? [lte(salesTargets.periodDate, filters.to)] : []),
    ];

    return this.db
      .select()
      .from(salesTargets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(salesTargets.periodDate);
  }

  async create(data: CreateSalesTargetDto, user: SessionUser) {
    this.assertCanManageTargets(user, data.storeId, data.brandId);

    const [target] = await this.db
      .insert(salesTargets)
      .values({
        storeId: data.storeId,
        brandId: data.brandId,
        period: data.period,
        periodDate: data.periodDate,
        targetAmount: data.targetAmount.toString(),
        currency: data.currency ?? "MXN",
        notes: data.notes,
        createdByUserId: user.id,
      })
      .returning()
      .catch((err: unknown) => {
        if (err instanceof Error && err.message.includes("sales_targets_counter_period_idx")) {
          throw new ConflictException(
            "A target for this counter and period already exists",
          );
        }
        throw err;
      });

    await this.auditService.log(user, "create", "sales_target", target.id, {
      storeId: data.storeId,
      brandId: data.brandId,
      period: data.period,
      periodDate: data.periodDate,
      targetAmount: data.targetAmount,
    });

    return target;
  }

  async update(id: string, data: UpdateSalesTargetDto, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(salesTargets)
      .where(eq(salesTargets.id, id));
    if (!existing) throw new NotFoundException("Sales target not found");

    this.assertCanManageTargets(user, existing.storeId, existing.brandId);

    const [updated] = await this.db
      .update(salesTargets)
      .set({
        ...(data.targetAmount !== undefined
          ? { targetAmount: data.targetAmount.toString() }
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

    this.assertCanManageTargets(user, existing.storeId, existing.brandId);

    await this.db.delete(salesTargets).where(eq(salesTargets.id, id));
    await this.auditService.log(user, "delete", "sales_target", id);

    return { success: true };
  }

  /**
   * Returns target + actual sales for the user's current counter, for the given
   * date. Used by the counter manager dashboard hero card. The "actual" sums
   * orders attributed to the counter (storeId match + brand inferred from the
   * caller's brandId).
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

    // Today's daily target (if set)
    const [target] = await this.db
      .select()
      .from(salesTargets)
      .where(
        and(
          eq(salesTargets.storeId, storeId),
          eq(salesTargets.brandId, brandId),
          eq(salesTargets.period, "daily"),
          eq(salesTargets.periodDate, date),
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

    const targetAmount = target ? Number(target.targetAmount) : null;
    const actualAmount = Number(actual?.total ?? 0);
    const attainmentPct =
      targetAmount && targetAmount > 0
        ? Math.round((actualAmount / targetAmount) * 100)
        : null;

    return {
      date,
      storeId,
      brandId,
      targetAmount,
      actualAmount,
      attainmentPct,
      currency: target?.currency ?? actual?.currency ?? "MXN",
    };
  }

  /**
   * Counter Managers can set targets for their own counter (storeId + brandId).
   * Higher roles can set targets within their scope (admin = anything).
   */
  private assertCanManageTargets(
    user: SessionUser,
    storeId: string,
    brandId: string,
  ): void {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.NATIONAL_RETAIL_MANAGER) return;
    if (user.role === UserRole.AREA_MANAGER) return;

    if (user.role === UserRole.COUNTER_MANAGER) {
      if (user.storeId !== storeId || user.brandId !== brandId) {
        throw new ForbiddenException(
          "Counter Manager can only set targets for their own counter",
        );
      }
      return;
    }

    throw new ForbiddenException("This role cannot manage sales targets");
  }
}
