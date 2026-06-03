import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AppointmentsAnalyticsService } from "./appointments/appointments-analytics.service";
import { SalesAnalyticsService } from "./sales/sales-analytics.service";
import { CustomersAnalyticsService } from "./customers/customers-analytics.service";
import { RecommendationsAnalyticsService } from "./recommendations/recommendations-analytics.service";
import { PerformanceAnalyticsService } from "./performance/performance-analytics.service";
import { ZoneAnalyticsService } from "./zone-management/zone-analytics.service";
import { SalesTargetsAnalyticsService } from "./sales-targets/sales-targets-analytics.service";
import { RatingsAnalyticsService } from "./ratings/ratings-analytics.service";
import { AiUsageAnalyticsService } from "./ai-usage/ai-usage-analytics.service";

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AppointmentsAnalyticsService,
    SalesAnalyticsService,
    CustomersAnalyticsService,
    RecommendationsAnalyticsService,
    PerformanceAnalyticsService,
    ZoneAnalyticsService,
    SalesTargetsAnalyticsService,
    RatingsAnalyticsService,
    AiUsageAnalyticsService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
