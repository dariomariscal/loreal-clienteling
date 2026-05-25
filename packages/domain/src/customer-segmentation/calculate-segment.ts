import type { LifecycleStage } from "@loreal/contracts";

export interface SegmentationInput {
  enrolledAt: Date;
  orderCount12Months: number;
  totalSpending12Months: number;
  lastOrderAt: Date | null;
  lastMessageAt: Date | null;
  vipSpendingThreshold: number;
  now?: Date;
}

export interface SegmentationResult {
  stage: LifecycleStage;
  /** Mirrors customers.is_active — false means we've given up reaching them. */
  isActive: boolean;
  rationale: string;
}

const DAYS_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / DAYS_MS);
}

/**
 * RF-11: Lifecycle-stage segmentation.
 *
 * Rules (evaluated in priority order):
 * - new: enrolled <30 days ago without a second visit.
 * - vip: ≥6 orders in 12 months OR spending > brand threshold.
 * - returning: between 2 and 5 orders in last 12 months.
 * - at_risk: last order between 120 and 365 days ago.
 *   - If >365 days with no response to outreach: at_risk + isActive=false.
 */
export function calculateSegment(input: SegmentationInput): SegmentationResult {
  const now = input.now ?? new Date();
  const daysSinceEnrollment = daysBetween(input.enrolledAt, now);

  // New: enrolled less than 30 days ago with fewer than 2 orders
  if (daysSinceEnrollment < 30 && input.orderCount12Months < 2) {
    return {
      stage: "new",
      isActive: true,
      rationale: "Enrolled less than 30 days ago without a second visit",
    };
  }

  // VIP: ≥6 orders in 12 months OR spending above threshold
  if (
    input.orderCount12Months >= 6 ||
    input.totalSpending12Months > input.vipSpendingThreshold
  ) {
    return {
      stage: "vip",
      isActive: true,
      rationale:
        input.orderCount12Months >= 6
          ? `${input.orderCount12Months} orders in 12 months`
          : `Spend $${input.totalSpending12Months.toFixed(2)} exceeds VIP threshold`,
    };
  }

  // At-risk evaluation based on last order date
  if (input.lastOrderAt) {
    const daysSinceLastOrder = daysBetween(input.lastOrderAt, now);

    if (daysSinceLastOrder > 365) {
      const hasRecentFollowup =
        input.lastMessageAt !== null &&
        daysBetween(input.lastMessageAt, now) < 90;

      return {
        stage: "at_risk",
        isActive: hasRecentFollowup,
        rationale: `No order in ${daysSinceLastOrder} days${!hasRecentFollowup ? ", no recent outreach" : ""}`,
      };
    }

    if (daysSinceLastOrder >= 120) {
      return {
        stage: "at_risk",
        isActive: true,
        rationale: `Last order ${daysSinceLastOrder} days ago`,
      };
    }
  }

  // Returning: between 2 and 5 orders in 12 months
  if (
    input.orderCount12Months >= 2 &&
    input.orderCount12Months <= 5
  ) {
    return {
      stage: "returning",
      isActive: true,
      rationale: `${input.orderCount12Months} orders in 12 months`,
    };
  }

  // No order at all — check if enrolled long ago
  if (!input.lastOrderAt && daysSinceEnrollment >= 30) {
    return {
      stage: "at_risk",
      isActive: daysSinceEnrollment <= 365,
      rationale: "No orders on file",
    };
  }

  return {
    stage: "new",
    isActive: true,
    rationale: "Recently enrolled with minimal activity",
  };
}
