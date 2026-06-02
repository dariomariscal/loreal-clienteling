import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { appointments, customers } from "@loreal/database";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * "Tu cita empieza en N minutos" alerts. Runs every 5 minutes and fires
 * one alert when an appointment is within the next ~32 min (T-30 bucket).
 *
 * Dedup is handled by `notifications.groupKey` — the bucket is baked into
 * the key (`appointment_imminent:<id>:t-30`) so we never re-notify for the
 * same appointment in the same window.
 *
 * The T-10 push is the responsibility of the same cron — on the next tick
 * the appointment moves into the T-10 bucket and a new groupKey fires once.
 */
@Injectable()
export class AppointmentImminentCron {
  private readonly logger = new Logger(AppointmentImminentCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkImminent(): Promise<void> {
    const now = new Date();
    const horizonT30 = new Date(now.getTime() + 32 * 60 * 1000);

    const rows = await this.db
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
          gte(appointments.startTime, now),
          lte(appointments.startTime, horizonT30),
        ),
      );

    if (rows.length === 0) return;

    let dispatched = 0;
    for (const row of rows) {
      const minutesUntil = Math.max(
        0,
        Math.round((row.startTime.getTime() - now.getTime()) / 60000),
      );
      // Bucket: T-30 covers anything 11..32 min away; T-10 covers 0..10 min.
      // The bucket goes into the groupKey so the service dedupes per bucket.
      const bucket = minutesUntil <= 10 ? "t-10" : "t-30";
      const customerName = `${row.firstName} ${row.lastName}`;

      const inserted = await this.notifications.create({
        recipientUserId: row.staffUserId,
        kind: "appointment_imminent",
        title:
          bucket === "t-10"
            ? `Tu cita empieza en ${minutesUntil} min`
            : `Cita próxima: ${minutesUntil} min`,
        body: `Cita con ${customerName} a las ${row.startTime.toLocaleTimeString(
          "es-MX",
          { hour: "2-digit", minute: "2-digit" },
        )}.`,
        actionUrl: `/appointments/${row.id}`,
        appointmentId: row.id,
        customerId: row.customerId,
        groupKey: `appointment_imminent:${row.id}:${bucket}`,
      });
      if (inserted) dispatched++;
    }

    if (dispatched > 0) {
      this.logger.log(`Imminent appointment notifications dispatched: ${dispatched}`);
    }
  }
}
