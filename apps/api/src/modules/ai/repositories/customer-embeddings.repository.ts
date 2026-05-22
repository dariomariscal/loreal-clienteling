import { Injectable, Inject } from "@nestjs/common";
import { sql, eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customerEmbeddings,
  customerNoteEmbeddings,
  customers,
} from "@loreal/database";

export interface UpsertEmbeddingInput {
  id: string;
  embedding: number[];
  model: string;
}

export interface VectorSearchHit {
  customerId: string;
  similarity: number;
  firstName: string;
  lastName: string;
}

@Injectable()
export class CustomerEmbeddingsRepository {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async upsertCustomer(input: UpsertEmbeddingInput): Promise<void> {
    await this.db
      .insert(customerEmbeddings)
      .values({
        customerId: input.id,
        embedding: input.embedding,
        model: input.model,
      })
      .onConflictDoUpdate({
        target: customerEmbeddings.customerId,
        set: {
          embedding: input.embedding,
          model: input.model,
          generatedAt: new Date(),
        },
      });
  }

  async upsertNote(input: UpsertEmbeddingInput): Promise<void> {
    await this.db
      .insert(customerNoteEmbeddings)
      .values({
        customerNoteId: input.id,
        embedding: input.embedding,
        model: input.model,
      })
      .onConflictDoUpdate({
        target: customerNoteEmbeddings.customerNoteId,
        set: {
          embedding: input.embedding,
          model: input.model,
          generatedAt: new Date(),
        },
      });
  }

  /**
   * Cosine-distance nearest-neighbor over customer profile embeddings.
   * Returns `similarity` in 0..1 (1 = identical) so the UI can sort and
   * threshold without knowing the metric.
   */
  async searchCustomers(
    queryVector: number[],
    limit: number,
  ): Promise<VectorSearchHit[]> {
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const rows = await this.db
      .select({
        customerId: customerEmbeddings.customerId,
        distance: sql<number>`${customerEmbeddings.embedding} <=> ${vectorLiteral}::vector`,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .from(customerEmbeddings)
      .innerJoin(customers, eq(customers.id, customerEmbeddings.customerId))
      .orderBy(sql`${customerEmbeddings.embedding} <=> ${vectorLiteral}::vector`)
      .limit(limit);

    return rows.map((r) => ({
      customerId: r.customerId,
      similarity: 1 - Number(r.distance),
      firstName: r.firstName,
      lastName: r.lastName,
    }));
  }
}
