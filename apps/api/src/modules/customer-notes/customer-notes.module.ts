import { Module } from "@nestjs/common";
import { CustomerNotesController } from "./customer-notes.controller";
import { CustomerNotesService } from "./customer-notes.service";

@Module({
  controllers: [CustomerNotesController],
  providers: [CustomerNotesService],
  exports: [CustomerNotesService],
})
export class CustomerNotesModule {}
