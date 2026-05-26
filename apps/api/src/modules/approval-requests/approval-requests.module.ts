import { Module } from "@nestjs/common";
import { ApprovalRequestsController } from "./approval-requests.controller";
import { ApprovalRequestsService } from "./approval-requests.service";

@Module({
  controllers: [ApprovalRequestsController],
  providers: [ApprovalRequestsService],
  exports: [ApprovalRequestsService],
})
export class ApprovalRequestsModule {}
