import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, count, eq, sql } from "drizzle-orm";
import { brands, stores, users, zones } from "@loreal/database";
import {
  DATABASE_TOKEN,
  type Database,
} from "../../config/database.provider";
import {
  CLERK_CLIENT,
  type ClerkClient,
} from "../../integrations/clerk/clerk.provider";
import { AuditService } from "../../common/services/audit.service";
import { ScopeService } from "../../common/services/scope.service";
import type { SessionUser } from "../../common/types/session";

interface UserFilters {
  role?: string;
  storeId?: string;
  zoneId?: string;
  brandId?: string;
  active?: boolean;
  invitationStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface InviteUserData {
  email: string;
  fullName: string;
  role: string;
  storeId?: string;
  zoneId?: string;
  brandId?: string;
}

interface UpdateUserData {
  role?: string;
  storeId?: string | null;
  zoneId?: string | null;
  brandId?: string | null;
  active?: boolean;
  fullName?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    @Inject(ScopeService) private readonly scopeService: ScopeService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(CLERK_CLIENT) private readonly clerk: ClerkClient,
  ) {}

  async findAll(user: SessionUser, filters: UserFilters = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (user.role === "manager") {
      if (user.storeId) conditions.push(eq(users.storeId, user.storeId));
    } else if (user.role === "supervisor") {
      const storeIds = await this.scopeService.getAccessibleStoreIds(user);
      if (storeIds.length > 0) {
        conditions.push(
          sql`${users.storeId} IN (${sql.join(
            storeIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
      }
    }

    if (filters.role) conditions.push(eq(users.role, filters.role));
    if (filters.storeId) conditions.push(eq(users.storeId, filters.storeId));
    if (filters.zoneId) conditions.push(eq(users.zoneId, filters.zoneId));
    if (filters.brandId) conditions.push(eq(users.brandId, filters.brandId));
    if (filters.active !== undefined) conditions.push(eq(users.active, filters.active));
    if (filters.invitationStatus) conditions.push(eq(users.invitationStatus, filters.invitationStatus));
    if (filters.search) {
      conditions.push(
        sql`(${users.fullName} ILIKE ${`%${filters.search}%`} OR ${users.email} ILIKE ${`%${filters.search}%`})`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(users)
      .where(where);

    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        storeId: users.storeId,
        storeName: stores.displayName,
        zoneId: users.zoneId,
        zoneName: zones.displayName,
        brandId: users.brandId,
        brandName: brands.displayName,
        active: users.active,
        invitationStatus: users.invitationStatus,
        invitedAt: users.invitedAt,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(stores, sql`${users.storeId}::uuid = ${stores.id}`)
      .leftJoin(zones, sql`${users.zoneId}::uuid = ${zones.id}`)
      .leftJoin(brands, sql`${users.brandId}::uuid = ${brands.id}`)
      .where(where)
      .orderBy(users.fullName)
      .limit(limit)
      .offset(offset);

    return { data: rows, total: totalResult?.count ?? 0, page, limit };
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        storeId: users.storeId,
        storeName: stores.displayName,
        zoneId: users.zoneId,
        zoneName: zones.displayName,
        brandId: users.brandId,
        brandName: brands.displayName,
        active: users.active,
        invitationStatus: users.invitationStatus,
        invitedAt: users.invitedAt,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(stores, sql`${users.storeId}::uuid = ${stores.id}`)
      .leftJoin(zones, sql`${users.zoneId}::uuid = ${zones.id}`)
      .leftJoin(brands, sql`${users.brandId}::uuid = ${brands.id}`)
      .where(eq(users.id, id));

    if (!row) throw new NotFoundException("User not found");
    return row;
  }

  /**
   * Send a Clerk invitation. The user sets their own password through the
   * invitation link; the local row is created by the `user.created` webhook
   * once they accept. We pre-record a pending placeholder so admins can see
   * the invite in listings before acceptance.
   */
  async invite(data: InviteUserData, invitedBy: SessionUser) {
    if (!data.email.toLowerCase().endsWith("@loreal.mx")) {
      throw new ConflictException("El correo debe terminar en @loreal.mx");
    }

    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()));
    if (existing) {
      throw new ConflictException("Ya existe un usuario con ese correo");
    }

    // Auto-derive zone from store when not provided explicitly.
    let zoneId = data.zoneId;
    if (data.storeId && !zoneId) {
      const [store] = await this.db
        .select({ zoneId: stores.zoneId })
        .from(stores)
        .where(eq(stores.id, data.storeId));
      if (store?.zoneId) zoneId = store.zoneId;
    }

    const publicMetadata = {
      role: data.role,
      fullName: data.fullName,
      storeId: data.storeId ?? null,
      zoneId: zoneId ?? null,
      brandId: data.brandId ?? null,
      active: true,
      invitationStatus: "pending",
      invitedByUserId: invitedBy.id,
    };

    const invitation = await this.clerk.invitations.createInvitation({
      emailAddress: data.email.toLowerCase(),
      publicMetadata,
      redirectUrl: process.env.CLERK_INVITATION_REDIRECT_URL,
    });

    await this.auditService.log(
      invitedBy,
      "user_invited",
      "user",
      invitation.id,
      { email: data.email, role: data.role },
    );

    return {
      invitationId: invitation.id,
      email: data.email,
      status: "pending" as const,
    };
  }

  async update(id: string, data: UpdateUserData, updatedBy: SessionUser) {
    const existing = await this.findOne(id);

    const updateValues: Record<string, unknown> = {};
    if (data.role !== undefined) updateValues.role = data.role;
    if (data.storeId !== undefined) updateValues.storeId = data.storeId;
    if (data.zoneId !== undefined) updateValues.zoneId = data.zoneId;
    if (data.brandId !== undefined) updateValues.brandId = data.brandId;
    if (data.active !== undefined) updateValues.active = data.active;
    if (data.fullName !== undefined) updateValues.fullName = data.fullName;

    if (Object.keys(updateValues).length === 0) return existing;

    await this.db.update(users).set(updateValues).where(eq(users.id, id));

    // Mirror business fields onto Clerk so the JWT carries the latest values.
    const metadataPatch: Record<string, unknown> = {};
    for (const key of ["role", "storeId", "zoneId", "brandId", "active", "fullName"] as const) {
      if (data[key] !== undefined) metadataPatch[key] = data[key];
    }
    if (Object.keys(metadataPatch).length > 0) {
      await this.clerk.users.updateUser(id, {
        publicMetadata: { ...metadataPatch },
      });
    }
    if (data.fullName !== undefined) {
      const [firstName, ...rest] = data.fullName.split(" ");
      await this.clerk.users.updateUser(id, {
        firstName,
        lastName: rest.join(" ") || undefined,
      });
    }

    await this.auditService.log(updatedBy, "user_updated", "user", id, updateValues);

    return this.findOne(id);
  }

  /**
   * Revoke a pending Clerk invitation. For already-accepted users use
   * `update(id, { active: false })`.
   */
  async revokeInvitation(invitationId: string, requester: SessionUser) {
    if (requester.role !== "admin") {
      throw new ForbiddenException("Solo administradores pueden revocar invitaciones");
    }
    await this.clerk.invitations.revokeInvitation(invitationId);
    await this.auditService.log(
      requester,
      "user_invitation_revoked",
      "user",
      invitationId,
    );
    return { invitationId, status: "revoked" as const };
  }
}
