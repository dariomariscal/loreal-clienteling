/**
 * Allowed slot grid sizes for the booking engine. Anything else is rejected
 * at the API boundary — the UI shouldn't have to handle a 7-minute grid.
 */
export const SlotGranularityMinutes = {
  FIFTEEN: 15,
  THIRTY: 30,
  SIXTY: 60,
} as const;

export type SlotGranularityMinutes =
  (typeof SlotGranularityMinutes)[keyof typeof SlotGranularityMinutes];

export const SLOT_GRANULARITY_VALUES = Object.values(SlotGranularityMinutes);
