import { Injectable, Inject } from "@nestjs/common";
import { eq, gt, and } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { customerAiSummaries } from "@loreal/database";

export interface UpsertSummaryInput {
  customerId: string;
  summaryText: string;
  model: string;
  promptVersion: string;
  ttlMs: number;
}

@Injectable()
export class CustomerAiSummariesRepository {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async findFresh(customerId: string, now: Date = new Date()) {
    const [row] = await this.db
      .select()
      .from(customerAiSummaries)
      .where(
        and(
          eq(customerAiSummaries.customerId, customerId),
          gt(customerAiSummaries.expiresAt, now),
        ),
      );
    return row ?? null;
  }

  async upsert(input: UpsertSummaryInput) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlMs);

    await this.db
      .insert(customerAiSummaries)
      .values({
        customerId: input.customerId,
        summaryText: input.summaryText,
        model: input.model,
        promptVersion: input.promptVersion,
        generatedAt: now,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: customerAiSummaries.customerId,
        set: {
          summaryText: input.summaryText,
          model: input.model,
          promptVersion: input.promptVersion,
          generatedAt: now,
          expiresAt,
        },
      });
  }

  async invalidate(customerId: string): Promise<void> {
    await this.db
      .delete(customerAiSummaries)
      .where(eq(customerAiSummaries.customerId, customerId));
  }
}
