import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClerkModule } from "./integrations/clerk/clerk.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./config/database.module";
import { CommonModule } from "./common/common.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { ZonesModule } from "./modules/zones/zones.module";
import { GeoModule } from "./modules/geo/geo.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { StoresModule } from "./modules/stores/stores.module";
import { ProductsModule } from "./modules/products/products.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { BeautyModule } from "./modules/beauty/beauty.module";
import { ConsentsModule } from "./modules/consents/consents.module";
import { PrivacyNoticesModule } from "./modules/privacy-notices/privacy-notices.module";
import { RecommendationsModule } from "./modules/recommendations/recommendations.module";
import { PurchasesModule } from "./modules/purchases/purchases.module";
import { SamplesModule } from "./modules/samples/samples.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AppointmentEventTypesModule } from "./modules/appointment-event-types/appointment-event-types.module";
import { CommunicationsModule } from "./modules/communications/communications.module";
import { CustomerNotesModule } from "./modules/customer-notes/customer-notes.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { UsersModule } from "./modules/users/users.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    DatabaseModule,
    ClerkModule,
    AuthModule,
    CommonModule,
    WebhooksModule,
    ZonesModule,
    GeoModule,
    BrandsModule,
    StoresModule,
    ProductsModule,
    CustomersModule,
    BeautyModule,
    ConsentsModule,
    PrivacyNoticesModule,
    RecommendationsModule,
    PurchasesModule,
    SamplesModule,
    AppointmentsModule,
    AppointmentEventTypesModule,
    CommunicationsModule,
    CustomerNotesModule,
    AuditModule,
    AnalyticsModule,
    SchedulerModule,
    UsersModule,
    UploadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
