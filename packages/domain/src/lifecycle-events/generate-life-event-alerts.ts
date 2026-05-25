import type { CampaignType } from "@loreal/contracts";
import type { ReplenishmentResult } from "../replenishment/calculate-next-purchase";

export interface CustomerForAlerts {
  customerId: string;
  birthday: Date | null;
  enrolledAt: Date;
  assignedToUserId: string;
}

export interface LifeEventAlert {
  customerId: string;
  assignedToUserId: string;
  type: CampaignType;
  label: string;
  eventDate: Date;
  daysUntil: number;
}

const DAYS_MS = 24 * 60 * 60 * 1000;
const ALERT_WINDOW_DAYS = 7;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAYS_MS);
}

function getNextOccurrence(
  referenceDate: Date,
  now: Date,
): { date: Date; daysUntil: number } {
  const thisYear = new Date(
    now.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  // If this year's occurrence already passed, use next year
  const target = thisYear >= now
    ? thisYear
    : new Date(
        now.getFullYear() + 1,
        referenceDate.getMonth(),
        referenceDate.getDate(),
      );

  return {
    date: target,
    daysUntil: daysBetween(now, target),
  };
}

/**
 * RF-09: Automatic life-event alerts.
 *
 * Generates alerts when:
 * - The customer's birthday is within the next 7 days.
 * - The customer's enrollment anniversary is within the next 7 days.
 * - Any product is in its replenishment window.
 */
export function generateLifeEventAlerts(
  customer: CustomerForAlerts,
  replenishmentAlerts: ReplenishmentResult[],
  now?: Date,
): LifeEventAlert[] {
  const currentDate = now ?? new Date();
  const alerts: LifeEventAlert[] = [];

  // Birthday alert
  if (customer.birthday) {
    const { date, daysUntil } = getNextOccurrence(customer.birthday, currentDate);
    if (daysUntil >= 0 && daysUntil <= ALERT_WINDOW_DAYS) {
      alerts.push({
        customerId: customer.customerId,
        assignedToUserId: customer.assignedToUserId,
        type: "birthday",
        label:
          daysUntil === 0
            ? "Today is her birthday"
            : `Birthday in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
        eventDate: date,
        daysUntil,
      });
    }
  }

  // Anniversary alert (enrollment anniversary)
  const { date: anniversaryDate, daysUntil: daysUntilAnniversary } =
    getNextOccurrence(customer.enrolledAt, currentDate);

  // Only alert if the customer has been around for at least 1 year
  if (
    currentDate.getFullYear() > customer.enrolledAt.getFullYear() &&
    daysUntilAnniversary >= 0 &&
    daysUntilAnniversary <= ALERT_WINDOW_DAYS
  ) {
    const years =
      anniversaryDate.getFullYear() - customer.enrolledAt.getFullYear();
    alerts.push({
      customerId: customer.customerId,
      assignedToUserId: customer.assignedToUserId,
      type: "special_event",
      label:
        daysUntilAnniversary === 0
          ? `Today marks ${years} year${years === 1 ? "" : "s"} as a customer`
          : `${years}-year anniversary in ${daysUntilAnniversary} day${daysUntilAnniversary === 1 ? "" : "s"}`,
      eventDate: anniversaryDate,
      daysUntil: daysUntilAnniversary,
    });
  }

  // Replenishment alerts
  for (const replenishment of replenishmentAlerts) {
    if (replenishment.isInWindow) {
      alerts.push({
        customerId: customer.customerId,
        assignedToUserId: customer.assignedToUserId,
        type: "replenishment",
        label:
          replenishment.daysUntilDepletion <= 0
            ? "Product likely out of stock"
            : `Product runs out in ~${replenishment.daysUntilDepletion} days`,
        eventDate: replenishment.estimatedDepletionDate,
        daysUntil: Math.max(0, replenishment.daysUntilDepletion),
      });
    }
  }

  return alerts;
}
