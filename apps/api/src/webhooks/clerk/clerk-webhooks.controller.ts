import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Request } from "express";
import { Webhook } from "svix";
import { Public } from "../../auth/decorators/public.decorator";
import {
  ClerkWebhooksService,
  type ClerkWebhookEvent,
} from "./clerk-webhooks.service";

@ApiExcludeController()
@Controller("webhooks/clerk")
export class ClerkWebhooksController {
  constructor(private readonly service: ClerkWebhooksService) {}

  @Post()
  @Public()
  @HttpCode(204)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("svix-id") svixId: string,
    @Headers("svix-timestamp") svixTimestamp: string,
    @Headers("svix-signature") svixSignature: string,
  ): Promise<void> {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      throw new BadRequestException("CLERK_WEBHOOK_SECRET is not configured");
    }
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException("Missing Svix headers");
    }
    if (!req.rawBody) {
      throw new BadRequestException("Raw body unavailable");
    }

    const wh = new Webhook(secret);
    let event: ClerkWebhookEvent;
    try {
      event = wh.verify(req.rawBody.toString("utf8"), {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch {
      throw new BadRequestException("Invalid Svix signature");
    }

    await this.service.handle(event);
  }
}
