import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { and, eq, ilike, sql, desc, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  productVariants,
  products,
  brands,
  inventoryLevels,
  stores,
  orders,
  lineItems,
  customers,
  customerAiSummaries,
  wishlists,
  wishlistItems,
  samples,
} from "@loreal/database";
import type {
  ScanLookupResult,
  ScanActionType,
} from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";

const NEARBY_STORES_LIMIT = 3;

@Injectable()
export class ProductLookupService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  /**
   * Resolve a scanned barcode (EAN-13) or fall back to SKU match.
   * Returns the full bottom-sheet payload: variant + product + brand +
   * stock across the BA's accessible stores + customer signals + a
   * prioritized list of suggested actions.
   *
   * customerId is optional. When provided, we verify the BA has access to
   * that customer and compute the customerMatch block. When omitted, the
   * result is "anonymous" and the action list defaults to viewed_only.
   */
  async lookupByBarcode(
    user: SessionUser,
    barcode: string,
    customerId?: string,
  ): Promise<ScanLookupResult> {
    // 1. Variant lookup — exact barcode first, then SKU as a fallback (the
    //    same code is scanned in some demo fixtures as the SKU literal).
    const cleaned = barcode.trim();
    if (!cleaned) throw new NotFoundException("Empty barcode");

    const [variantRow] = await this.db
      .select({
        variant: productVariants,
        product: products,
        brand: brands,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .innerJoin(brands, eq(brands.id, products.brandId))
      .where(
        sql`(${productVariants.barcode} = ${cleaned} OR ${productVariants.sku} = ${cleaned}) AND ${productVariants.isActive} = true`,
      )
      .limit(1);

    if (!variantRow) {
      throw new NotFoundException(`No variant found for barcode ${cleaned}`);
    }

    // Brand scope guard — a BA assigned to Lancôme should not pull YSL data
    // unless they're area_manager+. ScopeService throws for us.
    const brandScope = await this.scopeService.scopeByBrand(user, brands.id);
    if (brandScope) {
      const [check] = await this.db
        .select({ id: brands.id })
        .from(brands)
        .where(and(eq(brands.id, variantRow.brand.id), brandScope));
      if (!check) {
        throw new ForbiddenException(
          "This product belongs to a brand outside your scope",
        );
      }
    }

    // 2. Stock — this store first, then nearby stores within scope.
    const accessibleStoreIds = await this.resolveAccessibleStores(user);
    const stock = await this.buildStockBlock(
      variantRow.variant.id,
      user.storeId,
      accessibleStoreIds,
    );

    // 3. Customer signals (optional).
    const customerMatch = customerId
      ? await this.buildCustomerMatch(
          user,
          customerId,
          variantRow.variant.id,
          variantRow.product.id,
          variantRow.product.replenishmentDays,
          variantRow.variant.title,
        )
      : null;

    // 4. Suggested actions — derived, not hardcoded.
    const suggestedActions = this.buildSuggestedActions({
      hasCustomer: !!customerMatch,
      stock,
      customerMatch,
    });

    return {
      variant: {
        id: variantRow.variant.id,
        sku: variantRow.variant.sku,
        barcode: variantRow.variant.barcode,
        title: variantRow.variant.title,
        optionLabel: this.collapseOptions(variantRow.variant),
        swatchHex: variantRow.variant.swatchHex,
        // Variants rarely ship with their own image (only the launch shade
        // gets a photo). Fall back to the parent product's first image so
        // every scan renders a real product hero — consumer of this payload
        // never needs to know about the products.images shape.
        imageUrl:
          variantRow.variant.imageUrl ?? this.firstProductImage(variantRow.product.images),
        price: Number(variantRow.variant.price),
      },
      product: {
        id: variantRow.product.id,
        title: variantRow.product.title,
        category: variantRow.product.category,
        subcategory: variantRow.product.subcategory,
        replenishmentDays: variantRow.product.replenishmentDays,
        brand: {
          id: variantRow.brand.id,
          code: variantRow.brand.code,
          displayName: variantRow.brand.displayName,
          tier: variantRow.brand.tier,
        },
      },
      stock,
      customerMatch,
      suggestedActions,
    };
  }

  private collapseOptions(
    v: typeof productVariants.$inferSelect,
  ): string | null {
    return [v.option1, v.option2, v.option3].filter(Boolean).join(" · ") || null;
  }

  /**
   * `products.images` is stored as a jsonb string array. Drizzle returns it
   * already parsed but typed as `unknown` — narrow before reading.
   */
  private firstProductImage(images: unknown): string | null {
    if (!Array.isArray(images) || images.length === 0) return null;
    const first = images[0];
    return typeof first === "string" && first.length > 0 ? first : null;
  }

  private async resolveAccessibleStores(user: SessionUser): Promise<string[]> {
    // Admin sees everything: return [] and caller will skip the IN filter.
    if (user.role === "admin") return [];
    const ids = await this.scopeService.getAccessibleStoreIds(user);
    // BAs/CMs return [] from getAccessibleStoreIds — they only see their store.
    if (ids.length === 0 && user.storeId) return [user.storeId];
    return ids;
  }

  private async buildStockBlock(
    variantId: string,
    thisStoreId: string | null,
    accessibleStoreIds: string[],
  ): Promise<ScanLookupResult["stock"]> {
    // Pull every accessible inventory row for this variant in one query.
    const conditions = [eq(inventoryLevels.variantId, variantId)];
    if (accessibleStoreIds.length > 0) {
      conditions.push(inArray(inventoryLevels.storeId, accessibleStoreIds));
    }

    const rows = await this.db
      .select({
        storeId: inventoryLevels.storeId,
        available: inventoryLevels.availableQuantity,
        status: inventoryLevels.stockStatus,
        storeName: stores.displayName,
        city: stores.city,
        state: stores.state,
      })
      .from(inventoryLevels)
      .innerJoin(stores, eq(stores.id, inventoryLevels.storeId))
      .where(and(...conditions));

    let thisStore: ScanLookupResult["stock"]["thisStore"] = null;
    const nearby: ScanLookupResult["stock"]["nearbyStores"] = [];
    let nationalAvailable = 0;

    for (const r of rows) {
      nationalAvailable += r.available;
      if (r.storeId === thisStoreId) {
        thisStore = {
          storeId: r.storeId,
          storeName: r.storeName,
          available: r.available,
          status: r.status,
        };
      } else {
        nearby.push({
          storeId: r.storeId,
          storeName: r.storeName,
          city: r.city ?? "",
          state: r.state ?? "",
          available: r.available,
          status: r.status,
        });
      }
    }

    // Most-stocked first, then take top N. Real apps geo-rank; for demo,
    // available DESC is a reasonable proxy and keeps the response useful.
    nearby.sort((a, b) => b.available - a.available);

    return {
      thisStore,
      nearbyStores: nearby.slice(0, NEARBY_STORES_LIMIT),
      nationalAvailable,
    };
  }

  private async buildCustomerMatch(
    user: SessionUser,
    customerId: string,
    variantId: string,
    productId: string,
    replenishmentDays: number | null,
    variantTitle: string,
  ): Promise<ScanLookupResult["customerMatch"]> {
    // Auth: verify the BA has access to this customer.
    await this.scopeService.assertCustomerAccess(customerId, user);

    const [customer] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) return null;

    // Last purchase of this variant by this customer.
    const [lastPurchase] = await this.db
      .select({ processedAt: orders.processedAt })
      .from(lineItems)
      .innerJoin(orders, eq(orders.id, lineItems.orderId))
      .where(
        and(
          eq(orders.customerId, customerId),
          eq(lineItems.sku, sql`(SELECT sku FROM ${productVariants} WHERE id = ${variantId})`),
        ),
      )
      .orderBy(desc(orders.processedAt))
      .limit(1);

    const lastPurchasedAt = lastPurchase?.processedAt ?? null;
    const daysSinceLastPurchase = lastPurchasedAt
      ? Math.floor(
          (Date.now() - new Date(lastPurchasedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    const replenishmentDue =
      replenishmentDays != null &&
      daysSinceLastPurchase != null &&
      daysSinceLastPurchase >= replenishmentDays;

    // Historical shade — the literal variant title appears in the cached AI
    // summary (e.g. "240W"). Lightweight signal that lets us pin "tu shade
    // oficial" on the bottom sheet without an extra LLM call.
    const [summary] = await this.db
      .select({ text: customerAiSummaries.summaryText })
      .from(customerAiSummaries)
      .where(eq(customerAiSummaries.customerId, customerId));
    const isHistoricalShade =
      !!summary &&
      variantTitle.length >= 2 &&
      summary.text.toLowerCase().includes(variantTitle.toLowerCase());

    // Wishlist membership — same variant on any of the customer's lists.
    const [wish] = await this.db
      .select({ id: wishlistItems.id })
      .from(wishlistItems)
      .innerJoin(wishlists, eq(wishlists.id, wishlistItems.wishlistId))
      .where(
        and(
          eq(wishlists.customerId, customerId),
          eq(wishlistItems.variantId, variantId),
        ),
      )
      .limit(1);

    // Sample-given history — product-level (the variant column may be empty
    // on legacy rows seeded before scan flow existed).
    const [sample] = await this.db
      .select({ id: samples.id })
      .from(samples)
      .where(
        and(eq(samples.customerId, customerId), eq(samples.productId, productId)),
      )
      .limit(1);

    return {
      customerId,
      isHistoricalShade,
      lastPurchasedAt: lastPurchasedAt
        ? new Date(lastPurchasedAt).toISOString()
        : null,
      daysSinceLastPurchase,
      replenishmentDue,
      inWishlist: !!wish,
      sampleGivenBefore: !!sample,
    };
  }

  private buildSuggestedActions(input: {
    hasCustomer: boolean;
    stock: ScanLookupResult["stock"];
    customerMatch: ScanLookupResult["customerMatch"];
  }): ScanLookupResult["suggestedActions"] {
    const out: ScanLookupResult["suggestedActions"] = [];

    if (!input.hasCustomer) {
      // Anonymous scan — counter-manager / stock-check path. We still want
      // something other than "viewed_only" so the BA can attach and act.
      out.push({
        type: "viewed_only",
        label: "Atribuir a un cliente para registrar acción",
        priority: 1,
      });
      return out;
    }

    const inStock =
      (input.stock.thisStore?.available ?? 0) > 0 ||
      input.stock.nationalAvailable > 0;

    // Replenishment beats novelty when both apply.
    if (input.customerMatch?.replenishmentDue) {
      out.push({
        type: "add_to_cart",
        label: "Agregar a carrito — recompra esperada",
        priority: 1,
        reason: "Tiempo de recompra alcanzado según último pedido",
      });
    } else if (input.customerMatch?.isHistoricalShade) {
      out.push({
        type: "add_to_cart",
        label: "Agregar a carrito — su shade oficial",
        priority: 1,
        reason: "Coincide con su shade registrado",
      });
    } else if (inStock) {
      out.push({ type: "add_to_cart", label: "Agregar a carrito", priority: 2 });
    }

    if (!input.customerMatch?.sampleGivenBefore) {
      out.push({
        type: "sample_logged",
        label: "Registrar muestra entregada",
        priority: 3,
      });
    }

    if (!input.customerMatch?.inWishlist) {
      out.push({
        type: "add_to_wishlist",
        label: "Agregar a wishlist",
        priority: 4,
      });
    }

    out.push({
      type: "send_whatsapp",
      label: "Enviar ficha por WhatsApp",
      priority: 5,
    });

    out.push({
      type: "shown_to_customer",
      label: "Registrar 'mostrado a cliente'",
      priority: 6,
    });

    if (!inStock) {
      out.push({
        type: "reserve",
        label: "Reservar desde otro store",
        priority: 2,
        reason: "Sin stock aquí — disponible en otras tiendas",
      });
    }

    return out.sort((a, b) => a.priority - b.priority);
  }
}

// Avoid unused-import lint when ScanActionType is only used by callers.
export type _ScanActionTypeRef = ScanActionType;
