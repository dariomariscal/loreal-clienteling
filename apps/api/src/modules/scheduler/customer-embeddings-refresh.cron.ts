import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { and, eq, gt, isNull, or, sql, asc } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type Database,
} from "../../config/database.provider";
import { customers, customerEmbeddings } from "@loreal/database";
import { CustomerEmbeddingService } from "../ai/services/customer-embedding.service";

const MAX_PER_RUN = 200;

/**
 * Nightly safety net: re-embed customers whose row changed after their
 * embedding was generated, plus any customer that has no embedding row at
 * all (e.g. the per-write listener failed). Capped so a backlog never
 * triggers an OpenAI bill spike — a true mass-backfill goes through
 * `scripts/backfill-customer-embeddings.ts` instead.
 */
@Injectable()
export class CustomerEmbeddingsRefreshCron {
  private readonly logger = new Logger(CustomerEmbeddingsRefreshCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly customerEmbeddings: CustomerEmbeddingService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async refreshStaleEmbeddings(): Promise<void> {
    const stale = await this.db
      .select({ id: customers.id })
      .from(customers)
      .leftJoin(
        customerEmbeddings,
        eq(customerEmbeddings.customerId, customers.id),
      )
      .where(
        and(
          eq(customers.isActive, true),
          or(
            isNull(customerEmbeddings.customerId),
            gt(customers.updatedAt, customerEmbeddings.generatedAt),
          ),
        ),
      )
      .orderBy(asc(sql`COALESCE(${customerEmbeddings.generatedAt}, 'epoch')`))
      .limit(MAX_PER_RUN);

    if (stale.length === 0) {
      this.logger.log("No stale customer embeddings to refresh.");
      return;
    }

    this.logger.log(
      `Refreshing ${stale.length} stale customer embeddings (cap ${MAX_PER_RUN})`,
    );

    let succeeded = 0;
    for (const row of stale) {
      try {
        await this.customerEmbeddings.embedCustomer(row.id);
        succeeded++;
      } catch (err) {
        this.logger.warn(
          `Failed to refresh embedding for customer ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    this.logger.log(
      `Customer embeddings refresh done: ${succeeded}/${stale.length} succeeded`,
    );
  }
}
