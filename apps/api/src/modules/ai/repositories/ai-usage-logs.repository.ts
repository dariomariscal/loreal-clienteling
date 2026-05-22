import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { aiUsageLogs } from "@loreal/database";

export interface RecordUsageInput {
  userId: string | null;
  feature: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  latencyMs: number;
  costUsd: number;
  status?: "success" | "error";
  errorCode?: string | null;
}

@Injectable()
export class AiUsageLogsRepository {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async record(input: RecordUsageInput): Promise<void> {
    await this.db.insert(aiUsageLogs).values({
      userId: input.userId,
      feature: input.feature,
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cachedTokens: input.cachedTokens ?? 0,
      latencyMs: input.latencyMs,
      costUsd: input.costUsd.toFixed(6),
      status: input.status ?? "success",
      errorCode: input.errorCode ?? null,
    });
  }
}
