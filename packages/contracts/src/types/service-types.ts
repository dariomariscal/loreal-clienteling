/**
 * Service type catalog row — what the BA picks from when booking.
 *
 * Fields beyond name/duration support the booking engine:
 *   - buffer{Before,After}Minutes: invisible padding for cleanup / notes
 *   - price: optional list price (null = complimentary)
 *   - minLeadTimeMinutes / maxAdvanceDays: how far ahead bookings are allowed
 *   - maxCapacity: paralelismo (1 = 1-on-1; >1 = group masterclass)
 *   - requiresConfirmation: whether the customer must confirm
 *     ("YES"-reply / link click) before the slot is held firm
 */
export interface ServiceType {
  id: string;
  code: string;
  displayName: string;
  durationMinutes: number | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  price: string | null;
  color: string | null;
  description: string | null;
  brandId: string | null;
  maxCapacity: number | null;
  requiresConfirmation: boolean;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceType {
  code: string;
  displayName: string;
  durationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  price?: string | null;
  color?: string;
  description?: string;
  brandId?: string | null;
  maxCapacity?: number;
  requiresConfirmation?: boolean;
  minLeadTimeMinutes?: number;
  maxAdvanceDays?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateServiceType = Partial<CreateServiceType>;
