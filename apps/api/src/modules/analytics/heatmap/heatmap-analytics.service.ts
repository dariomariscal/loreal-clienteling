import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { and, eq, gte, lte, sql, count, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customers,
  orders,
  stores,
  municipalities,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { getDefaultDateRange, type DateRange } from "../shared/analytics-date.util";

/**
 * Geographic distribution of customers and revenue across municipalities
 * (alcaldías / municipios) inside the manager's scope. Powers the "heatmap"
 * view of the area / national manager — answers "where are my customers and
 * where do I have gaps?" without a heavyweight GIS layer.
 *
 * customers don't carry a municipalityId directly, so we resolve geography
 * through their signupStore. One pin per municipality, weighted by
 * customerCount, plus an average lat/lng across stores in the municipality
 * so the UI has a coord to render without joining a separate request.
 */
@Injectable()
export class HeatmapAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getZoneHeatmap(user: SessionUser, range?: DateRange) {
    if (
      user.role !== UserRole.AREA_MANAGER &&
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Zone heatmap is restricted to area_manager, national_retail_manager and admin",
      );
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const { from, to } = getDefaultDateRange(range);

    if (!isAdmin && storeIds.length === 0) {
      return { period: { from, to }, data: [] };
    }

    const storeScope = isAdmin ? undefined : inArray(stores.id, storeIds);

    // Total customers per municipality (resolved via signupStore).
    const totalByMuni = await this.db
      .select({
        municipalityId: stores.municipalityId,
        total: count(),
      })
      .from(customers)
      .innerJoin(stores, eq(stores.id, customers.signupStoreId))
      .where(storeScope)
      .groupBy(stores.municipalityId);

    // New customers in period per municipality.
    const newByMuni = await this.db
      .select({
        municipalityId: stores.municipalityId,
        count: count(),
      })
      .from(customers)
      .innerJoin(stores, eq(stores.id, customers.signupStoreId))
      .where(
        and(
          gte(customers.enrolledAt, from),
          lte(customers.enrolledAt, to),
          ...(storeScope ? [storeScope] : []),
        ),
      )
      .groupBy(stores.municipalityId);

    // Revenue in period per municipality.
    const revByMuni = await this.db
      .select({
        municipalityId: stores.municipalityId,
        salesAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
        orderCount: count(),
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(
        and(
          gte(orders.processedAt, from),
          lte(orders.processedAt, to),
          ...(storeScope ? [storeScope] : []),
        ),
      )
      .groupBy(stores.municipalityId);

    // Average store coords per municipality — useful as a default map pin.
    const coordsByMuni = await this.db
      .select({
        municipalityId: stores.municipalityId,
        lat: sql<string>`avg(${stores.lat})`,
        lng: sql<string>`avg(${stores.lng})`,
        storeCount: count(),
      })
      .from(stores)
      .where(storeScope)
      .groupBy(stores.municipalityId);

    const muniIds = Array.from(
      new Set(
        [...totalByMuni, ...revByMuni, ...coordsByMuni]
          .map((r) => r.municipalityId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const muniRows = muniIds.length
      ? await this.db
          .select({
            id: municipalities.id,
            name: municipalities.name,
            stateName: municipalities.stateName,
          })
          .from(municipalities)
          .where(inArray(municipalities.id, muniIds))
      : [];
    const muniMap = new Map(muniRows.map((m) => [m.id, m]));

    const totalMap = new Map(totalByMuni.map((r) => [r.municipalityId, r.total]));
    const newMap = new Map(newByMuni.map((r) => [r.municipalityId, r.count]));
    const revMap = new Map(revByMuni.map((r) => [r.municipalityId, r]));
    const coordsMap = new Map(coordsByMuni.map((r) => [r.municipalityId, r]));

    const data = muniIds.map((id) => {
      const muni = muniMap.get(id);
      const rev = revMap.get(id);
      const coords = coordsMap.get(id);
      return {
        municipalityId: id,
        name: muni?.name ?? null,
        stateName: muni?.stateName ?? null,
        customerCount: totalMap.get(id) ?? 0,
        newCustomersInPeriod: newMap.get(id) ?? 0,
        salesAmount: Number(rev?.salesAmount ?? 0),
        orderCount: rev?.orderCount ?? 0,
        storeCount: coords?.storeCount ?? 0,
        lat: coords?.lat ? Number(coords.lat) : null,
        lng: coords?.lng ? Number(coords.lng) : null,
      };
    });

    data.sort((a, b) => b.customerCount - a.customerCount);

    return { period: { from, to }, data };
  }
}
