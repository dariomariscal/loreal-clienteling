import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { baRatings, users } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import {
  NotificationEvents,
  type BaRatingCreatedEvent,
} from "../notifications/notification-events";
import type {
  CreateBaRatingDto,
  BaNpsFiltersDto,
} from "../../dtos/ba-ratings.dto";

@Injectable()
export class BaRatingsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    private readonly eventBus: EventEmitter2,
  ) {}

  async create(data: CreateBaRatingDto, user: SessionUser) {
    const storeId = this.scopeService.assertStore(user);

    // Manager-attested + counter_kiosk: any logged-in counter user can submit.
    // post_visit / whatsapp_survey: same — they arrive via callbacks acting
    // as the customer; the service trusts the source field.
    const submittedByUserId =
      data.source === "manager_attested" || data.source === "counter_kiosk"
        ? user.id
        : null;

    const [rating] = await this.db
      .insert(baRatings)
      .values({
        reviewedUserId: data.reviewedUserId,
        customerId: data.customerId,
        storeId,
        appointmentId: data.appointmentId ?? null,
        score: data.score,
        comment: data.comment ?? null,
        source: data.source,
        submittedByUserId,
      })
      .returning();

    await this.auditService.log(user, "create", "ba_rating", rating.id, {
      reviewedUserId: data.reviewedUserId,
      score: data.score,
      source: data.source,
    });

    const payload: BaRatingCreatedEvent = {
      baRatingId: rating.id,
      reviewedUserId: data.reviewedUserId,
      customerId: data.customerId,
      score: data.score,
    };
    this.eventBus.emit(NotificationEvents.BA_RATING_CREATED, payload);

    return rating;
  }

  /**
   * NPS aggregate per BA in a store/range. The Counter Manager dashboard
   * shows this in the team ranking. NPS = % promoters − % detractors,
   * computed in SQL so it's a single round-trip even with many BAs.
   */
  async getNpsByBa(user: SessionUser, filters: BaNpsFiltersDto) {
    const storeId = filters.storeId ?? user.storeId;
    if (!storeId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "Cannot resolve NPS without a storeId",
      );
    }

    if (storeId && user.role !== UserRole.ADMIN) {
      const accessibleStoreIds = await this.scopeService.getAccessibleStoreIds(user);
      if (!accessibleStoreIds.includes(storeId)) {
        throw new ForbiddenException("You do not have access to this store");
      }
    }

    const fromDate = filters.from
      ? new Date(`${filters.from}T00:00:00.000Z`)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = filters.to
      ? new Date(`${filters.to}T23:59:59.999Z`)
      : new Date();

    const conditions = [
      gte(baRatings.createdAt, fromDate),
      lte(baRatings.createdAt, toDate),
      ...(storeId ? [eq(baRatings.storeId, storeId)] : []),
    ];

    const rows = await this.db
      .select({
        userId: baRatings.reviewedUserId,
        fullName: users.fullName,
        responseCount: sql<number>`count(*)::int`,
        promoters: sql<number>`count(*) filter (where ${baRatings.score} >= 9)::int`,
        passives: sql<number>`count(*) filter (where ${baRatings.score} between 7 and 8)::int`,
        detractors: sql<number>`count(*) filter (where ${baRatings.score} <= 6)::int`,
        averageScore: sql<string>`coalesce(avg(${baRatings.score}), 0)`,
      })
      .from(baRatings)
      .leftJoin(users, eq(baRatings.reviewedUserId, users.id))
      .where(and(...conditions))
      .groupBy(baRatings.reviewedUserId, users.fullName);

    return rows.map((row) => {
      const total = row.responseCount || 0;
      const nps =
        total > 0
          ? Math.round(((row.promoters - row.detractors) / total) * 100)
          : 0;
      return {
        userId: row.userId,
        fullName: row.fullName,
        responseCount: total,
        promoters: row.promoters,
        passives: row.passives,
        detractors: row.detractors,
        averageScore: Number(Number(row.averageScore).toFixed(2)),
        nps,
      };
    });
  }
}
