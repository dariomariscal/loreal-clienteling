// Advisor "Today" feed — the BA's home payload, returned in a single
// request to keep the home screen fast on mobile.

export interface TodayAppointment {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  isVirtual: boolean;
  eventTypeId: string;
  eventTypeName: string | null;
  eventTypeColor: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerSegment: string | null;
}

export interface TodayCustomerRef {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  lifecycleSegment: string;
}

export interface TodayBirthday extends TodayCustomerRef {
  birthDate: string;
  daysUntil: number;
}

export interface TodayAtRiskCustomer extends TodayCustomerRef {
  lastTransactionAt: string | null;
  daysSinceLastPurchase: number | null;
}

export interface TodayNewCustomer extends TodayCustomerRef {
  customerSince: string;
}

export interface TodayPendingFollowup {
  id: string;
  customerId: string;
  customerName: string;
  followupType: string;
  body: string;
  channel: string;
  sentAt: string;
}

export interface AdvisorToday {
  appointmentsToday: TodayAppointment[];
  upcomingBirthdays: TodayBirthday[];
  atRiskCustomers: TodayAtRiskCustomer[];
  newCustomersThisWeek: TodayNewCustomer[];
  pendingFollowups: TodayPendingFollowup[];
}
