import { Module } from "@nestjs/common";
import { BaRatingsController } from "./ba-ratings.controller";
import { BaRatingsService } from "./ba-ratings.service";

@Module({
  controllers: [BaRatingsController],
  providers: [BaRatingsService],
  exports: [BaRatingsService],
})
export class BaRatingsModule {}
