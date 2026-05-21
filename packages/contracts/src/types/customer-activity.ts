export type CustomerActivityType =
  | "customer_registered"
  | "purchase"
  | "recommendation"
  | "appointment"
  | "communication"
  | "note";

export interface CustomerActivityActor {
  id: string | null;
  name: string | null;
}

export interface CustomerActivityEvent {
  id: string;
  type: CustomerActivityType;
  occurredAt: string;
  actor: CustomerActivityActor;
  title: string;
  body: string | null;
  amount: number | null;
  metadata: Record<string, unknown> | null;
}

export interface CustomerActivityResponse {
  events: CustomerActivityEvent[];
  nextCursor: string | null;
}
