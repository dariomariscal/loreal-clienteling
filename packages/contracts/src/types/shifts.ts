export type ShiftStatus =
  | "scheduled"
  | "active"
  | "completed"
  | "off"
  | "vacation"
  | "sick";

export interface Shift {
  id: string;
  userId: string;
  storeId: string;
  shiftDate: string;
  startTime: string | null;
  endTime: string | null;
  status: ShiftStatus;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShift {
  userId: string;
  storeId: string;
  shiftDate: string;
  startTime?: string;
  endTime?: string;
  status?: ShiftStatus;
  notes?: string;
}

export type UpdateShift = Partial<Omit<CreateShift, "userId" | "storeId" | "shiftDate">>;

export interface ShiftFilters {
  storeId?: string;
  userId?: string;
  from?: string;
  to?: string;
  status?: ShiftStatus;
}

/** Today's roster row joined with the user's display name + specialty. */
export interface ShiftRosterEntry {
  shiftId: string;
  userId: string;
  fullName: string;
  specialty: string | null;
  startTime: string | null;
  endTime: string | null;
  status: ShiftStatus;
  isOnShiftNow: boolean;
}
