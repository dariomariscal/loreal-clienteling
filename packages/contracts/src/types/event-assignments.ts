export type EventAssignmentRole = "lead" | "staff" | "mua" | "host";

export interface EventAssignment {
  id: string;
  storeEventId: string;
  userId: string;
  role: EventAssignmentRole;
  assignedByUserId: string;
  createdAt: string;
}

export interface AssignBaToEvent {
  userId: string;
  role?: EventAssignmentRole;
}
