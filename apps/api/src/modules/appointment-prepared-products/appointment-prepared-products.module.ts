import { Module } from "@nestjs/common";
import { AppointmentPreparedProductsController } from "./appointment-prepared-products.controller";
import { AppointmentPreparedProductsService } from "./appointment-prepared-products.service";

@Module({
  controllers: [AppointmentPreparedProductsController],
  providers: [AppointmentPreparedProductsService],
  exports: [AppointmentPreparedProductsService],
})
export class AppointmentPreparedProductsModule {}
