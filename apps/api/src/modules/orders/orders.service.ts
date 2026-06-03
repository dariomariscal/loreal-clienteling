import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { eq, and, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  orders,
  lineItems,
  customers,
  samples,
  products,
  appointments,
  brands,
  stores,
} from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { CustomerActivityService } from "../../common/services/customer-activity.service";
import { RecommendationsService } from "../recommendations/recommendations.service";
import { SamplesService } from "../samples/samples.service";
import {
  EmbeddingEvents,
  type CustomerChangedEvent,
} from "../ai/embedding-events";
import {
  attributePurchaseToBa,
  type RecommendationRecord,
} from "@loreal/domain";
import type { CreateOrderDto } from "../../dtos/orders.dto";

// How far apart the computed item total and the client-supplied totalPrice can
// drift before we reject the request. One cent per item handles MXN rounding
// when the client adds them up in float.
const TOTAL_PRICE_TOLERANCE = 0.05;

const ORDER_NUMBER_MAX_ATTEMPTS = 5;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(CustomerActivityService)
    private customerActivity: CustomerActivityService,
    @Inject(RecommendationsService)
    private recommendationsService: RecommendationsService,
    @Inject(SamplesService) private samplesService: SamplesService,
    private readonly eventBus: EventEmitter2,
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

    // Enrich orders with store name in one query — the BA reads the "where"
    // alongside the "when", and it cuts a roundtrip per row.
    const rows = await this.db
      .select({
        order: orders,
        storeName: stores.displayName,
      })
      .from(orders)
      .leftJoin(stores, eq(stores.id, orders.storeId))
      .where(and(...conditions))
      .orderBy(orders.processedAt);

    if (rows.length === 0) return [];

    // Fetch all line items joined with product + brand so the UI gets the
    // hero image and brand badge without per-row roundtrips. The line_items
    // table snapshots title/variantTitle at purchase time (so historical
    // renames don't corrupt the receipt), but image and brand belong to the
    // current product row — that's fine for a clienteling timeline.
    const orderIds = rows.map((r) => r.order.id);
    const allItems = await this.db
      .select({
        item: lineItems,
        productImages: products.images,
        brandDisplayName: brands.displayName,
        brandCode: brands.code,
      })
      .from(lineItems)
      .innerJoin(products, eq(products.id, lineItems.productId))
      .innerJoin(brands, eq(brands.id, products.brandId))
      .where(inArray(lineItems.orderId, orderIds));

    const itemsByOrder = new Map<
      string,
      Array<{
        id: string;
        orderId: string;
        productId: string;
        sku: string;
        title: string;
        variantTitle: string | null;
        quantity: number;
        price: string;
        totalDiscount: string;
        productImageUrl: string | null;
        brand: { code: string; displayName: string };
      }>
    >();
    for (const row of allItems) {
      const existing = itemsByOrder.get(row.item.orderId) ?? [];
      existing.push({
        ...row.item,
        productImageUrl: this.firstProductImage(row.productImages),
        brand: {
          code: row.brandCode,
          displayName: row.brandDisplayName,
        },
      });
      itemsByOrder.set(row.item.orderId, existing);
    }

    return rows.map(({ order, storeName }) => ({
      ...order,
      storeName,
      items: itemsByOrder.get(order.id) ?? [],
    }));
  }

  private firstProductImage(images: unknown): string | null {
    if (!Array.isArray(images) || images.length === 0) return null;
    const first = images[0];
    return typeof first === "string" && first.length > 0 ? first : null;
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

    // Validate item math up front so we never persist a tampered totalPrice.
    const computedTotal = data.items.reduce(
      (sum, it) => sum + it.unitPrice * it.quantity,
      0,
    );
    if (Math.abs(computedTotal - data.totalPrice) > TOTAL_PRICE_TOLERANCE) {
      throw new BadRequestException(
        `totalPrice ${data.totalPrice} does not match line items total ${computedTotal.toFixed(2)}`,
      );
    }

    // Fetch customer
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, data.customerId));

    if (!customer) throw new NotFoundException("Customer not found");

    // Fetch product titles in bulk so line items get real titles, not just SKUs.
    const productIds = Array.from(new Set(data.items.map((i) => i.productId)));
    const productRows = await this.db
      .select({ id: products.id, title: products.title })
      .from(products)
      .where(inArray(products.id, productIds));
    const titleById = new Map(productRows.map((p) => [p.id, p.title]));

    // Compute attribution before opening the transaction — pure function, no
    // DB writes. Keeps the transaction body small.
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

    const orderedProductIds = data.items.map((item) => item.productId);
    const now = new Date();
    let attribution = attributePurchaseToBa({
      customerId: data.customerId,
      orderedProductIds,
      processedAt: now,
      assignedToUserId: customer.assignedToUserId,
      lastInteractionAt: customer.lastInteractionAt,
      activeRecommendations,
    });

    // If the order is explicitly tied to an appointment, that wins — the
    // appointment's BA gets credit and the source flips to "appointment".
    // Otherwise we honor whatever the generic attributor decided.
    let resolvedAppointmentId: string | undefined;
    if (data.appointmentId) {
      const [appt] = await this.db
        .select({
          id: appointments.id,
          staffUserId: appointments.staffUserId,
          customerId: appointments.customerId,
        })
        .from(appointments)
        .where(eq(appointments.id, data.appointmentId));
      if (!appt) {
        throw new NotFoundException("Appointment not found");
      }
      if (appt.customerId !== data.customerId) {
        throw new BadRequestException(
          "Appointment does not belong to this customer",
        );
      }
      resolvedAppointmentId = appt.id;
      attribution = {
        ...attribution,
        attributedUserId: appt.staffUserId,
        attributionSource: "appointment",
      };
    }

    const totalPriceStr = data.totalPrice.toFixed(2);

    const result = await this.db.transaction(async (tx) => {
      // Insert order with retry on order_number collision. Random short codes
      // are not guaranteed unique, but the schema is — without the retry one
      // collision per few million orders surfaces as an opaque 500.
      let order: typeof orders.$inferSelect | null = null;
      for (let attempt = 0; attempt < ORDER_NUMBER_MAX_ATTEMPTS; attempt++) {
        const orderNumber = generateOrderNumber();
        try {
          const [inserted] = await tx
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
              appointmentId: resolvedAppointmentId,
              processedAt: now,
            })
            .returning();
          order = inserted;
          break;
        } catch (err) {
          if (!isUniqueViolation(err, "orders_order_number_unique")) throw err;
        }
      }
      if (!order) {
        throw new Error(
          "Could not generate a unique order number after retries",
        );
      }

      const itemRows = await Promise.all(
        data.items.map((item) =>
          tx
            .insert(lineItems)
            .values({
              orderId: order!.id,
              productId: item.productId,
              sku: item.sku,
              title: titleById.get(item.productId) ?? item.sku,
              quantity: item.quantity,
              price: item.unitPrice.toFixed(2),
            })
            .returning()
            .then(([row]) => row),
        ),
      );

      // Convert matched recommendation
      if (attribution.matchedRecommendationId) {
        await this.recommendationsService.markConverted(
          attribution.matchedRecommendationId,
          order.id,
        );
      }

      // Convert matching unconverted samples
      const unconvertedSamples = await tx
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

      // Recompute denormalized customer metrics + lifecycle in the same tx so
      // the post-commit state is always consistent. This replaces the old
      // single-column UPDATE that left totalSpent/ordersCount/AOV stale.
      await this.customerActivity.recomputeMetricsAndSegment(
        data.customerId,
        tx,
        now,
      );

      // An order is itself an interaction — keeps the attribution window
      // honest for follow-up purchases.
      await this.customerActivity.touchInteraction(data.customerId, now, tx);

      return { order, itemRows };
    });

    const customerChangedPayload: CustomerChangedEvent = {
      customerId: data.customerId,
      reason: "order_created",
    };
    this.eventBus.emit(
      EmbeddingEvents.CUSTOMER_CHANGED,
      customerChangedPayload,
    );

    await this.auditService.log(user, "create", "order", result.order.id, {
      customerId: data.customerId,
      totalPrice: data.totalPrice,
      sourceName: data.sourceName,
      attributedUserId: attribution.attributedUserId,
      attributionSource: attribution.attributionSource,
    });

    return { ...result.order, items: result.itemRows };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  // 8-char base36 → ~2.8 trillion values; retry loop handles the rest.
  return `L-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; constraint?: string };
  if (e.code !== "23505") return false;
  return !constraint || e.constraint === constraint;
}
