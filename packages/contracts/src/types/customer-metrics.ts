export interface CustomerMetrics {
  ltv: number;
  ltvChangePct: number | null;
  ordersCount: number;
  appointmentCount: number;
  nextAppointmentAt: string | null;
  lastVisitAt: string | null;
}
