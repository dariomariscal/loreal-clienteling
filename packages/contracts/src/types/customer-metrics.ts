export interface CustomerMetrics {
  ltv: number;
  ltvChangePct: number | null;
  purchaseCount: number;
  appointmentCount: number;
  nextAppointmentAt: string | null;
  lastVisitAt: string | null;
}
