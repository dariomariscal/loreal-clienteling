import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { and, eq, desc, gte, lte, isNull, not, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { suggestedActions, customers } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type {
  ListTasksQueryDto,
  SnoozeTaskDto,
  TaskStatusFilter,
} from "../../dtos/tasks.dto";

@Injectable()
export class TasksService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  async list(query: ListTasksQueryDto, user: SessionUser) {
    const status: TaskStatusFilter = query.status ?? "pending";

    const conditions = [eq(suggestedActions.assignedToUserId, user.id)];

    if (status === "pending") {
      conditions.push(isNull(suggestedActions.dismissedAt));
      conditions.push(isNull(suggestedActions.completedAt));
    } else if (status === "dismissed") {
      conditions.push(not(isNull(suggestedActions.dismissedAt)));
    } else if (status === "completed") {
      conditions.push(not(isNull(suggestedActions.completedAt)));
    }

    if (query.customerId) {
      conditions.push(eq(suggestedActions.customerId, query.customerId));
    }
    if (query.dueOn) {
      conditions.push(eq(suggestedActions.dueDate, query.dueOn));
    }
    if (query.dueFrom) {
      conditions.push(gte(suggestedActions.dueDate, query.dueFrom));
    }
    if (query.dueTo) {
      conditions.push(lte(suggestedActions.dueDate, query.dueTo));
    }
    if (query.triggerType) {
      conditions.push(eq(suggestedActions.triggerType, query.triggerType));
    }

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
        productId: suggestedActions.productId,
        serviceTypeId: suggestedActions.serviceTypeId,
        priority: suggestedActions.priority,
        expiresAt: suggestedActions.expiresAt,
        dismissedAt: suggestedActions.dismissedAt,
        completedAt: suggestedActions.completedAt,
        createdAt: suggestedActions.createdAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerTier: customers.loyaltyTier,
      })
      .from(suggestedActions)
      .innerJoin(customers, eq(customers.id, suggestedActions.customerId))
      .where(and(...conditions))
      .orderBy(desc(suggestedActions.priority), suggestedActions.dueDate)
      .limit(query.limit ?? 50);
  }

  async counts(user: SessionUser) {
    const [row] = await this.db
      .select({
        pending: sql<number>`count(*) filter (where ${suggestedActions.dismissedAt} is null and ${suggestedActions.completedAt} is null)`,
        completed: sql<number>`count(*) filter (where ${suggestedActions.completedAt} is not null)`,
        dismissed: sql<number>`count(*) filter (where ${suggestedActions.dismissedAt} is not null)`,
      })
      .from(suggestedActions)
      .where(eq(suggestedActions.assignedToUserId, user.id));

    return {
      pending: Number(row?.pending ?? 0),
      completed: Number(row?.completed ?? 0),
      dismissed: Number(row?.dismissed ?? 0),
    };
  }

  async findOne(id: string, user: SessionUser) {
    const [task] = await this.db
      .select()
      .from(suggestedActions)
      .where(
        and(
          eq(suggestedActions.id, id),
          eq(suggestedActions.assignedToUserId, user.id),
        ),
      );
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  async complete(id: string, user: SessionUser) {
    const task = await this.findOne(id, user);
    const [updated] = await this.db
      .update(suggestedActions)
      .set({ completedAt: new Date() })
      .where(eq(suggestedActions.id, id))
      .returning();

    await this.auditService.log(user, "complete", "task", id, {
      customerId: task.customerId,
      triggerType: task.triggerType,
    });

    return updated;
  }

  async dismiss(id: string, user: SessionUser) {
    const task = await this.findOne(id, user);
    const [updated] = await this.db
      .update(suggestedActions)
      .set({ dismissedAt: new Date() })
      .where(eq(suggestedActions.id, id))
      .returning();

    await this.auditService.log(user, "dismiss", "task", id, {
      customerId: task.customerId,
      triggerType: task.triggerType,
    });

    return updated;
  }

  async snooze(id: string, data: SnoozeTaskDto, user: SessionUser) {
    const task = await this.findOne(id, user);
    const [updated] = await this.db
      .update(suggestedActions)
      .set({ dueDate: data.dueDate })
      .where(eq(suggestedActions.id, id))
      .returning();

    await this.auditService.log(user, "snooze", "task", id, {
      customerId: task.customerId,
      newDueDate: data.dueDate,
    });

    return updated;
  }

  async reopen(id: string, user: SessionUser) {
    await this.findOne(id, user);
    const [updated] = await this.db
      .update(suggestedActions)
      .set({ dismissedAt: null, completedAt: null })
      .where(eq(suggestedActions.id, id))
      .returning();

    return updated;
  }
}
