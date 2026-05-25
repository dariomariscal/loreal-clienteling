import { Injectable, Inject } from "@nestjs/common";
import { and, eq, desc, isNull } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { suggestedActions, customers } from "@loreal/database";
import type { SuggestedActionTrigger } from "@loreal/contracts";

export interface InsertSuggestedActionInput {
  customerId: string;
  assignedToUserId: string;
  dueDate: string; // YYYY-MM-DD
  triggerType: SuggestedActionTrigger;
  description: string;
  recommendedAction: string;
  suggestedMessageDraft?: string | null;
  priority: number;
}

@Injectable()
export class SuggestedActionsRepository {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async insertMany(rows: InsertSuggestedActionInput[]): Promise<void> {
    if (!rows.length) return;
    await this.db.insert(suggestedActions).values(rows);
  }

  async clearForDate(assignedToUserId: string, dueDate: string): Promise<void> {
    await this.db
      .delete(suggestedActions)
      .where(
        and(
          eq(suggestedActions.assignedToUserId, assignedToUserId),
          eq(suggestedActions.dueDate, dueDate),
        ),
      );
  }

  async listForBa(assignedToUserId: string, dueDate: string, limit: number) {
    return this.db
      .select({
        id: suggestedActions.id,
        customerId: suggestedActions.customerId,
        assignedToUserId: suggestedActions.assignedToUserId,
        dueDate: suggestedActions.dueDate,
        triggerType: suggestedActions.triggerType,
        description: suggestedActions.description,
        recommendedAction: suggestedActions.recommendedAction,
        suggestedMessageDraft: suggestedActions.suggestedMessageDraft,
        priority: suggestedActions.priority,
        dismissedAt: suggestedActions.dismissedAt,
        completedAt: suggestedActions.completedAt,
        createdAt: suggestedActions.createdAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerLastInteractionAt: customers.lastInteractionAt,
        customerLastOrderAt: customers.lastOrderAt,
      })
      .from(suggestedActions)
      .innerJoin(customers, eq(customers.id, suggestedActions.customerId))
      .where(
        and(
          eq(suggestedActions.assignedToUserId, assignedToUserId),
          eq(suggestedActions.dueDate, dueDate),
          isNull(suggestedActions.dismissedAt),
          isNull(suggestedActions.completedAt),
        ),
      )
      .orderBy(desc(suggestedActions.priority))
      .limit(limit);
  }

  async markDismissed(id: string): Promise<void> {
    await this.db
      .update(suggestedActions)
      .set({ dismissedAt: new Date() })
      .where(eq(suggestedActions.id, id));
  }

  async markCompleted(id: string): Promise<void> {
    await this.db
      .update(suggestedActions)
      .set({ completedAt: new Date() })
      .where(eq(suggestedActions.id, id));
  }
}
