export interface CreateAppointment {
  customerId: string;
  eventTypeId: string;
  scheduledAt: Date;
  durationMinutes: number;
  comments?: string;
  isVirtual?: boolean;
  videoLink?: string;
}

export interface UpdateAppointment {
  status?: string;
  scheduledAt?: Date;
  durationMinutes?: number;
  comments?: string;
}
