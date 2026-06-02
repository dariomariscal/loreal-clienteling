import type { SlotGranularityMinutes } from "../enums/scheduling";

export interface ActiveDays {
  mon?: boolean;
  tue?: boolean;
  wed?: boolean;
  thu?: boolean;
  fri?: boolean;
  sat?: boolean;
  sun?: boolean;
}

export interface BlackoutRange {
  /** ISO `YYYY-MM-DD`. */
  from: string;
  /** ISO `YYYY-MM-DD`. */
  to: string;
  reason?: string;
}

export interface SchedulingPolicy {
  id: string;
  storeId: string | null;
  serviceTypeId: string | null;
  slotGranularityMinutes: SlotGranularityMinutes;
  minLeadTimeMinutes: number | null;
  maxAdvanceDays: number | null;
  activeDays: ActiveDays | null;
  workWindowStart: string | null;
  workWindowEnd: string | null;
  blackoutDates: BlackoutRange[] | null;
  priority: number;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSchedulingPolicy {
  storeId?: string | null;
  serviceTypeId?: string | null;
  slotGranularityMinutes: SlotGranularityMinutes;
  minLeadTimeMinutes?: number;
  maxAdvanceDays?: number;
  activeDays?: ActiveDays;
  workWindowStart?: string;
  workWindowEnd?: string;
  blackoutDates?: BlackoutRange[];
  priority?: number;
  isActive?: boolean;
  notes?: string;
}

export type UpdateSchedulingPolicy = Partial<CreateSchedulingPolicy>;

/**
 * The "effective" policy resolved for a (store, service) pair. The resolver
 * picks the highest-priority active row matching the pair, then falls back
 * to (store, *), (*, service), (*, *) before applying service-type defaults.
 */
export interface EffectiveSchedulingPolicy {
  slotGranularityMinutes: SlotGranularityMinutes;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
  activeDays: ActiveDays;
  workWindowStart: string;
  workWindowEnd: string;
  blackoutDates: BlackoutRange[];
  sourcePolicyId: string | null;
}
