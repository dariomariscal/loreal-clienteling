import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { customers, users } from "@loreal/database";
import { selectDailySuggestedActions } from "@loreal/domain";
import type {
  SuggestedActionSignals,
  SuggestedActionWithCustomer,
  SuggestedActionTrigger,
} from "@loreal/contracts";
import { SuggestedActionsRepository } from "../repositories/suggested-actions.repository";

@Injectable()
export class DailySuggestedActionsService {
  private readonly logger = new Logger(DailySuggestedActionsService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    private readonly suggestedActionsRepo: SuggestedActionsRepository,
  ) {}

  async listForBa(
    assignedToUserId: string,
    dueDate: string,
    limit = 5,
  ): Promise<SuggestedActionWithCustomer[]> {
    const rows = await this.suggestedActionsRepo.listForBa(
      assignedToUserId,
      dueDate,
      limit,
    );
    return rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      assignedToUserId: r.assignedToUserId,
      dueDate: r.dueDate,
      triggerType: r.triggerType as SuggestedActionTrigger,
      description: r.description,
      recommendedAction: r.recommendedAction,
      suggestedMessageDraft: r.suggestedMessageDraft,
      priority: r.priority,
      dismissedAt: r.dismissedAt,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
      customer: {
        id: r.customerId,
        firstName: r.customerFirstName,
        lastName: r.customerLastName,
        lastInteractionAt: r.customerLastInteractionAt,
        lastOrderAt: r.customerLastOrderAt,
      },
    }));
  }

  async dismiss(suggestedActionId: string): Promise<void> {
    await this.suggestedActionsRepo.markDismissed(suggestedActionId);
  }

  async markCompleted(suggestedActionId: string): Promise<void> {
    await this.suggestedActionsRepo.markCompleted(suggestedActionId);
  }

  /**
   * Cron entry-point. For every active BA, scan their book, build signals,
   * pick top N suggested actions, replace the day's queue atomically.
   */
  async computeForDate(dueDate: string): Promise<{ basProcessed: number }> {
    const activeBas = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isActive, true));

    let basProcessed = 0;
    for (const ba of activeBas) {
      try {
        await this.computeForBa(ba.id, dueDate);
        basProcessed++;
      } catch (err) {
        this.logger.error(`Failed for BA ${ba.id}`, err as Error);
      }
    }
    return { basProcessed };
  }

  private async computeForBa(
    assignedToUserId: string,
    dueDate: string,
  ): Promise<void> {
    const signals = await this.collectSignals(assignedToUserId);
    const selected = selectDailySuggestedActions({ signals, limit: 5 });

    await this.suggestedActionsRepo.clearForDate(assignedToUserId, dueDate);

    if (!selected.length) return;

    await this.suggestedActionsRepo.insertMany(
      selected.map((s) => ({
        customerId: s.customerId,
        assignedToUserId,
        dueDate,
        triggerType: s.triggerType,
        description: s.rationale,
        recommendedAction: defaultRecommendedActionFor(s.triggerType),
        suggestedMessageDraft: null,
        priority: s.priority,
      })),
    );
  }

  /**
   * Build a signals snapshot per customer assigned to this BA. Numbers come
   * from materialized data already in the DB — no LLM at this stage.
   */
  private async collectSignals(
    assignedToUserId: string,
  ): Promise<SuggestedActionSignals[]> {
    const now = new Date();
    const rows = await this.db
      .select({
        id: customers.id,
        lifecycleStage: customers.lifecycleStage,
        lastInteractionAt: customers.lastInteractionAt,
        lastOrderAt: customers.lastOrderAt,
        birthday: customers.birthday,
      })
      .from(customers)
      .where(
        eq(customers.assignedToUserId, assignedToUserId),
      );

    return rows
      .filter((c) => c.id !== undefined)
      .map((c) => {
        const daysSinceLastInteraction = c.lastInteractionAt
          ? Math.floor(
              (now.getTime() - new Date(c.lastInteractionAt).getTime()) /
                (24 * 60 * 60 * 1000),
            )
          : undefined;
        const daysSinceLastOrder = c.lastOrderAt
          ? Math.floor(
              (now.getTime() - new Date(c.lastOrderAt).getTime()) /
                (24 * 60 * 60 * 1000),
            )
          : undefined;
        const daysUntilBirthday = c.birthday
          ? daysUntilNextBirthday(new Date(c.birthday), now)
          : undefined;

        return {
          customerId: c.id,
          lifecycleStage: c.lifecycleStage,
          daysSinceLastInteraction,
          daysSinceLastOrder,
          daysUntilBirthday,
        };
      });
  }
}

function daysUntilNextBirthday(birthday: Date, now: Date): number {
  const next = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.floor((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function defaultRecommendedActionFor(trigger: SuggestedActionTrigger): string {
  switch (trigger) {
    case "birthday":
      return "Mandarle un mensaje de cumpleaños";
    case "replenishment":
      return "Avisarle que es probable que necesite reabastecer";
    case "life_event":
      return "Hacer seguimiento del evento personal";
    case "vip_cadence":
      return "Saludar a clienta VIP para mantener relación";
    case "new_product_match":
      return "Sugerirle el nuevo producto que coincide con sus gustos";
    case "win_back":
      return "Reactivar contacto tras inactividad";
    case "abandoned_cart":
      return "Recordarle el carrito que dejó abierto";
    case "post_purchase":
      return "Hacer seguimiento post-compra";
    default:
      return "Contactar a la clienta";
  }
}
