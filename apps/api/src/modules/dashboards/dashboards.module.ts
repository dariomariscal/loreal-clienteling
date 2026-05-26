import { Module } from "@nestjs/common";
import { DashboardsController } from "./dashboards.controller";
import { DashboardsService } from "./dashboards.service";
import { SalesTargetsModule } from "../sales-targets/sales-targets.module";
import { ShiftsModule } from "../shifts/shifts.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { BaRatingsModule } from "../ba-ratings/ba-ratings.module";

@Module({
  imports: [SalesTargetsModule, ShiftsModule, AnalyticsModule, BaRatingsModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
  exports: [DashboardsService],
})
export class DashboardsModule {}
