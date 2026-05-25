export interface OrderRecord {
  processedAt: Date;
  productId: string;
}

export interface ReplenishmentInput {
  productId: string;
  replenishmentDays: number;
  orderHistory: OrderRecord[];
  now?: Date;
}

export interface ReplenishmentResult {
  productId: string;
  estimatedDepletionDate: Date;
  windowStart: Date;
  windowEnd: Date;
  isInWindow: boolean;
  isPastWindow: boolean;
  averageIntervalDays: number | null;
  daysUntilDepletion: number;
}

const DAYS_MS = 24 * 60 * 60 * 1000;
const WINDOW_BEFORE_DAYS = 15;
const WINDOW_AFTER_DAYS = 30;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAYS_MS);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAYS_MS);
}

/**
 * RF-16: Replenishment logic.
 *
 * Computes when a customer will run out of a product and whether they are in
 * the rebuy window. If there are multiple orders for the same product, the
 * actual repurchase interval is averaged.
 */
export function calculateNextPurchase(
  input: ReplenishmentInput,
): ReplenishmentResult | null {
  const now = input.now ?? new Date();

  const productOrders = input.orderHistory
    .filter((o) => o.productId === input.productId)
    .sort((a, b) => a.processedAt.getTime() - b.processedAt.getTime());

  if (productOrders.length === 0) {
    return null;
  }

  let averageIntervalDays: number | null = null;

  if (productOrders.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < productOrders.length; i++) {
      intervals.push(
        daysBetween(
          productOrders[i - 1].processedAt,
          productOrders[i].processedAt,
        ),
      );
    }
    averageIntervalDays = Math.round(
      intervals.reduce((sum, d) => sum + d, 0) / intervals.length,
    );
  }

  const lastOrder = productOrders[productOrders.length - 1];

  // Duration: prefer historical average if available, otherwise product estimate
  const effectiveDuration = averageIntervalDays ?? input.replenishmentDays;

  const estimatedDepletionDate = addDays(
    lastOrder.processedAt,
    effectiveDuration,
  );
  const windowStart = addDays(estimatedDepletionDate, -WINDOW_BEFORE_DAYS);
  const windowEnd = addDays(estimatedDepletionDate, WINDOW_AFTER_DAYS);

  const daysUntilDepletion = daysBetween(now, estimatedDepletionDate);

  return {
    productId: input.productId,
    estimatedDepletionDate,
    windowStart,
    windowEnd,
    isInWindow: now >= windowStart && now <= windowEnd,
    isPastWindow: now > windowEnd,
    averageIntervalDays,
    daysUntilDepletion,
  };
}
