import { Module } from "@nestjs/common";
import { PrivacyNoticesController } from "./privacy-notices.controller";
import { PrivacyNoticesService } from "./privacy-notices.service";

@Module({
  controllers: [PrivacyNoticesController],
  providers: [PrivacyNoticesService],
  exports: [PrivacyNoticesService],
})
export class PrivacyNoticesModule {}
