import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { RecommendationsModule } from "../recommendations/recommendations.module";
import { SamplesModule } from "../samples/samples.module";

@Module({
  imports: [RecommendationsModule, SamplesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
