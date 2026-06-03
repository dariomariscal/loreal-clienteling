import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ClerkModule } from "./integrations/clerk/clerk.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./config/database.module";
import { CommonModule } from "./common/common.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { ZonesModule } from "./modules/zones/zones.module";
import { GeoModule } from "./modules/geo/geo.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { DivisionsModule } from "./modules/divisions/divisions.module";
import { StoresModule } from "./modules/stores/stores.module";
import { ProductsModule } from "./modules/products/products.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { BeautyModule } from "./modules/beauty/beauty.module";
import { ConsentsModule } from "./modules/consents/consents.module";
import { PrivacyNoticesModule } from "./modules/privacy-notices/privacy-notices.module";
import { RecommendationsModule } from "./modules/recommendations/recommendations.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { SamplesModule } from "./modules/samples/samples.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AppointmentPreparedProductsModule } from "./modules/appointment-prepared-products/appointment-prepared-products.module";
import { CustomerVisitsModule } from "./modules/customer-visits/customer-visits.module";
import { ServiceTypesModule } from "./modules/service-types/service-types.module";
import { SkillsModule } from "./modules/skills/skills.module";
import { SchedulingPoliciesModule } from "./modules/scheduling-policies/scheduling-policies.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { NotesModule } from "./modules/notes/notes.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { AdvisorModule } from "./modules/advisor/advisor.module";
import { UsersModule } from "./modules/users/users.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { AiModule } from "./modules/ai/ai.module";
import { WishlistsModule } from "./modules/wishlists/wishlists.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { EventsModule } from "./modules/events/events.module";
import { SegmentsModule } from "./modules/segments/segments.module";
import { SalesTargetsModule } from "./modules/sales-targets/sales-targets.module";
import { ApprovalRequestsModule } from "./modules/approval-requests/approval-requests.module";
import { ShiftsModule } from "./modules/shifts/shifts.module";
import { BaRatingsModule } from "./modules/ba-ratings/ba-ratings.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { DashboardsModule } from "./modules/dashboards/dashboards.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ScansModule } from "./modules/scans/scans.module";
import { RetailGroupsModule } from "./modules/retail-groups/retail-groups.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: ".",
      maxListeners: 20,
      verboseMemoryLeak: false,
    }),
    DatabaseModule,
    ClerkModule,
    AuthModule,
    CommonModule,
    WebhooksModule,
    ZonesModule,
    GeoModule,
    BrandsModule,
    DivisionsModule,
    StoresModule,
    ProductsModule,
    CustomersModule,
    BeautyModule,
    ConsentsModule,
    PrivacyNoticesModule,
    RecommendationsModule,
    OrdersModule,
    SamplesModule,
    AppointmentsModule,
    AppointmentPreparedProductsModule,
    CustomerVisitsModule,
    ServiceTypesModule,
    SkillsModule,
    SchedulingPoliciesModule,
    MessagesModule,
    NotesModule,
    AuditModule,
    AnalyticsModule,
    SchedulerModule,
    AdvisorModule,
    UsersModule,
    UploadsModule,
    AiModule,
    WishlistsModule,
    TasksModule,
    EventsModule,
    SegmentsModule,
    SalesTargetsModule,
    ApprovalRequestsModule,
    ShiftsModule,
    BaRatingsModule,
    InventoryModule,
    DashboardsModule,
    NotificationsModule,
    ScansModule,
    RetailGroupsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
