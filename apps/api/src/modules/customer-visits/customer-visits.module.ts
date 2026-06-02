import { Module } from "@nestjs/common";
import { CustomerVisitsController } from "./customer-visits.controller";
import { CustomerVisitsService } from "./customer-visits.service";

@Module({
  controllers: [CustomerVisitsController],
  providers: [CustomerVisitsService],
  exports: [CustomerVisitsService],
})
export class CustomerVisitsModule {}
