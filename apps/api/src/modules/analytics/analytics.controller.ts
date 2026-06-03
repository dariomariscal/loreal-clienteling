import { Controller, Get, Query, Param, Inject, Res, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { Workbook } from "exceljs";
import { AnalyticsService } from "./analytics.service";
import type { ReportFiltersInput } from "./shared/report-filters";
import type { UserSession } from "../../common/types/session";
import type { Response } from "express";

/**
 * Query-string filters every analytics endpoint accepts. Each is optional; the
 * controller wraps them as `ReportFiltersInput` so services receive a single
 * canonical object instead of a long list of @Query() params.
 */
interface AnalyticsQuery {
  from?: string;
  to?: string;
  banner?: string;
  brandId?: string;
  storeId?: string;
  baUserId?: string;
  zoneId?: string;
}

// Drops empty / non-parseable values instead of producing an Invalid Date,
// which Drizzle's PgTimestamp.mapToDriverValue blows up on with "Invalid time
// value" the moment it tries to .toISOString() the bound parameter.
//
// When `endOfDay` is true and the input is a bare YYYY-MM-DD, we snap to
// 23:59:59.999Z so a `?from=2026-06-03&to=2026-06-03` range covers the full
// day instead of collapsing to a single instant at midnight (which yields
// zero rows).
function parseDateParam(raw?: string, endOfDay = false): Date | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const iso = isDateOnly
    ? `${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
    : trimmed;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  scheduledAt: "Fecha y hora",
  durationMinutes: "Duración (min)",
  eventTypeId: "ID tipo de evento",
  eventTypeName: "Nombre del evento",
  status: "Estado",
  comments: "Comentarios",
  isVirtual: "Virtual",
  customerName: "Cliente",
  customerPhone: "Teléfono",
  customerId: "ID Cliente",
  baName: "Beauty Advisor",
  baUserId: "ID BA",
  storeName: "Tienda",
  storeId: "ID Tienda",
  firstName: "Nombre",
  lastName: "Apellido",
  email: "Correo",
  phone: "Teléfono",
  gender: "Género",
  birthDate: "Fecha de nacimiento",
  lifecycleSegment: "Segmento",
  loyaltyTier: "Tier de lealtad",
  totalSpent: "Gasto total",
  ordersCount: "Pedidos",
  customerSince: "Cliente desde",
  lastContactAt: "Último contacto",
  lastTransactionAt: "Última transacción",
  lastVisitAt: "Última visita",
  lastBaUserId: "ID último BA",
  lastBaName: "Último BA",
  lastFollowUpType: "Último seguimiento",
  lastFollowUpCompletedAt: "Fecha último seguimiento",
  nextFollowUpType: "Tipo de seguimiento",
  nextFollowUpDueDate: "Fecha próximo seguimiento",
  openFollowUpCount: "Seguimientos abiertos",
  overdueFollowUpCount: "Seguimientos vencidos",
  banner: "Franquicia",
  totalAmount: "Monto total",
  purchasedAt: "Fecha de compra",
  source: "Fuente",
  attributedBaUserId: "BA atribuido",
};

@ApiTags("Analytics")
@ApiBearerAuth()
@Controller("analytics")
@Roles(["beauty_advisor", "counter_manager", "area_manager", "national_retail_manager", "admin"])
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private analyticsService: AnalyticsService) {}

  private parseDateRange(from?: string, to?: string) {
    return {
      from: parseDateParam(from),
      to: parseDateParam(to, true),
    };
  }

  /**
   * Canonical parser for analytics query params. Folds the date range and
   * entity filters (banner / brand / store / BA / zone) into a single
   * `ReportFiltersInput` that downstream services consume. Empty strings are
   * dropped so query keys stay stable across the cache.
   */
  private parseFilters(q: AnalyticsQuery): ReportFiltersInput {
    const range = this.parseDateRange(q.from, q.to);
    return {
      ...range,
      banner: q.banner || undefined,
      brandId: q.brandId || undefined,
      storeId: q.storeId || undefined,
      baUserId: q.baUserId || undefined,
      zoneId: q.zoneId || undefined,
    };
  }

  @Get("dashboard")
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getDashboard(@Query() q: AnalyticsQuery, @Session() session: UserSession) {
    return this.analyticsService.getDashboard(session.user, this.parseFilters(q));
  }

  @Get("appointments")
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getAppointmentMetrics(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.appointments.getStatusBreakdown(
      session.user,
      this.parseFilters(q),
    );
  }

  /**
   * Composite "appointment overview" — KPIs + outcome / cancel / no-show
   * breakdowns + weekly trend + (managers only) per-BA ranking. One call,
   * everything the metrics page needs. Role gating handled inside the service.
   */
  @Get("appointments/overview")
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getAppointmentOverview(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.appointments.getOverview(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("ba-performance")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getBaPerformance(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.performance.getBaSummary(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("sales-breakdown")
  @ApiQuery({ name: "groupBy", enum: ["category", "brand"], required: true })
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getSalesBreakdown(
    @Query("groupBy") groupBy: string,
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    if (groupBy !== "category" && groupBy !== "brand") {
      throw new BadRequestException("groupBy must be 'category' or 'brand'");
    }
    return this.analyticsService.sales.getBreakdown(
      session.user,
      groupBy,
      this.parseFilters(q),
    );
  }

  @Get("sales-trend")
  @ApiQuery({ name: "interval", enum: ["day", "week", "month"], required: false })
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getSalesTrend(
    @Query("interval") interval: string | undefined,
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    const validInterval = interval === "day" || interval === "week" ? interval : "month";
    return this.analyticsService.sales.getTrend(
      session.user,
      validInterval,
      this.parseFilters(q),
    );
  }

  @Get("conversion")
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "trending", type: Boolean, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getConversion(
    @Query("trending") trending: string | undefined,
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.recommendations.getConversionSummary(
      session.user,
      this.parseFilters(q),
      trending === "true",
    );
  }

  @Get("customers")
  getCustomerSegments(@Session() session: UserSession) {
    return this.analyticsService.customers.getSegmentBreakdown(session.user);
  }

  @Get("recommendations/conversion-by-source")
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getRecommendationConversionBySource(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.recommendations.getConversionBySource(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("customers/:customerId/ai-conversion")
  @ApiParam({ name: "customerId", type: String })
  getCustomerAiConversion(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.recommendations.getCustomerAiConversion(
      customerId,
      session.user,
    );
  }

  @Get("agenda-report")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "status", type: String, required: false })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getAgendaReport(
    @Query("status") status: string | undefined,
    @Query("page") page: string | undefined,
    @Query("limit") limit: string | undefined,
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.appointments.getAgendaReport(
      session.user,
      this.parseFilters(q),
      {
        status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      },
    );
  }

  @Get("appointments-by-ba")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getAppointmentsByBa(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.appointments.getByBa(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("retention")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  getRetention(@Session() session: UserSession) {
    return this.analyticsService.customers.getRetention(session.user);
  }

  @Get("zone-overview")
  @Roles(["area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getZoneOverview(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.zoneManagement.getOverview(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("stores-ranking")
  @Roles(["area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  @ApiQuery({ name: "retailGroupId", type: String, required: false })
  getStoresRanking(
    @Query("retailGroupId") retailGroupId: string | undefined,
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.zoneManagement.getStoresRanking(
      session.user,
      this.parseFilters(q),
      { retailGroupId },
    );
  }

  @Get("banners-ranking")
  @Roles(["area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getBannersRanking(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.zoneManagement.getBannersRanking(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("appointment-targets")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  @ApiQuery({
    name: "metricKind",
    enum: ["appointments_booked", "appointments_completed"],
    required: false,
  })
  getAppointmentTargets(
    @Query("metricKind") metricKind: string | undefined,
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    const kind =
      metricKind === "appointments_completed"
        ? "appointments_completed"
        : "appointments_booked";
    return this.analyticsService.salesTargets.getAppointmentTargetsVsActual(
      session.user,
      this.parseFilters(q),
      kind,
    );
  }

  @Get("follow-ups")
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getFollowUpKPIs(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.performance.getFollowUpKPIs(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("counter-managers-ranking")
  @Roles(["area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getCounterManagersRanking(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.zoneManagement.getCounterManagersRanking(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("zones-ranking")
  @Roles(["national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  getZonesRanking(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.zoneManagement.getZonesRanking(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("sales-targets")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getSalesTargets(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.salesTargets.getTargetsVsActual(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("ba-ratings")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getBaRatings(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.ratings.getNpsByBa(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("ai-usage")
  @Roles(["admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  getAiUsage(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.aiUsage.getOverview(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("zone-heatmap")
  @Roles(["area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getZoneHeatmap(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.heatmap.getZoneHeatmap(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("pipeline")
  getPipeline(@Session() session: UserSession) {
    return this.analyticsService.pipeline.getPipeline(session.user);
  }

  @Get("vip-breakdown")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  getVipBreakdown(@Session() session: UserSession) {
    return this.analyticsService.vip.getVipBreakdown(session.user);
  }

  @Get("vip-customers")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "limit", type: Number, required: false })
  getVipCustomers(
    @Query("limit") limit: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.vip.getTopVipCustomers(
      session.user,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get("stores/:storeId/brands-comparison")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  getStoreBrandsComparison(
    @Param("storeId") storeId: string,
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.zoneManagement.getStoreBrandsComparison(
      session.user,
      storeId,
      this.parseFilters(q),
    );
  }

  /**
   * Faceted filter options for the report bars. Returns only entities that
   * have at least one activity record under the current filters — the
   * dropdowns hide options that would yield zero rows. Faceting: each slot
   * is computed by applying every OTHER active filter except its own value.
   */
  @Get("filter-options")
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  getFilterOptions(
    @Query() q: AnalyticsQuery,
    @Session() session: UserSession,
  ) {
    return this.analyticsService.filterOptions.getOptions(
      session.user,
      this.parseFilters(q),
    );
  }

  @Get("export")
  @ApiQuery({ name: "type", enum: ["customers", "sales", "appointments", "agenda-report"], required: true })
  @ApiQuery({ name: "format", enum: ["json", "csv", "xlsx"], required: false })
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "banner", type: String, required: false })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  async exportData(
    @Query("type") type: string,
    @Query("format") format: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("banner") banner: string | undefined,
    @Query("baUserId") baUserId: string | undefined,
    @Session() session: UserSession,
    @Res({ passthrough: true }) res: Response,
  ) {
    let data: Record<string, any>[];

    if (type === "agenda-report") {
      const report = await this.analyticsService.appointments.getAgendaReport(
        session.user,
        this.parseDateRange(from, to),
        { limit: 10000, staffUserId: baUserId },
      );
      data = report.data;
    } else {
      data = (await this.analyticsService.exportData(
        type,
        session.user,
        this.parseDateRange(from, to),
        { banner, baUserId },
      )) as Record<string, any>[];
    }

    if (format === "xlsx") {
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet("Datos");

      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const headerLabels = headers.map((h) => COLUMN_LABELS[h] ?? h);
        sheet.addRow(headerLabels);
        // Style header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

        for (const row of data) {
          sheet.addRow(headers.map((h) => row[h] ?? ""));
        }

        // Auto-width columns
        for (let i = 0; i < headers.length; i++) {
          const col = sheet.getColumn(i + 1);
          col.width = Math.max(headerLabels[i].length + 4, 14);
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      res.set({
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${type}-export.xlsx"`,
      });
      res.send(Buffer.from(buffer as ArrayBuffer));
      return;
    }

    if (format === "csv") {
      if (data.length === 0) {
        res.set({
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${type}-export.csv"`,
        });
        return "";
      }

      const headers = Object.keys(data[0]);
      const headerLabels = headers.map((h) => COLUMN_LABELS[h] ?? h);
      const csvLines = [
        headerLabels.join(","),
        ...data.map((row) =>
          headers
            .map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return "";
              const str = String(val);
              return str.includes(",") || str.includes('"') || str.includes("\n")
                ? `"${str.replace(/"/g, '""')}"`
                : str;
            })
            .join(","),
        ),
      ];

      res.set({
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}-export.csv"`,
      });
      return csvLines.join("\n");
    }

    // Default: JSON
    return data;
  }
}
