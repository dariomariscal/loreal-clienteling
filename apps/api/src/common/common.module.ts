import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ScopeService } from "./services/scope.service";
import { AuditService } from "./services/audit.service";
import { CustomerActivityService } from "./services/customer-activity.service";
import { AuditInterceptor } from "./interceptors/audit.interceptor";

@Global()
@Module({
  providers: [
    ScopeService,
    AuditService,
    CustomerActivityService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [ScopeService, AuditService, CustomerActivityService],
})
export class CommonModule {}
