import { Module } from "@nestjs/common";
import { RetailGroupsController } from "./retail-groups.controller";
import { RetailGroupsService } from "./retail-groups.service";

@Module({
  controllers: [RetailGroupsController],
  providers: [RetailGroupsService],
  exports: [RetailGroupsService],
})
export class RetailGroupsModule {}
