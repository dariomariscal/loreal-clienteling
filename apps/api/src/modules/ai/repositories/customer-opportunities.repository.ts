import { Injectable, Inject } from "@nestjs/common";
import { and, eq, desc, isNull } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { customerOpportunities, customers } from "@loreal/database";
import type { OpportunityReason } from "@loreal/contracts";

export interface InsertOpportunityInput {
  customerId: string;
  baUserId: string;
  forDate: string; // YYYY-MM-DD
  reason: OpportunityReason;
  summary: string;
  suggestedAction: string;
  suggestedMessageDraft?: string | null;
  priority: number;
}

@Injectable()
export class CustomerOpportunitiesRepository {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async insertMany(rows: InsertOpportunityInput[]): Promise<void> {
    if (!rows.length) return;
    await this.db.insert(customerOpportunities).values(rows);
  }

  async clearForDate(baUserId: string, forDate: string): Promise<void> {
    await this.db
      .delete(customerOpportunities)
      .where(
        and(
          eq(customerOpportunities.baUserId, baUserId),
          eq(customerOpportunities.forDate, forDate),
        ),
      );
  }

  async listForBa(baUserId: string, forDate: string, limit: number) {
    return this.db
      .select({
        id: customerOpportunities.id,
        customerId: customerOpportunities.customerId,
        baUserId: customerOpportunities.baUserId,
        forDate: customerOpportunities.forDate,
        reason: customerOpportunities.reason,
        summary: customerOpportunities.summary,
        suggestedAction: customerOpportunities.suggestedAction,
        suggestedMessageDraft: customerOpportunities.suggestedMessageDraft,
        priority: customerOpportunities.priority,
        dismissedAt: customerOpportunities.dismissedAt,
        actedAt: customerOpportunities.actedAt,
        createdAt: customerOpportunities.createdAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerLastContactAt: customers.lastContactAt,
        customerLastTransactionAt: customers.lastTransactionAt,
      })
      .from(customerOpportunities)
      .innerJoin(customers, eq(customers.id, customerOpportunities.customerId))
      .where(
        and(
          eq(customerOpportunities.baUserId, baUserId),
          eq(customerOpportunities.forDate, forDate),
          isNull(customerOpportunities.dismissedAt),
          isNull(customerOpportunities.actedAt),
        ),
      )
      .orderBy(desc(customerOpportunities.priority))
      .limit(limit);
  }

  async markDismissed(id: string): Promise<void> {
    await this.db
      .update(customerOpportunities)
      .set({ dismissedAt: new Date() })
      .where(eq(customerOpportunities.id, id));
  }

  async markActed(id: string): Promise<void> {
    await this.db
      .update(customerOpportunities)
      .set({ actedAt: new Date() })
      .where(eq(customerOpportunities.id, id));
  }
}
