import { Module } from "@nestjs/common";
import { SchedulingPoliciesController } from "./scheduling-policies.controller";
import { SchedulingPoliciesService } from "./scheduling-policies.service";

@Module({
  controllers: [SchedulingPoliciesController],
  providers: [SchedulingPoliciesService],
  exports: [SchedulingPoliciesService],
})
export class SchedulingPoliciesModule {}
