import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, count, eq, sql } from "drizzle-orm";
import { brandStores, brands, stores, users, zones } from "@loreal/database";
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
import { generateTemporaryPassword } from "../../common/services/password-generator";
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

interface CreateDirectUserData extends InviteUserData {}

interface CreateDirectUserResult {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  password: string;
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
      if (storeIds.length === 0) {
        conditions.push(sql`false`);
      } else {
        conditions.push(
          sql`${users.storeId} IN (${sql.join(
            storeIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
      }
      if (user.brandId) {
        conditions.push(
          sql`(${users.brandId} = ${user.brandId} OR ${users.brandId} IS NULL)`,
        );
      }
    }

    if (filters.role) conditions.push(eq(users.role, filters.role));
    if (filters.storeId) conditions.push(eq(users.storeId, filters.storeId));
    if (filters.zoneId) conditions.push(eq(users.zoneId, filters.zoneId));
    if (filters.brandId) conditions.push(eq(users.brandId, filters.brandId));
    if (filters.active !== undefined)
      conditions.push(eq(users.isActive, filters.active));
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
        avatarUrl: users.avatarUrl,
        role: users.role,
        storeId: users.storeId,
        storeName: stores.displayName,
        zoneId: users.zoneId,
        zoneName: zones.displayName,
        brandId: users.brandId,
        brandName: brands.displayName,
        isActive: users.isActive,
        invitationStatus: users.invitationStatus,
        invitedAt: users.invitedAt,
        lastSignInAt: users.lastSignInAt,
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
        avatarUrl: users.avatarUrl,
        role: users.role,
        storeId: users.storeId,
        storeName: stores.displayName,
        zoneId: users.zoneId,
        zoneName: zones.displayName,
        brandId: users.brandId,
        brandName: brands.displayName,
        isActive: users.isActive,
        invitationStatus: users.invitationStatus,
        invitedAt: users.invitedAt,
        lastSignInAt: users.lastSignInAt,
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
    const email = await this.assertNewLorealEmail(data.email);
    const scope = await this.resolveAssignmentScope(data);

    const publicMetadata = {
      role: data.role,
      fullName: data.fullName,
      storeId: scope.storeId,
      zoneId: scope.zoneId,
      brandId: scope.brandId,
      isActive: true,
      invitationStatus: "pending",
      invitedByUserId: invitedBy.id,
    };

    const invitation = await this.clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata,
      redirectUrl: process.env.CLERK_INVITATION_REDIRECT_URL,
    });

    await this.auditService.log(
      invitedBy,
      "user_invited",
      "user",
      invitation.id,
      { email, role: data.role },
    );

    return {
      invitationId: invitation.id,
      email,
      status: "pending" as const,
    };
  }

  /**
   * Creates a Clerk user directly (no invitation email) with a generated
   * password. The plaintext is returned ONCE in the response so the admin
   * can hand it off — it is never persisted locally. We also write the
   * local mirror row synchronously so the admin's listing refresh sees the
   * new user immediately; the `user.created` webhook still arrives later
   * and its onConflictDoUpdate makes both writes safe.
   */
  async createDirect(
    data: CreateDirectUserData,
    createdBy: SessionUser,
  ): Promise<CreateDirectUserResult> {
    const email = await this.assertNewLorealEmail(data.email);
    const scope = await this.resolveAssignmentScope(data);

    const [firstName, ...rest] = data.fullName.trim().split(/\s+/);
    const lastName = rest.join(" ") || undefined;

    const password = generateTemporaryPassword();

    const clerkUser = await this.clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
      publicMetadata: {
        role: data.role,
        fullName: data.fullName,
        storeId: scope.storeId,
        zoneId: scope.zoneId,
        brandId: scope.brandId,
        isActive: true,
        invitationStatus: "accepted",
        invitedByUserId: createdBy.id,
      },
    });

    await this.db
      .insert(users)
      .values({
        id: clerkUser.id,
        email,
        fullName: data.fullName,
        role: data.role,
        storeId: scope.storeId,
        zoneId: scope.zoneId,
        brandId: scope.brandId,
        isActive: true,
        invitationStatus: "accepted",
        invitedByUserId: createdBy.id,
      })
      .onConflictDoNothing({ target: users.id });

    await this.auditService.log(
      createdBy,
      "user_created_direct",
      "user",
      clerkUser.id,
      { email, role: data.role, storeId: scope.storeId, brandId: scope.brandId },
    );

    return {
      userId: clerkUser.id,
      email,
      fullName: data.fullName,
      role: data.role,
      password,
    };
  }

  /**
   * Self-service profile update. The caller can only edit their own
   * `fullName` — role/scope/active are admin-only and email is immutable.
   * Avatar and password go through Clerk's client SDK directly (the
   * `user.updated` webhook propagates the new imageUrl back to this mirror).
   */
  async updateSelf(user: SessionUser, data: { fullName?: string }) {
    if (!data.fullName) return this.findOne(user.id);

    const fullName = data.fullName.trim();
    if (!fullName) throw new ConflictException("El nombre no puede estar vacío");

    await this.db
      .update(users)
      .set({ fullName })
      .where(eq(users.id, user.id));

    // CRITICAL: `clerk.users.updateUser({ publicMetadata })` REPLACES the
    // whole metadata object, it does not merge. Without spreading the
    // existing values we'd wipe out role/storeId/zoneId/brandId — which
    // would then propagate back through the user.updated webhook and
    // strand the user with no scope. Read-modify-write here.
    const [firstName, ...rest] = fullName.split(/\s+/);
    const existing = await this.clerk.users.getUser(user.id);
    await this.clerk.users.updateUser(user.id, {
      firstName,
      lastName: rest.join(" ") || undefined,
      publicMetadata: { ...existing.publicMetadata, fullName },
    });

    await this.auditService.log(user, "user_self_updated", "user", user.id, {
      fullName,
    });

    return this.findOne(user.id);
  }

  async update(id: string, data: UpdateUserData, updatedBy: SessionUser) {
    const existing = await this.findOne(id);

    const nextRole = data.role ?? existing.role;
    if (nextRole === "supervisor") {
      const nextZoneId = data.zoneId !== undefined ? data.zoneId : existing.zoneId;
      const nextBrandId = data.brandId !== undefined ? data.brandId : existing.brandId;
      if (!nextZoneId) throw new ConflictException("Un supervisor requiere zoneId");
      if (!nextBrandId) throw new ConflictException("Un supervisor requiere brandId");
    }

    if (data.brandId) await this.assertBrandExists(data.brandId);
    if (data.zoneId) await this.assertZoneExists(data.zoneId);
    if (data.storeId) await this.assertStoreExists(data.storeId);

    const updateValues: Record<string, unknown> = {};
    if (data.role !== undefined) updateValues.role = data.role;
    if (data.storeId !== undefined) updateValues.storeId = data.storeId;
    if (data.zoneId !== undefined) updateValues.zoneId = data.zoneId;
    if (data.brandId !== undefined) updateValues.brandId = data.brandId;
    if (data.active !== undefined) updateValues.isActive = data.active;
    if (data.fullName !== undefined) updateValues.fullName = data.fullName;

    if (Object.keys(updateValues).length === 0) return existing;

    await this.db.update(users).set(updateValues).where(eq(users.id, id));

    // Mirror business fields onto Clerk so the JWT carries the latest values.
    // `updateUser({ publicMetadata })` REPLACES the metadata object — we have
    // to spread the existing one in or any field not in `metadataPatch` (e.g.
    // invitationStatus, invitedByUserId) gets wiped, then propagated back
    // through the user.updated webhook as nulls.
    const metadataPatch: Record<string, unknown> = {};
    for (const key of ["role", "storeId", "zoneId", "brandId", "active", "fullName"] as const) {
      if (data[key] !== undefined) {
        // Clerk metadata keeps the legacy `active` key; the local mirror uses `isActive`.
        metadataPatch[key === "active" ? "isActive" : key] = data[key];
      }
    }
    const needsMetadataPatch = Object.keys(metadataPatch).length > 0;
    const needsNameUpdate = data.fullName !== undefined;

    if (needsMetadataPatch || needsNameUpdate) {
      const existing = await this.clerk.users.getUser(id);
      const updatePayload: {
        firstName?: string;
        lastName?: string;
        publicMetadata?: Record<string, unknown>;
      } = {};
      if (needsMetadataPatch) {
        updatePayload.publicMetadata = {
          ...existing.publicMetadata,
          ...metadataPatch,
        };
      }
      if (needsNameUpdate) {
        const [firstName, ...rest] = (data.fullName ?? "").split(" ");
        updatePayload.firstName = firstName;
        updatePayload.lastName = rest.join(" ") || undefined;
      }
      await this.clerk.users.updateUser(id, updatePayload);
    }

    await this.auditService.log(updatedBy, "user_updated", "user", id, updateValues);

    return this.findOne(id);
  }

  /**
   * Resets a user's password to a freshly generated one and signs out all
   * other active sessions so the previous password stops working. The
   * plaintext is returned ONCE and never persisted.
   */
  async resetPassword(id: string, requester: SessionUser) {
    const existing = await this.findOne(id);
    const password = generateTemporaryPassword();

    await this.clerk.users.updateUser(id, {
      password,
      signOutOfOtherSessions: true,
    });

    await this.auditService.log(
      requester,
      "user_password_reset",
      "user",
      id,
    );

    return {
      userId: id,
      email: existing.email,
      fullName: existing.fullName,
      password,
    };
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

  private async assertNewLorealEmail(rawEmail: string): Promise<string> {
    const email = rawEmail.trim().toLowerCase();
    if (!email.endsWith("@loreal.mx")) {
      throw new ConflictException("El correo debe terminar en @loreal.mx");
    }
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existing) {
      throw new ConflictException("Ya existe un usuario con ese correo");
    }
    return email;
  }

  /**
   * Resolves the {storeId, zoneId, brandId} a new user should be assigned to.
   *
   * Rules:
   * - ba/manager: storeId is required. zoneId is auto-derived from the store
   *   when not provided. brandId, if provided, must belong to brandStores of
   *   that store; if omitted and the store sells exactly one brand, that
   *   brand is auto-picked.
   * - supervisor: zoneId AND brandId are required (a storeId is ignored —
   *   supervisors roam across all stores in the zone that carry their brand).
   * - admin: no scope fields apply.
   */
  private async resolveAssignmentScope(
    data: InviteUserData,
  ): Promise<{ storeId: string | null; zoneId: string | null; brandId: string | null }> {
    if (data.role === "admin") {
      return { storeId: null, zoneId: null, brandId: null };
    }

    if (data.role === "supervisor") {
      if (!data.zoneId) {
        throw new ConflictException("Un supervisor requiere zoneId");
      }
      if (!data.brandId) {
        throw new ConflictException("Un supervisor requiere brandId");
      }
      await this.assertZoneExists(data.zoneId);
      await this.assertBrandExists(data.brandId);
      return { storeId: null, zoneId: data.zoneId, brandId: data.brandId };
    }

    // ba | manager
    if (!data.storeId) {
      throw new ConflictException("Este rol requiere storeId");
    }

    const [store] = await this.db
      .select({ id: stores.id, zoneId: stores.zoneId })
      .from(stores)
      .where(eq(stores.id, data.storeId));
    if (!store) {
      throw new NotFoundException("Sucursal no encontrada");
    }

    const storeBrands = await this.db
      .select({ brandId: brandStores.brandId })
      .from(brandStores)
      .where(eq(brandStores.storeId, store.id));
    const storeBrandIds = storeBrands.map((b) => b.brandId);

    let brandId = data.brandId ?? null;
    if (brandId) {
      if (!storeBrandIds.includes(brandId)) {
        throw new ConflictException(
          "La marca seleccionada no está asignada a esta sucursal",
        );
      }
    } else if (storeBrandIds.length === 1) {
      brandId = storeBrandIds[0];
    }

    const zoneId = data.zoneId ?? store.zoneId ?? null;

    return { storeId: store.id, zoneId, brandId };
  }

  // Reference checks. ba/manager hit FK validations indirectly through the
  // brandStores/stores joins, but supervisor and the generic update path
  // store raw ids onto users.brand_id / users.zone_id (text columns without
  // a real FK because users.id is a Clerk text id), so a deleted or typoed
  // id would silently turn into an orphan reference.
  private async assertBrandExists(brandId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.id, brandId));
    if (!row) throw new NotFoundException("Marca no encontrada");
  }

  private async assertZoneExists(zoneId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: zones.id })
      .from(zones)
      .where(eq(zones.id, zoneId));
    if (!row) throw new NotFoundException("Zona no encontrada");
  }

  private async assertStoreExists(storeId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.id, storeId));
    if (!row) throw new NotFoundException("Sucursal no encontrada");
  }

  // Reverse-side checks. Call these from BrandsService/ZonesService/StoresService
  // before deleting an entity, so we never strand a user pointing at a row that
  // no longer exists. Returns the offending usernames so the caller can surface
  // a useful error instead of a generic 409.
  async assertNoUsersReferenceBrand(brandId: string): Promise<void> {
    const refs = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.brandId, brandId));
    if (refs.length > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${refs.length} usuario(s) tienen esta marca asignada (${refs
          .slice(0, 3)
          .map((r) => r.email)
          .join(", ")}${refs.length > 3 ? "…" : ""})`,
      );
    }
  }

  async assertNoUsersReferenceZone(zoneId: string): Promise<void> {
    const refs = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.zoneId, zoneId));
    if (refs.length > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${refs.length} usuario(s) tienen esta zona asignada (${refs
          .slice(0, 3)
          .map((r) => r.email)
          .join(", ")}${refs.length > 3 ? "…" : ""})`,
      );
    }
  }

  async assertNoUsersReferenceStore(storeId: string): Promise<void> {
    const refs = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.storeId, storeId));
    if (refs.length > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${refs.length} usuario(s) tienen esta sucursal asignada (${refs
          .slice(0, 3)
          .map((r) => r.email)
          .join(", ")}${refs.length > 3 ? "…" : ""})`,
      );
    }
  }
}
