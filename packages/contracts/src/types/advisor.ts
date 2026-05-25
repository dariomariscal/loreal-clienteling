// Advisor "Today" feed — the BA's home payload, returned in a single
// request to keep the home screen fast on mobile.

export interface TodayAppointment {
  id: string;
  startTime: string;
  durationMinutes: number;
  status: string;
  isVirtual: boolean;
  serviceTypeId: string;
  serviceTypeName: string | null;
  serviceTypeColor: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerLifecycleStage: string | null;
}

export interface TodayCustomerRef {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  lifecycleStage: string;
}

export interface TodayBirthday extends TodayCustomerRef {
  birthday: string;
  daysUntil: number;
}

export interface TodayAtRiskCustomer extends TodayCustomerRef {
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
}

export interface TodayNewCustomer extends TodayCustomerRef {
  enrolledAt: string;
}

export interface TodayPendingFollowup {
  id: string;
  customerId: string;
  customerName: string;
  /** Null for inbound messages — they're not campaign follow-ups. */
  campaignType: string | null;
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
