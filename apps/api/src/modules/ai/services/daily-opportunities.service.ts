import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, sql, isNotNull } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { customers, users } from "@loreal/database";
import { selectDailyOpportunities } from "@loreal/domain";
import type {
  OpportunitySignals,
  CustomerOpportunityWithCustomer,
} from "@loreal/contracts";
import { CustomerOpportunitiesRepository } from "../repositories/customer-opportunities.repository";

@Injectable()
export class DailyOpportunitiesService {
  private readonly logger = new Logger(DailyOpportunitiesService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    private readonly opportunitiesRepo: CustomerOpportunitiesRepository,
  ) {}

  async listForBa(
    baUserId: string,
    forDate: string,
    limit = 5,
  ): Promise<CustomerOpportunityWithCustomer[]> {
    const rows = await this.opportunitiesRepo.listForBa(baUserId, forDate, limit);
    return rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      baUserId: r.baUserId,
      forDate: r.forDate,
      reason: r.reason as CustomerOpportunityWithCustomer["reason"],
      summary: r.summary,
      suggestedAction: r.suggestedAction,
      suggestedMessageDraft: r.suggestedMessageDraft,
      priority: r.priority,
      dismissedAt: r.dismissedAt,
      actedAt: r.actedAt,
      createdAt: r.createdAt,
      customer: {
        id: r.customerId,
        firstName: r.customerFirstName,
        lastName: r.customerLastName,
        lastContactAt: r.customerLastContactAt,
        lastTransactionAt: r.customerLastTransactionAt,
      },
    }));
  }

  async dismiss(opportunityId: string): Promise<void> {
    await this.opportunitiesRepo.markDismissed(opportunityId);
  }

  async markActed(opportunityId: string): Promise<void> {
    await this.opportunitiesRepo.markActed(opportunityId);
  }

  /**
   * Cron entry-point. For every active BA, scan their book, build signals,
   * pick top N opportunities, replace the day's queue atomically.
   */
  async computeForDate(forDate: string): Promise<{ basProcessed: number }> {
    const activeBas = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.active, true));

    let basProcessed = 0;
    for (const ba of activeBas) {
      try {
        await this.computeForBa(ba.id, forDate);
        basProcessed++;
      } catch (err) {
        this.logger.error(`Failed for BA ${ba.id}`, err as Error);
      }
    }
    return { basProcessed };
  }

  private async computeForBa(baUserId: string, forDate: string): Promise<void> {
    const signals = await this.collectSignals(baUserId);
    const selected = selectDailyOpportunities({ signals, limit: 5 });

    await this.opportunitiesRepo.clearForDate(baUserId, forDate);

    if (!selected.length) return;

    await this.opportunitiesRepo.insertMany(
      selected.map((s) => ({
        customerId: s.customerId,
        baUserId,
        forDate,
        reason: s.reason,
        summary: s.rationale,
        suggestedAction: defaultActionFor(s.reason),
        suggestedMessageDraft: null,
        priority: s.priority,
      })),
    );
  }

  /**
   * Build a signals snapshot per customer assigned to this BA. Numbers come
   * from materialized data already in the DB — no LLM at this stage.
   */
  private async collectSignals(baUserId: string): Promise<OpportunitySignals[]> {
    const now = new Date();
    const rows = await this.db
      .select({
        id: customers.id,
        lifecycleSegment: customers.lifecycleSegment,
        lastContactAt: customers.lastContactAt,
        lastTransactionAt: customers.lastTransactionAt,
        birthDate: customers.birthDate,
      })
      .from(customers)
      .where(
        sql`${customers.lastBaUserId} = ${baUserId} AND ${customers.inactive} = false`,
      );

    return rows.map((c) => {
      const daysSinceLastContact = c.lastContactAt
        ? Math.floor(
            (now.getTime() - new Date(c.lastContactAt).getTime()) /
              (24 * 60 * 60 * 1000),
          )
        : undefined;
      const daysSinceLastTransaction = c.lastTransactionAt
        ? Math.floor(
            (now.getTime() - new Date(c.lastTransactionAt).getTime()) /
              (24 * 60 * 60 * 1000),
          )
        : undefined;
      const daysUntilBirthday = c.birthDate
        ? daysUntilNextBirthday(new Date(c.birthDate), now)
        : undefined;

      return {
        customerId: c.id,
        lifecycleSegment: c.lifecycleSegment,
        daysSinceLastContact,
        daysSinceLastTransaction,
        daysUntilBirthday,
      };
    });
  }
}

function daysUntilNextBirthday(birthDate: Date, now: Date): number {
  const next = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.floor((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function defaultActionFor(reason: string): string {
  switch (reason) {
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
    default:
      return "Contactar a la clienta";
  }
}
