import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, desc, gte } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customers,
  customerNotes,
  purchases,
  purchaseItems,
  products,
  appointments,
} from "@loreal/database";
import {
  buildCustomerSummaryPrompt,
  CUSTOMER_SUMMARY_PROMPT_VERSION,
} from "@loreal/domain";
import type { CustomerSummaryContext } from "@loreal/contracts";
import {
  LLM_PROVIDER,
  type LlmProvider,
} from "../providers/llm.provider.interface";
import { CustomerAiSummariesRepository } from "../repositories/customer-ai-summaries.repository";
import { AiUsageLogsRepository } from "../repositories/ai-usage-logs.repository";
import { estimateCostUsd } from "../pricing";

const SUMMARY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FEATURE = "customer_summary";

@Injectable()
export class CustomerSummaryService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(LLM_PROVIDER) private llm: LlmProvider,
    private readonly summariesRepo: CustomerAiSummariesRepository,
    private readonly usageLogs: AiUsageLogsRepository,
  ) {}

  /**
   * Returns a fresh cached summary if available, otherwise generates one
   * and persists it. Cache is keyed by customer + prompt version, so a
   * prompt change invalidates without manual ops.
   */
  async getOrGenerate(customerId: string, actorUserId: string | null) {
    const cached = await this.summariesRepo.findFresh(customerId);
    if (cached && cached.promptVersion === CUSTOMER_SUMMARY_PROMPT_VERSION) {
      return cached;
    }
    return this.generate(customerId, actorUserId);
  }

  async generate(customerId: string, actorUserId: string | null) {
    const context = await this.buildContext(customerId);
    const prompt = buildCustomerSummaryPrompt(context);

    const result = await this.llm.generate({
      system: prompt.system,
      user: prompt.user,
      feature: FEATURE,
      maxOutputTokens: 256,
      temperature: 0.4,
    });

    await this.summariesRepo.upsert({
      customerId,
      summaryText: result.text.trim(),
      model: result.model,
      promptVersion: prompt.promptVersion,
      ttlMs: SUMMARY_TTL_MS,
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

    const fresh = await this.summariesRepo.findFresh(customerId);
    if (!fresh) {
      throw new Error("Failed to persist generated summary");
    }
    return fresh;
  }

  async invalidate(customerId: string): Promise<void> {
    await this.summariesRepo.invalidate(customerId);
  }

  private async buildContext(
    customerId: string,
  ): Promise<CustomerSummaryContext> {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) throw new NotFoundException("Customer not found");

    const now = Date.now();
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    const recentNotes = await this.db
      .select({ body: customerNotes.body, createdAt: customerNotes.createdAt })
      .from(customerNotes)
      .where(eq(customerNotes.customerId, customerId))
      .orderBy(desc(customerNotes.createdAt))
      .limit(5);

    const recentPurchases = await this.db
      .select({
        productName: products.name,
        purchasedAt: purchases.purchasedAt,
        price: purchaseItems.unitPrice,
      })
      .from(purchaseItems)
      .innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
      .innerJoin(products, eq(products.id, purchaseItems.productId))
      .where(
        and(
          eq(purchases.customerId, customerId),
          gte(purchases.purchasedAt, ninetyDaysAgo),
        ),
      )
      .orderBy(desc(purchases.purchasedAt))
      .limit(5);

    const upcoming = await this.db
      .select({
        scheduledAt: appointments.scheduledAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.customerId, customerId),
          gte(appointments.scheduledAt, new Date()),
        ),
      )
      .orderBy(appointments.scheduledAt)
      .limit(1);

    const ageYears = customer.birthDate
      ? Math.floor(
          (now - new Date(customer.birthDate).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : undefined;

    const lastVisitDaysAgo = customer.lastTransactionAt
      ? Math.floor(
          (now - new Date(customer.lastTransactionAt).getTime()) /
            (24 * 60 * 60 * 1000),
        )
      : undefined;

    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      ageYears,
      customerSince: new Date(customer.customerSince),
      lifecycleSegment: customer.lifecycleSegment,
      lastVisitDaysAgo,
      recentPurchases: recentPurchases.map((p) => ({
        productName: p.productName,
        daysAgo: Math.floor(
          (now - new Date(p.purchasedAt).getTime()) / (24 * 60 * 60 * 1000),
        ),
        price: Number(p.price),
      })),
      recentNotes: recentNotes.map((n) => ({
        body: n.body,
        daysAgo: Math.floor(
          (now - new Date(n.createdAt).getTime()) / (24 * 60 * 60 * 1000),
        ),
      })),
      upcomingAppointment: upcoming[0]
        ? { whenIso: new Date(upcoming[0].scheduledAt).toISOString() }
        : undefined,
    };
  }
}
