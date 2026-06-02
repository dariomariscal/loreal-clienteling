import { Injectable, Inject, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationsService } from "../notifications.service";
import {
  NotificationEvents,
  type MessageReceivedEvent,
  type MessageReadEvent,
  type ApprovalDecidedEvent,
  type BaRatingCreatedEvent,
  type AppointmentStatusChangedEvent,
  type CustomerVisitStartedEvent,
  type CustomerAssignedEvent,
} from "../notification-events";

/**
 * Reactive listeners: turn domain events into notifications. One listener
 * per event keeps the mapping explicit and easy to audit.
 *
 * Listeners are intentionally tolerant — they catch and log to avoid a
 * notification failure ever rolling back the original write that triggered
 * the event.
 */
@Injectable()
export class ReactiveNotificationListener {
  private readonly logger = new Logger(ReactiveNotificationListener.name);

  constructor(
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @OnEvent(NotificationEvents.MESSAGE_RECEIVED, { async: true })
  async onMessageReceived(event: MessageReceivedEvent) {
    if (!event.assignedToUserId) return; // no owner → no recipient
    try {
      await this.notifications.create({
        recipientUserId: event.assignedToUserId,
        kind: "customer_reply",
        title: "Tu clienta respondió",
        body: event.preview.slice(0, 160),
        actionUrl: `/customers/${event.customerId}/messages`,
        customerId: event.customerId,
        groupKey: `customer_reply:${event.customerId}:${event.messageId}`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create customer_reply notification: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(NotificationEvents.MESSAGE_READ, { async: true })
  async onMessageRead(event: MessageReadEvent) {
    try {
      await this.notifications.create({
        recipientUserId: event.sentByUserId,
        kind: "message_read",
        title: "Tu mensaje fue leído",
        body: "La clienta acaba de ver tu último mensaje.",
        actionUrl: `/customers/${event.customerId}/messages`,
        customerId: event.customerId,
        groupKey: `message_read:${event.messageId}`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create message_read notification: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(NotificationEvents.APPROVAL_DECIDED, { async: true })
  async onApprovalDecided(event: ApprovalDecidedEvent) {
    const verb = event.decision === "approved" ? "aprobada" : "rechazada";
    try {
      await this.notifications.create({
        recipientUserId: event.requestedByUserId,
        kind: "approval_decided",
        title: `Solicitud ${verb}`,
        body: `Tu solicitud de ${event.type.replace(/_/g, " ")} fue ${verb}.`,
        actionUrl: `/approvals/${event.approvalRequestId}`,
        approvalRequestId: event.approvalRequestId,
        customerId: event.customerId ?? undefined,
        groupKey: `approval_decided:${event.approvalRequestId}`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create approval_decided notification: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(NotificationEvents.BA_RATING_CREATED, { async: true })
  async onBaRatingCreated(event: BaRatingCreatedEvent) {
    const label =
      event.score >= 9
        ? "Excelente calificación recibida"
        : event.score >= 7
          ? "Calificación recibida"
          : "Calificación baja recibida";
    try {
      await this.notifications.create({
        recipientUserId: event.reviewedUserId,
        kind: "ba_rating_received",
        title: label,
        body: `Tu clienta dejó una calificación de ${event.score}/10.`,
        actionUrl: `/ratings/${event.baRatingId}`,
        baRatingId: event.baRatingId,
        customerId: event.customerId,
        groupKey: `ba_rating_received:${event.baRatingId}`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create ba_rating_received notification: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(NotificationEvents.APPOINTMENT_STATUS_CHANGED, { async: true })
  async onAppointmentStatusChanged(event: AppointmentStatusChangedEvent) {
    // We only fire on user-facing transitions; reschedules and confirms
    // both matter, but a plain `scheduled` insert does not (handled by the
    // appointment-imminent cron instead).
    const interesting = new Set(["confirmed", "cancelled", "rescheduled"]);
    if (!interesting.has(event.newStatus)) return;

    const titleByStatus: Record<string, string> = {
      confirmed: "Cita confirmada",
      cancelled: "Cita cancelada",
      rescheduled: "Cita reprogramada",
    };

    try {
      await this.notifications.create({
        recipientUserId: event.staffUserId,
        kind: "appointment_imminent", // reuse — same urgency tier
        title: titleByStatus[event.newStatus],
        body: `La cita programada para ${event.startTime.toLocaleString("es-MX")} cambió a ${event.newStatus}.`,
        actionUrl: `/appointments/${event.appointmentId}`,
        appointmentId: event.appointmentId,
        customerId: event.customerId,
        groupKey: `appointment_status:${event.appointmentId}:${event.newStatus}`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create appointment status notification: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(NotificationEvents.CUSTOMER_VISIT_STARTED, { async: true })
  async onCustomerVisitStarted(event: CustomerVisitStartedEvent) {
    // Only notify the assigned BA if they're a different person from the
    // attendee — otherwise the BA who created the visit already knows.
    const recipient = event.assignedToUserId;
    if (!recipient || recipient === event.attendedByUserId) return;

    try {
      await this.notifications.create({
        recipientUserId: recipient,
        kind: "customer_arrived",
        title: event.isVip
          ? "Tu clienta VIP está en el mostrador"
          : "Tu clienta está en el mostrador",
        body: "Una clienta de tu cartera acaba de iniciar una visita.",
        actionUrl: `/customers/${event.customerId}`,
        customerId: event.customerId,
        visitId: event.visitId,
        groupKey: `customer_arrived:${event.visitId}`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create customer_arrived notification: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(NotificationEvents.CUSTOMER_ASSIGNED, { async: true })
  async onCustomerAssigned(event: CustomerAssignedEvent) {
    try {
      await this.notifications.create({
        recipientUserId: event.assignedToUserId,
        kind: "new_customer_assigned",
        title: "Nueva clienta asignada",
        body: "Se te asignó una clienta nueva. Revísala y dale la bienvenida.",
        actionUrl: `/customers/${event.customerId}`,
        customerId: event.customerId,
        groupKey: `new_customer_assigned:${event.customerId}:${event.assignedToUserId}`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create new_customer_assigned notification: ${(err as Error).message}`,
      );
    }
  }
}
