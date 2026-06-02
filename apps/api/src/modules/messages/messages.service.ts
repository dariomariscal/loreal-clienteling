import { Injectable, Inject, ForbiddenException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { eq, and, or, isNull, inArray, desc, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { messages, messageTemplates, consents, customers } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { CustomerActivityService } from "../../common/services/customer-activity.service";
import { ConsentsService } from "../consents/consents.service";
import {
  NotificationEvents,
  type MessageReceivedEvent,
  type MessageReadEvent,
} from "../notifications/notification-events";
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
    private readonly eventBus: EventEmitter2,
  ) {}

  async findAll(user: SessionUser) {
    // Scope rules:
    //   admin                                → every message
    //   area_manager / national_retail_mgr   → every message attached to a
    //                                          customer in their accessible stores
    //   counter_manager                      → every message in their store
    //   beauty_advisor                       → only the messages they themselves sent
    const conditions: any[] = [];
    if (user.role === UserRole.ADMIN) {
      // no filter
    } else if (
      user.role === UserRole.AREA_MANAGER ||
      user.role === UserRole.NATIONAL_RETAIL_MANAGER ||
      user.role === UserRole.COUNTER_MANAGER
    ) {
      const storeScope = await this.scopeService.scopeByStore(
        user,
        customers.signupStoreId,
      );
      if (storeScope) conditions.push(storeScope);
    } else {
      conditions.push(eq(messages.sentByUserId, user.id));
    }

    // Join customers so the inbox can render the real client name/avatar
    // instead of falling back to the raw phone/email address. Use explicit
    // selection to keep the wire payload aligned with the Message contract
    // (no leaking extra columns from the customers table).
    const rows = await this.db
      .select({
        id: messages.id,
        customerId: messages.customerId,
        sentByUserId: messages.sentByUserId,
        direction: messages.direction,
        channel: messages.channel,
        status: messages.status,
        fromAddress: messages.fromAddress,
        toAddress: messages.toAddress,
        providerMessageId: messages.providerMessageId,
        templateId: messages.templateId,
        subject: messages.subject,
        body: messages.body,
        campaignType: messages.campaignType,
        failureReason: messages.failureReason,
        sentAt: messages.sentAt,
        deliveredAt: messages.deliveredAt,
        readAt: messages.readAt,
        respondedAt: messages.respondedAt,
        createdAt: messages.createdAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerAvatarUrl: customers.avatarUrl,
      })
      .from(messages)
      .leftJoin(customers, eq(messages.customerId, customers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(messages.sentAt))
      .limit(100);

    return rows;
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

    // Fire the reactive event for the notification listener. Done after
    // audit so a listener failure can never corrupt the audit chain.
    if (!isOutbound) {
      const [customer] = await this.db
        .select({ assignedToUserId: customers.assignedToUserId })
        .from(customers)
        .where(eq(customers.id, data.customerId));
      const payload: MessageReceivedEvent = {
        messageId: msg.id,
        customerId: data.customerId,
        assignedToUserId: customer?.assignedToUserId ?? null,
        channel: data.channel,
        preview: data.body,
      };
      this.eventBus.emit(NotificationEvents.MESSAGE_RECEIVED, payload);
    }

    return msg;
  }

  async findTemplates(
    user: SessionUser,
    options?: { customerId?: string },
  ) {
    // Step 1: brand scope.
    //   admin                                → every active template
    //   area_manager / national_retail_mgr   → every brand of their division + globals
    //   counter_manager / beauty_advisor     → their single brand + globals
    const baseConditions: any[] = [eq(messageTemplates.isActive, true)];
    if (user.role !== UserRole.ADMIN) {
      if (
        user.role === UserRole.AREA_MANAGER ||
        user.role === UserRole.NATIONAL_RETAIL_MANAGER
      ) {
        const brandIds = await this.scopeService.getAccessibleBrandIds(user);
        if (brandIds.length === 0) {
          baseConditions.push(isNull(messageTemplates.brandId));
        } else {
          baseConditions.push(
            or(
              inArray(messageTemplates.brandId, brandIds),
              isNull(messageTemplates.brandId),
            ),
          );
        }
      } else {
        const brandId = this.scopeService.assertBrand(user);
        baseConditions.push(
          or(
            eq(messageTemplates.brandId, brandId),
            isNull(messageTemplates.brandId),
          ),
        );
      }
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

  async createTemplate(
    data: {
      brandId?: string;
      name: string;
      channel: string;
      body: string;
      campaignType: string;
    },
    user: SessionUser,
  ) {
    if (data.brandId) {
      await this.assertBrandWritable(data.brandId, user);
    } else if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "Only admin may create global (brand-less) templates",
      );
    }

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
    user: SessionUser,
  ) {
    const [existing] = await this.db
      .select({ brandId: messageTemplates.brandId })
      .from(messageTemplates)
      .where(eq(messageTemplates.id, id));
    if (!existing) throw new NotFoundException("Template not found");

    if (existing.brandId) {
      await this.assertBrandWritable(existing.brandId, user);
    } else if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "Only admin may edit global (brand-less) templates",
      );
    }

    const [template] = await this.db
      .update(messageTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  /**
   * Helper to enforce that `brandId` is editable by `user` — admin can edit
   * any brand's templates; NRM is limited to brands within their division.
   */
  private async assertBrandWritable(brandId: string, user: SessionUser) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role !== UserRole.NATIONAL_RETAIL_MANAGER) {
      throw new ForbiddenException(
        "Only admin or NRM may create/edit brand templates",
      );
    }
    const accessible = await this.scopeService.getAccessibleBrandIds(user);
    if (!accessible.includes(brandId)) {
      throw new ForbiddenException("Brand is outside your division");
    }
  }

  async updateTracking(
    id: string,
    data: { deliveredAt?: Date; readAt?: Date; respondedAt?: Date },
  ) {
    const [existing] = await this.db
      .select({
        id: messages.id,
        sentByUserId: messages.sentByUserId,
        customerId: messages.customerId,
        readAt: messages.readAt,
        direction: messages.direction,
      })
      .from(messages)
      .where(eq(messages.id, id));
    if (!existing) throw new NotFoundException("Message not found");

    const [updated] = await this.db
      .update(messages)
      .set(data)
      .where(eq(messages.id, id))
      .returning();

    // Fire MESSAGE_READ only on the first read-receipt transition, only for
    // outbound messages, and only when we know which BA sent it.
    const justRead =
      data.readAt &&
      !existing.readAt &&
      existing.direction === "outbound" &&
      existing.sentByUserId;
    if (justRead) {
      const payload: MessageReadEvent = {
        messageId: existing.id,
        sentByUserId: existing.sentByUserId!,
        customerId: existing.customerId,
      };
      this.eventBus.emit(NotificationEvents.MESSAGE_READ, payload);
    }

    return updated;
  }
}
