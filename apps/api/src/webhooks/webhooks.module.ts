import { Module } from "@nestjs/common";
import { ClerkWebhooksController } from "./clerk/clerk-webhooks.controller";
import { ClerkWebhooksService } from "./clerk/clerk-webhooks.service";

@Module({
  controllers: [ClerkWebhooksController],
  providers: [ClerkWebhooksService],
})
export class WebhooksModule {}
