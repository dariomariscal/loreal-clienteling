import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { customers, communications } from "@loreal/database";
import { buildMessageSuggestionPrompt } from "@loreal/domain";
import type { MessageSuggestion } from "@loreal/contracts";
import {
  LLM_PROVIDER,
  type LlmProvider,
} from "../providers/llm.provider.interface";
import { CustomerAiSummariesRepository } from "../repositories/customer-ai-summaries.repository";
import { AiUsageLogsRepository } from "../repositories/ai-usage-logs.repository";
import { estimateCostUsd } from "../pricing";

const FEATURE = "message_suggestion";
const SUGGESTION_MODEL_ENV = "ANTHROPIC_SUGGESTION_MODEL";

@Injectable()
export class MessageSuggestionService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(LLM_PROVIDER) private llm: LlmProvider,
    private readonly summariesRepo: CustomerAiSummariesRepository,
    private readonly usageLogs: AiUsageLogsRepository,
  ) {}

  async generate(
    customerId: string,
    actorUserId: string,
  ): Promise<MessageSuggestion[]> {
    const [customer] = await this.db
      .select({ firstName: customers.firstName })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) throw new NotFoundException("Customer not found");

    const recent = await this.db
      .select({
        body: communications.body,
        direction: communications.direction,
        sentAt: communications.sentAt,
      })
      .from(communications)
      .where(eq(communications.customerId, customerId))
      .orderBy(desc(communications.sentAt))
      .limit(10);

    const cachedSummary = await this.summariesRepo.findFresh(customerId);

    const prompt = buildMessageSuggestionPrompt({
      customerFirstName: customer.firstName,
      recentMessages: recent
        .reverse()
        .map((m) => ({
          body: m.body,
          direction: m.direction as "outbound" | "inbound",
          sentAt: new Date(m.sentAt),
        })),
      customerContextSummary: cachedSummary?.summaryText,
    });

    const result = await this.llm.generate({
      system: prompt.system,
      user: prompt.user,
      feature: FEATURE,
      modelOverride: process.env[SUGGESTION_MODEL_ENV] ?? undefined,
      maxOutputTokens: 600,
      temperature: 0.6,
    });

    await this.usageLogs.record({
      userId: actorUserId,
      feature: FEATURE,
      provider: "anthropic",
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cachedTokens: result.cachedTokens,
      latencyMs: result.latencyMs,
      costUsd: estimateCostUsd(
        result.model,
        result.inputTokens,
        result.outputTokens,
        result.cachedTokens,
      ),
    });

    return parseSuggestions(result.text);
  }
}

function parseSuggestions(raw: string): MessageSuggestion[] {
  const cleaned = stripCodeFence(raw).trim();
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return [];
  }
  const arr = Array.isArray(json)
    ? json
    : Array.isArray((json as { suggestions?: unknown }).suggestions)
      ? (json as { suggestions: unknown[] }).suggestions
      : [];
  return arr
    .filter(
      (s): s is { intent: string; text: string; rationale?: string } =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as { text?: unknown }).text === "string" &&
        typeof (s as { intent?: unknown }).intent === "string",
    )
    .slice(0, 3)
    .map((s) => ({
      intent: s.intent as MessageSuggestion["intent"],
      text: s.text,
      rationale: s.rationale,
    }));
}

function stripCodeFence(text: string): string {
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/m;
  const match = text.trim().match(fence);
  return match ? match[1] : text;
}
