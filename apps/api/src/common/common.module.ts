import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ScopeService } from "./services/scope.service";
import { AuditService } from "./services/audit.service";
import { PasswordCryptoService } from "./services/password-crypto.service";
import { AuditInterceptor } from "./interceptors/audit.interceptor";

@Global()
@Module({
  providers: [
    ScopeService,
    AuditService,
    PasswordCryptoService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [ScopeService, AuditService, PasswordCryptoService],
})
export class CommonModule {}
