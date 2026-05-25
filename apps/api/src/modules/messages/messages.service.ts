import { Injectable, Inject, ForbiddenException, NotFoundException } from "@nestjs/common";
import { eq, and, or, isNull, inArray, desc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { messages, messageTemplates, consents } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { CustomerActivityService } from "../../common/services/customer-activity.service";
import { ConsentsService } from "../consents/consents.service";
import type { CreateMessageDto } from "../../dtos/messages.dto";

const CONSENT_TO_CHANNEL: Record<string, string> = {
  marketing_whatsapp: "whatsapp",
  marketing_sms: "sms",
  marketing_email: "email",
};

@Injectable()
export class MessagesService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(CustomerActivityService)
    private customerActivity: CustomerActivityService,
    @Inject(ConsentsService) private consentsService: ConsentsService,
  ) {}

  async findAll(user: SessionUser) {
    // BA/manager: only their own sent messages
    // Admin: all messages
    const conditions =
      user.role === "admin" ? [] : [eq(messages.sentByUserId, user.id)];
    return this.db
      .select()
      .from(messages)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(messages.sentAt))
      .limit(100);
  }

  async findByCustomer(customerId: string, user: SessionUser) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    return this.db
      .select()
      .from(messages)
      .where(eq(messages.customerId, customerId));
  }

  async create(data: CreateMessageDto, user: SessionUser) {
    const direction = data.direction ?? "outbound";
    const isOutbound = direction === "outbound";

    // Outbound messages must respect marketing consent. Inbound messages are
    // always logged (the customer reached out — they're already engaging).
    if (isOutbound) {
      const hasConsent = await this.consentsService.hasActiveConsent(
        data.customerId,
        data.channel,
      );
      if (!hasConsent) {
        throw new ForbiddenException(
          `Customer has not consented to ${data.channel} communications`,
        );
      }
    }

    const [msg] = await this.db
      .insert(messages)
      .values({
        customerId: data.customerId,
        sentByUserId: isOutbound ? user.id : null,
        direction,
        channel: data.channel,
        status: data.status ?? (isOutbound ? "sent" : "received"),
        fromAddress: data.fromAddress,
        toAddress: data.toAddress,
        providerMessageId: data.providerMessageId,
        templateId: data.templateId,
        subject: data.subject,
        body: data.body,
        campaignType: isOutbound ? data.campaignType : undefined,
      })
      .returning();

    // Both directions count as an interaction. Inbound replies are the
    // strongest signal we have that a customer is engaged.
    await this.customerActivity.touchInteraction(data.customerId);

    await this.auditService.log(
      user,
      isOutbound ? "message_sent" : "message_received",
      "message",
      msg.id,
      { channel: data.channel, customerId: data.customerId, direction },
    );

    return msg;
  }

  async findTemplates(
    user: SessionUser,
    options?: { customerId?: string },
  ) {
    // Step 1: brand scope. Admin gets every active template; everyone else
    // gets brand-specific + global (null-brand) templates.
    const baseConditions: any[] = [eq(messageTemplates.isActive, true)];
    if (user.role !== "admin") {
      const brandId = this.scopeService.assertBrand(user);
      baseConditions.push(
        or(eq(messageTemplates.brandId, brandId), isNull(messageTemplates.brandId)),
      );
    }

    // Step 2: optional consent filter. When a customerId is provided, only
    // return templates whose channel matches an active marketing consent —
    // spec §5.8 / §11.10: don't surface options the BA can't actually use.
    if (options?.customerId) {
      await this.scopeService.assertCustomerAccess(options.customerId, user);

      const activeConsents = await this.db
        .select({ type: consents.type })
        .from(consents)
        .where(
          and(
            eq(consents.customerId, options.customerId),
            isNull(consents.revokedAt),
          ),
        );

      const allowedChannels = activeConsents
        .map((c) => CONSENT_TO_CHANNEL[c.type])
        .filter((ch): ch is string => Boolean(ch));

      if (allowedChannels.length === 0) return [];
      baseConditions.push(inArray(messageTemplates.channel, allowedChannels));
    }

    return this.db
      .select()
      .from(messageTemplates)
      .where(and(...baseConditions));
  }

  async createTemplate(data: {
    brandId?: string;
    name: string;
    channel: string;
    body: string;
    campaignType: string;
  }) {
    const [template] = await this.db
      .insert(messageTemplates)
      .values(data)
      .returning();
    return template;
  }

  async updateTemplate(
    id: string,
    data: Partial<{
      name: string;
      channel: string;
      body: string;
      campaignType: string;
      isActive: boolean;
    }>,
  ) {
    const [template] = await this.db
      .update(messageTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  async updateTracking(
    id: string,
    data: { deliveredAt?: Date; readAt?: Date; respondedAt?: Date },
  ) {
    const [updated] = await this.db
      .update(messages)
      .set(data)
      .where(eq(messages.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Message not found");
    return updated;
  }
}
