import { Module } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { PrivacyNoticesModule } from "../privacy-notices/privacy-notices.module";

@Module({
  imports: [PrivacyNoticesModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
