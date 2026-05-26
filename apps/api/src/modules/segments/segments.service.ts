import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import {
  and,
  eq,
  or,
  isNull,
  desc,
  inArray,
  gte,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { customerSegments, customers } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type {
  CreateSegmentDto,
  UpdateSegmentDto,
  SegmentFilterDto,
  ListSegmentCustomersQueryDto,
} from "../../dtos/segments.dto";

@Injectable()
export class SegmentsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  async list(user: SessionUser) {
    // Admin sees every segment regardless of scope.
    if (user.role === UserRole.ADMIN) {
      return this.db
        .select()
        .from(customerSegments)
        .orderBy(desc(customerSegments.updatedAt));
    }

    const visibility: SQL[] = [eq(customerSegments.ownerUserId, user.id)];

    // Brand-shared segments (BA/Counter Manager/AM/NRM all see brand-level)
    if (user.brandId) {
      visibility.push(
        and(
          eq(customerSegments.brandId, user.brandId),
          isNull(customerSegments.ownerUserId),
        )!,
      );
    }

    // Division-shared segments (Area Manager and NRM can see their division's)
    if (
      (user.role === UserRole.AREA_MANAGER ||
        user.role === UserRole.NATIONAL_RETAIL_MANAGER) &&
      user.divisionId
    ) {
      visibility.push(
        and(
          eq(customerSegments.divisionId, user.divisionId),
          isNull(customerSegments.ownerUserId),
          isNull(customerSegments.brandId),
        )!,
      );
    }

    // Global / admin-defined segments
    visibility.push(
      and(
        isNull(customerSegments.ownerUserId),
        isNull(customerSegments.brandId),
        isNull(customerSegments.divisionId),
      )!,
    );

    return this.db
      .select()
      .from(customerSegments)
      .where(or(...visibility))
      .orderBy(desc(customerSegments.updatedAt));
  }

  async findOne(id: string, user: SessionUser) {
    const [segment] = await this.db
      .select()
      .from(customerSegments)
      .where(eq(customerSegments.id, id));
    if (!segment) throw new NotFoundException("Segment not found");

    this.assertReadable(segment, user);
    return segment;
  }

  async create(data: CreateSegmentDto, user: SessionUser) {
    // Resolve segment scope:
    //   "personal" (default) → owned by the caller (ownerUserId set)
    //   "brand"              → shared across the caller's brand
    //   "division"           → shared across the caller's division (NRM/admin only)
    //   "global"             → admin only
    const scope = data.scope ?? "personal";

    let ownerUserId: string | null = user.id;
    let brandId: string | null = null;
    let divisionId: string | null = null;

    if (scope === "brand") {
      if (user.role === UserRole.ADMIN && data.brandId) {
        brandId = data.brandId;
      } else {
        brandId = this.scopeService.assertBrand(user);
      }
      ownerUserId = null;
    } else if (scope === "division") {
      if (
        user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
        user.role !== UserRole.ADMIN
      ) {
        throw new ForbiddenException(
          "Only national_retail_manager or admin may create division-scoped segments",
        );
      }
      divisionId =
        user.role === UserRole.ADMIN && data.divisionId
          ? data.divisionId
          : this.scopeService.assertDivision(user);
      ownerUserId = null;
    } else if (scope === "global") {
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          "Only admin may create global segments",
        );
      }
      ownerUserId = null;
    }

    const [segment] = await this.db
      .insert(customerSegments)
      .values({
        ownerUserId,
        brandId,
        divisionId,
        name: data.name,
        description: data.description,
        filter: data.filter as Record<string, unknown>,
        isDynamic: data.isDynamic ?? true,
      })
      .returning();

    await this.auditService.log(user, "create", "customer_segment", segment.id, {
      name: data.name,
      scope,
    });

    return segment;
  }

  async update(id: string, data: UpdateSegmentDto, user: SessionUser) {
    const segment = await this.findOne(id, user);
    this.assertWritable(segment, user);

    const [updated] = await this.db
      .update(customerSegments)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.filter !== undefined && {
          filter: data.filter as Record<string, unknown>,
        }),
        updatedAt: new Date(),
      })
      .where(eq(customerSegments.id, id))
      .returning();

    await this.auditService.log(user, "update", "customer_segment", id, {});
    return updated;
  }

  async remove(id: string, user: SessionUser) {
    const segment = await this.findOne(id, user);
    this.assertWritable(segment, user);

    await this.db.delete(customerSegments).where(eq(customerSegments.id, id));
    await this.auditService.log(user, "delete", "customer_segment", id, {});
    return { id, deleted: true };
  }

  async listCustomers(
    id: string,
    query: ListSegmentCustomersQueryDto,
    user: SessionUser,
  ) {
    const segment = await this.findOne(id, user);
    return this.resolveCustomers(
      segment.filter as SegmentFilterDto,
      query.limit ?? 100,
      user,
    );
  }

  async previewCustomers(
    filter: SegmentFilterDto,
    limit: number,
    user: SessionUser,
  ) {
    return this.resolveCustomers(filter, limit, user);
  }

  async countCustomers(id: string, user: SessionUser) {
    const segment = await this.findOne(id, user);
    return this.resolveCount(segment.filter as SegmentFilterDto, user);
  }

  // ----- internals -----

  private assertReadable(
    segment: {
      ownerUserId: string | null;
      brandId: string | null;
      divisionId: string | null;
    },
    user: SessionUser,
  ) {
    if (user.role === UserRole.ADMIN) return;
    if (segment.ownerUserId === user.id) return;
    if (segment.ownerUserId === null) {
      // global
      if (
        segment.brandId === null &&
        segment.divisionId === null
      )
        return;
      // brand-shared
      if (segment.brandId && segment.brandId === user.brandId) return;
      // division-shared (visible to AM/NRM of that division)
      if (
        segment.divisionId &&
        segment.divisionId === user.divisionId &&
        (user.role === UserRole.AREA_MANAGER ||
          user.role === UserRole.NATIONAL_RETAIL_MANAGER)
      )
        return;
    }
    throw new ForbiddenException("Segment not visible");
  }

  private assertWritable(
    segment: {
      ownerUserId: string | null;
      brandId: string | null;
      divisionId: string | null;
    },
    user: SessionUser,
  ) {
    if (user.role === UserRole.ADMIN) return;
    if (segment.ownerUserId === user.id) return;
    // NRM may edit division-shared segments inside their own division
    if (
      user.role === UserRole.NATIONAL_RETAIL_MANAGER &&
      segment.ownerUserId === null &&
      segment.divisionId &&
      segment.divisionId === user.divisionId
    ) {
      return;
    }
    throw new ForbiddenException("Segment owned by someone else");
  }

  private async buildConditions(
    filter: SegmentFilterDto,
    user: SessionUser,
  ): Promise<SQL[]> {
    const conditions: SQL[] = [];

    const storeScope = await this.scopeService.scopeByStore(
      user,
      customers.signupStoreId,
    );
    if (storeScope) conditions.push(storeScope);

    if (filter.lifecycleStages?.length) {
      conditions.push(inArray(customers.lifecycleStage, filter.lifecycleStages));
    }
    if (filter.loyaltyTiers?.length) {
      conditions.push(inArray(customers.loyaltyTier, filter.loyaltyTiers));
    }
    if (filter.isActive !== undefined) {
      conditions.push(eq(customers.isActive, filter.isActive));
    }
    if (filter.assignedToMe) {
      conditions.push(eq(customers.assignedToUserId, user.id));
    }
    if (filter.ordersCountMin !== undefined) {
      conditions.push(gte(customers.ordersCount, filter.ordersCountMin));
    }
    if (filter.totalSpentMin !== undefined) {
      conditions.push(
        sql`${customers.totalSpent} >= ${filter.totalSpentMin.toString()}`,
      );
    }
    if (filter.daysSinceLastOrderMin !== undefined) {
      conditions.push(
        sql`${customers.lastOrderAt} <= now() - (${filter.daysSinceLastOrderMin} || ' days')::interval`,
      );
    }
    if (filter.daysSinceLastOrderMax !== undefined) {
      conditions.push(
        sql`${customers.lastOrderAt} >= now() - (${filter.daysSinceLastOrderMax} || ' days')::interval`,
      );
    }
    if (filter.birthdayThisMonth) {
      conditions.push(
        sql`extract(month from ${customers.birthday}) = extract(month from now())`,
      );
    }

    return conditions;
  }

  private async resolveCustomers(
    filter: SegmentFilterDto,
    limit: number,
    user: SessionUser,
  ) {
    const conditions = await this.buildConditions(filter, user);

    return this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        avatarUrl: customers.avatarUrl,
        loyaltyTier: customers.loyaltyTier,
        lifecycleStage: customers.lifecycleStage,
        totalSpent: customers.totalSpent,
        ordersCount: customers.ordersCount,
        lastOrderAt: customers.lastOrderAt,
        birthday: customers.birthday,
      })
      .from(customers)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(customers.totalSpent))
      .limit(limit);
  }

  private async resolveCount(filter: SegmentFilterDto, user: SessionUser) {
    const conditions = await this.buildConditions(filter, user);
    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(conditions.length ? and(...conditions) : undefined);
    return { count: Number(row?.count ?? 0) };
  }
}
