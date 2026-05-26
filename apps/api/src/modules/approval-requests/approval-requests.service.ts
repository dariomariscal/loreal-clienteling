import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { approvalRequests, users } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type {
  CreateApprovalRequestDto,
  DecideApprovalRequestDto,
  ApprovalRequestFiltersDto,
} from "../../dtos/approval-requests.dto";

@Injectable()
export class ApprovalRequestsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  async findAll(user: SessionUser, filters: ApprovalRequestFiltersDto) {
    const scope = await this.scopeService.scopeByStore(
      user,
      approvalRequests.storeId,
    );

    const conditions = [
      ...(scope ? [scope] : []),
      ...(filters.status ? [eq(approvalRequests.status, filters.status)] : []),
      ...(filters.type ? [eq(approvalRequests.type, filters.type)] : []),
      ...(filters.requestedByUserId
        ? [eq(approvalRequests.requestedByUserId, filters.requestedByUserId)]
        : []),
      ...(filters.customerId
        ? [eq(approvalRequests.customerId, filters.customerId)]
        : []),
    ];

    return this.db
      .select({
        id: approvalRequests.id,
        type: approvalRequests.type,
        status: approvalRequests.status,
        storeId: approvalRequests.storeId,
        brandId: approvalRequests.brandId,
        customerId: approvalRequests.customerId,
        requestedByUserId: approvalRequests.requestedByUserId,
        requestedByName: users.fullName,
        decidedByUserId: approvalRequests.decidedByUserId,
        reason: approvalRequests.reason,
        decisionNotes: approvalRequests.decisionNotes,
        payload: approvalRequests.payload,
        decidedAt: approvalRequests.decidedAt,
        expiresAt: approvalRequests.expiresAt,
        createdAt: approvalRequests.createdAt,
        updatedAt: approvalRequests.updatedAt,
      })
      .from(approvalRequests)
      .leftJoin(users, eq(approvalRequests.requestedByUserId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(approvalRequests.createdAt));
  }

  async findOne(id: string, user: SessionUser) {
    const [request] = await this.db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, id));
    if (!request) throw new NotFoundException("Approval request not found");

    await this.assertCanRead(request.storeId, user);
    return request;
  }

  async create(data: CreateApprovalRequestDto, user: SessionUser) {
    const storeId = this.scopeService.assertStore(user);

    const [request] = await this.db
      .insert(approvalRequests)
      .values({
        type: data.type,
        storeId,
        brandId: user.brandId ?? null,
        customerId: data.customerId ?? null,
        requestedByUserId: user.id,
        reason: data.reason ?? null,
        payload: data.payload,
        expiresAt: data.expiresAt ?? null,
      })
      .returning();

    await this.auditService.log(user, "create", "approval_request", request.id, {
      type: data.type,
      customerId: data.customerId,
    });

    return request;
  }

  async decide(
    id: string,
    data: DecideApprovalRequestDto,
    user: SessionUser,
  ) {
    if (
      user.role !== UserRole.COUNTER_MANAGER &&
      user.role !== UserRole.AREA_MANAGER &&
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException("Only managers can decide approvals");
    }

    const [request] = await this.db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, id));
    if (!request) throw new NotFoundException("Approval request not found");

    if (request.status !== "pending") {
      throw new BadRequestException(
        `Approval request is already ${request.status}`,
      );
    }

    await this.assertCanRead(request.storeId, user);

    // Counter Manager can only decide on requests from their own store/brand.
    if (user.role === UserRole.COUNTER_MANAGER) {
      if (
        request.storeId !== user.storeId ||
        (request.brandId && request.brandId !== user.brandId)
      ) {
        throw new ForbiddenException(
          "Counter Manager can only decide on their own counter's requests",
        );
      }
    }

    const newStatus = data.decision === "approve" ? "approved" : "rejected";

    const [updated] = await this.db
      .update(approvalRequests)
      .set({
        status: newStatus,
        decidedByUserId: user.id,
        decisionNotes: data.notes ?? null,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(approvalRequests.id, id))
      .returning();

    await this.auditService.log(
      user,
      `approval_${data.decision}`,
      "approval_request",
      id,
      { notes: data.notes },
    );

    return updated;
  }

  async cancel(id: string, user: SessionUser) {
    const [request] = await this.db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, id));
    if (!request) throw new NotFoundException("Approval request not found");

    if (request.status !== "pending") {
      throw new BadRequestException(
        `Cannot cancel a ${request.status} request`,
      );
    }

    // Requester can cancel their own; managers can cancel any in their scope.
    if (request.requestedByUserId !== user.id) {
      await this.assertCanDecide(request.storeId, user);
    }

    const [updated] = await this.db
      .update(approvalRequests)
      .set({
        status: "cancelled",
        decidedByUserId: user.id,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(approvalRequests.id, id))
      .returning();

    await this.auditService.log(user, "approval_cancelled", "approval_request", id);
    return updated;
  }

  private async assertCanRead(storeId: string, user: SessionUser) {
    if (user.role === UserRole.ADMIN) return;
    const accessibleStoreIds = await this.scopeService.getAccessibleStoreIds(user);
    if (!accessibleStoreIds.includes(storeId)) {
      throw new ForbiddenException("You do not have access to this request");
    }
  }

  private async assertCanDecide(storeId: string, user: SessionUser) {
    if (
      user.role !== UserRole.COUNTER_MANAGER &&
      user.role !== UserRole.AREA_MANAGER &&
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException("Only managers can act on this request");
    }
    await this.assertCanRead(storeId, user);
  }
}
