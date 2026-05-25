import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { orders, lineItems, customers, samples } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { RecommendationsService } from "../recommendations/recommendations.service";
import { SamplesService } from "../samples/samples.service";
import {
  attributePurchaseToBa,
  type RecommendationRecord,
} from "@loreal/domain";
import type { CreateOrderDto } from "../../dtos/orders.dto";

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(RecommendationsService) private recommendationsService: RecommendationsService,
    @Inject(SamplesService) private samplesService: SamplesService,
  ) {}

  async findByCustomer(customerId: string, user: SessionUser) {
    const storeScope = await this.scopeService.scopeByStore(
      user,
      orders.storeId,
    );

    const conditions = [
      eq(orders.customerId, customerId),
      ...(storeScope ? [storeScope] : []),
    ];

    const rows = await this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(orders.processedAt);

    if (rows.length === 0) return [];

    // Fetch all line items for these orders in a single query
    const orderIds = rows.map((o) => o.id);
    const allItems = await this.db
      .select()
      .from(lineItems)
      .where(inArray(lineItems.orderId, orderIds));

    // Group items by orderId
    const itemsByOrder = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const existing = itemsByOrder.get(item.orderId) ?? [];
      existing.push(item);
      itemsByOrder.set(item.orderId, existing);
    }

    return rows.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) ?? [],
    }));
  }

  async findOne(id: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id));

    if (!order) throw new NotFoundException("Order not found");

    const items = await this.db
      .select()
      .from(lineItems)
      .where(eq(lineItems.orderId, id));

    return { ...order, items };
  }

  async create(data: CreateOrderDto, user: SessionUser) {
    const storeId = this.scopeService.assertStore(user);

    // a. Fetch customer
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, data.customerId));

    if (!customer) throw new NotFoundException("Customer not found");

    // b. Fetch active recommendations (last 30 days)
    const activeRecs = await this.recommendationsService.findActiveForCustomer(
      data.customerId,
      30,
    );

    const activeRecommendations: RecommendationRecord[] = activeRecs.map(
      (r) => ({
        recommendedByUserId: r.recommendedByUserId,
        productId: r.productId,
        recommendedAt: r.recommendedAt,
        recommendationId: r.id,
      }),
    );

    // c. Call attribution logic
    const orderedProductIds = data.items.map((item) => item.productId);
    const now = new Date();
    const attribution = attributePurchaseToBa({
      customerId: data.customerId,
      orderedProductIds,
      processedAt: now,
      assignedToUserId: customer.assignedToUserId,
      lastInteractionAt: customer.lastInteractionAt,
      activeRecommendations,
    });

    // d. Insert order
    const orderNumber = `L-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const totalPriceStr = String(data.totalPrice);
    const [order] = await this.db
      .insert(orders)
      .values({
        orderNumber,
        customerId: data.customerId,
        storeId,
        currency: "MXN",
        subtotalPrice: totalPriceStr,
        totalPrice: totalPriceStr,
        externalOrderId: data.externalOrderId,
        sourceName: data.sourceName,
        attributedUserId: attribution.attributedUserId,
        attributionSource: attribution.attributionSource ?? undefined,
        processedAt: now,
      })
      .returning();

    // e. Insert line items
    const itemRows = await Promise.all(
      data.items.map((item) =>
        this.db
          .insert(lineItems)
          .values({
            orderId: order.id,
            productId: item.productId,
            sku: item.sku,
            title: item.sku, // best-effort; richer title is filled from products on read
            quantity: item.quantity,
            price: String(item.unitPrice),
          })
          .returning()
          .then(([row]) => row),
      ),
    );

    // f. If matched recommendation, mark it as converted
    if (attribution.matchedRecommendationId) {
      await this.recommendationsService.markConverted(
        attribution.matchedRecommendationId,
        order.id,
      );
    }

    // g. Mark matching unconverted samples as converted
    const unconvertedSamples = await this.db
      .select()
      .from(samples)
      .where(
        and(
          eq(samples.customerId, data.customerId),
          eq(samples.isConverted, false),
          inArray(samples.productId, orderedProductIds),
        ),
      );
    for (const sample of unconvertedSamples) {
      await this.samplesService.markConverted(sample.id, order.id);
    }

    // h. Update customer.lastOrderAt
    await this.db
      .update(customers)
      .set({ lastOrderAt: now, updatedAt: now })
      .where(eq(customers.id, data.customerId));

    await this.auditService.log(user, "create", "order", order.id, {
      customerId: data.customerId,
      totalPrice: data.totalPrice,
      sourceName: data.sourceName,
      attributedUserId: attribution.attributedUserId,
      attributionSource: attribution.attributionSource,
    });

    return { ...order, items: itemRows };
  }
}
