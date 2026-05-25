import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { appointments, customers } from "@loreal/database";
import { eq, and, isNull, gte, lte, inArray } from "drizzle-orm";

@Injectable()
export class AppointmentRemindersCron {
  private readonly logger = new Logger(AppointmentRemindersCron.name);

  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders(): Promise<void> {
    this.logger.log("Verificando citas próximas para recordatorios...");

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find appointments in the next 24 hours that haven't received a reminder
    const upcomingAppointments = await this.db
      .select({
        id: appointments.id,
        customerId: appointments.customerId,
        staffUserId: appointments.staffUserId,
        storeId: appointments.storeId,
        serviceTypeId: appointments.serviceTypeId,
        startTime: appointments.startTime,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          inArray(appointments.status, ["scheduled", "confirmed"]),
          isNull(appointments.reminderSentAt),
          gte(appointments.startTime, now),
          lte(appointments.startTime, in24Hours),
        ),
      );

    if (upcomingAppointments.length === 0) {
      this.logger.log("No hay citas pendientes de recordatorio");
      return;
    }

    let sent = 0;

    for (const appointment of upcomingAppointments) {
      // Fetch customer name for the reminder message
      const [customer] = await this.db
        .select({
          firstName: customers.firstName,
          lastName: customers.lastName,
        })
        .from(customers)
        .where(eq(customers.id, appointment.customerId));

      if (!customer) continue;

      const hoursUntil = Math.round(
        (appointment.startTime.getTime() - now.getTime()) / (60 * 60 * 1000),
      );

      // Mark reminder as sent
      // In production, this would also trigger a push notification to the BA
      // and optionally a WhatsApp/SMS to the customer (if consent exists)
      await this.db
        .update(appointments)
        .set({
          reminderSentAt: now,
          updatedAt: now,
        })
        .where(eq(appointments.id, appointment.id));

      this.logger.debug(
        `Recordatorio: cita con ${customer.firstName} ${customer.lastName} en ~${hoursUntil}h (staff: ${appointment.staffUserId})`,
      );

      sent++;
    }

    this.logger.log(`Recordatorios enviados: ${sent}`);
  }
}
