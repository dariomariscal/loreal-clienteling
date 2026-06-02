import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { appointments, customers } from "@loreal/database";
import { eq, and, isNull, gte, lte, inArray } from "drizzle-orm";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Hourly cron that picks up appointments scheduled in the next 24h and
 * dispatches a "tu cita es mañana / hoy" notification to the assigned BA,
 * then stamps `reminderSentAt` to prevent re-firing.
 *
 * Distinct from `AppointmentImminentCron` (T-30 / T-10 min) — this is the
 * earlier, daily preparation reminder, equivalent to the standard
 * "tomorrow you have a 10am" alert in salon SaaS.
 */
@Injectable()
export class AppointmentRemindersCron {
  private readonly logger = new Logger(AppointmentRemindersCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders(): Promise<void> {
    this.logger.log("Verificando citas próximas para recordatorios...");

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = await this.db
      .select({
        id: appointments.id,
        customerId: appointments.customerId,
        staffUserId: appointments.staffUserId,
        startTime: appointments.startTime,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .from(appointments)
      .innerJoin(customers, eq(customers.id, appointments.customerId))
      .where(
        and(
          inArray(appointments.status, ["scheduled", "confirmed"]),
          isNull(appointments.reminderSentAt),
          gte(appointments.startTime, now),
          lte(appointments.startTime, in24Hours),
        ),
      );

    if (upcoming.length === 0) {
      this.logger.log("No hay citas pendientes de recordatorio");
      return;
    }

    let sent = 0;
    for (const appt of upcoming) {
      const hoursUntil = Math.round(
        (appt.startTime.getTime() - now.getTime()) / (60 * 60 * 1000),
      );
      const customerName = `${appt.firstName} ${appt.lastName}`;

      await this.notifications.create({
        recipientUserId: appt.staffUserId,
        kind: "appointment_imminent",
        priority: "high", // 24h-out is high, not urgent — the imminent cron handles T-30/T-10
        title: `Cita próxima en ~${hoursUntil}h`,
        body: `Cita con ${customerName} el ${appt.startTime.toLocaleString("es-MX")}.`,
        actionUrl: `/appointments/${appt.id}`,
        appointmentId: appt.id,
        customerId: appt.customerId,
        groupKey: `appointment_reminder_24h:${appt.id}`,
      });

      // The 24h reminder doubles as the confirmation request ("¿confirmas?
      // responde SÍ"). Stamp both so the funnel can compute
      // sent → customer-confirmed conversion. Keep reminderSentAt for the
      // imminent-cron de-dup.
      await this.db
        .update(appointments)
        .set({
          reminderSentAt: now,
          confirmationSentAt: now,
          updatedAt: now,
        })
        .where(eq(appointments.id, appt.id));

      sent++;
    }

    this.logger.log(`Recordatorios enviados: ${sent}`);
  }
}
