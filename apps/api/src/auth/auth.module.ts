import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ClerkModule } from "../integrations/clerk/clerk.module";
import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";

@Module({
  imports: [ClerkModule],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
