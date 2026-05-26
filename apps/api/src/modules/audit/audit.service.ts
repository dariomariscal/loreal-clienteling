import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, gte, lte, desc, sql, count, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { auditLogs, users } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";

@Injectable()
export class AuditQueryService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async findAll(filters: {
    page: number;
    limit: number;
    action?: string;
    entityType?: string;
    actorUserId?: string;
    from?: Date;
    to?: Date;
  }) {
    const conditions: any[] = [];
    if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
    if (filters.actorUserId) conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
    if (filters.from) conditions.push(gte(auditLogs.timestamp, filters.from));
    if (filters.to) conditions.push(lte(auditLogs.timestamp, filters.to));

    return this.db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
  }

  async findOne(id: string) {
    const [log] = await this.db.select().from(auditLogs).where(eq(auditLogs.id, id));
    if (!log) throw new NotFoundException("Audit log not found");
    return log;
  }

  /**
   * Aggregated audit log view designed for Area Manager and National Retail
   * Manager dashboards. Returns counts grouped by action and by entityType,
   * the top actors, and recent activity — no full row dump (full rows stay
   * admin-only). When the caller is not admin, the underlying audit_logs are
   * filtered to only the user IDs that fall in the caller's scope (users
   * whose storeId is in the caller's accessible stores).
   */
  async summary(
    user: SessionUser,
    opts: { from?: Date; to?: Date; limit?: number } = {},
  ) {
    const to = opts.to ?? new Date();
    const from =
      opts.from ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
      })();
    const limit = Math.min(opts.limit ?? 20, 100);

    const conditions: any[] = [
      gte(auditLogs.timestamp, from),
      lte(auditLogs.timestamp, to),
    ];

    // Non-admin callers see only events produced by users within their scope.
    if (user.role !== UserRole.ADMIN) {
      const accessibleStoreIds =
        await this.scopeService.getAccessibleStoreIds(user);
      if (accessibleStoreIds.length === 0) {
        return {
          period: { from, to },
          totals: { events: 0 },
          byAction: [],
          byEntityType: [],
          topActors: [],
        };
      }

      const scopedUsers = await this.db
        .select({ id: users.id })
        .from(users)
        .where(
          sql`${users.storeId} IN (${sql.join(
            accessibleStoreIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
      const scopedUserIds = scopedUsers.map((u) => u.id);
      if (scopedUserIds.length === 0) {
        return {
          period: { from, to },
          totals: { events: 0 },
          byAction: [],
          byEntityType: [],
          topActors: [],
        };
      }
      conditions.push(inArray(auditLogs.actorUserId, scopedUserIds));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereClause);

    const byAction = await this.db
      .select({
        action: auditLogs.action,
        count: count(),
      })
      .from(auditLogs)
      .where(whereClause)
      .groupBy(auditLogs.action)
      .orderBy(desc(count()))
      .limit(limit);

    const byEntityType = await this.db
      .select({
        entityType: auditLogs.entityType,
        count: count(),
      })
      .from(auditLogs)
      .where(whereClause)
      .groupBy(auditLogs.entityType)
      .orderBy(desc(count()))
      .limit(limit);

    const topActors = await this.db
      .select({
        actorUserId: auditLogs.actorUserId,
        actorFullName: users.fullName,
        count: count(),
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(whereClause)
      .groupBy(auditLogs.actorUserId, users.fullName)
      .orderBy(desc(count()))
      .limit(limit);

    return {
      period: { from, to },
      totals: { events: totalRow?.count ?? 0 },
      byAction,
      byEntityType,
      topActors,
    };
  }
}
