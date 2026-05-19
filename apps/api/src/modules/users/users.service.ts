import { Injectable, Inject, NotFoundException, ForbiddenException, ConflictException } from "@nestjs/common";
import { eq, and, sql, count, ilike } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { users, stores, zones, brands } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { PasswordCryptoService } from "../../common/services/password-crypto.service";
import { auth } from "../../auth";

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

interface CreateUserData {
  email: string;
  fullName: string;
  role: string;
  storeId?: string;
  zoneId?: string;
  brandId?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(PasswordCryptoService) private passwordCrypto: PasswordCryptoService,
  ) {}

  async findAll(user: SessionUser, filters: UserFilters = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    // Role-based scoping
    if (user.role === "manager") {
      // Manager sees BAs in their store
      if (user.storeId) {
        conditions.push(eq(users.storeId, user.storeId));
      }
    } else if (user.role === "supervisor") {
      // Supervisor sees users in their zone
      const storeIds = await this.scopeService.getAccessibleStoreIds(user);
      if (storeIds.length > 0) {
        conditions.push(
          sql`${users.storeId} IN (${sql.join(storeIds.map((id) => sql`${id}`), sql`, `)})`,
        );
      }
    }
    // Admin sees all

    // Apply filters
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

    return {
      data: rows,
      total: totalResult?.count ?? 0,
      page,
      limit,
    };
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
   * Create an admin-provisioned user with a generated password. The cleartext
   * password is AES-encrypted and stored on `users.encryptedPassword` so
   * admins can reveal it later via `revealPassword`. The hashed copy lives in
   * `accounts.password` as Better Auth requires.
   */
  async create(data: CreateUserData, createdBy: SessionUser) {
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

    const password = this.passwordCrypto.generate(14);

    // Use Better Auth to create the user + hashed credential. The admin plugin
    // forbids setting `role` / business fields through signUpEmail, so we
    // sign-up with just the core fields and patch the rest right after.
    const result = (await auth.api.signUpEmail({
      body: {
        email: data.email.toLowerCase(),
        password,
        name: data.fullName,
        fullName: data.fullName,
      } as any,
    })) as { user: { id: string } };

    const userId = result.user.id;

    await this.db
      .update(users)
      .set({
        emailVerified: true,
        active: true,
        invitationStatus: "accepted",
        invitedByUserId: createdBy.id,
        encryptedPassword: this.passwordCrypto.encrypt(password),
        role: data.role,
        fullName: data.fullName,
        name: data.fullName,
        storeId: data.storeId ?? null,
        zoneId: zoneId ?? null,
        brandId: data.brandId ?? null,
      })
      .where(eq(users.id, userId));

    await this.auditService.log(
      createdBy,
      "user_created",
      "user",
      userId,
      { email: data.email, role: data.role },
    );

    return this.findOne(userId);
  }

  /**
   * Returns the cleartext password of a user — admin-only. Throws if there is
   * no stored encrypted credential (e.g. the user set their own password).
   */
  async revealPassword(id: string, requester: SessionUser): Promise<{ password: string }> {
    if (requester.role !== "admin") {
      throw new ForbiddenException("Solo administradores pueden ver credenciales");
    }
    const [row] = await this.db
      .select({ encryptedPassword: users.encryptedPassword, email: users.email })
      .from(users)
      .where(eq(users.id, id));
    if (!row) throw new NotFoundException("User not found");
    if (!row.encryptedPassword) {
      throw new NotFoundException("Este usuario no tiene credenciales recuperables");
    }
    const password = this.passwordCrypto.decrypt(row.encryptedPassword);

    await this.auditService.log(
      requester,
      "user_password_revealed",
      "user",
      id,
      { email: row.email },
    );

    return { password };
  }

  async invite(data: InviteUserData, invitedBy: SessionUser) {
    const id = crypto.randomUUID();

    await this.db.insert(users).values({
      id,
      name: data.fullName,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      storeId: data.storeId ?? null,
      zoneId: data.zoneId ?? null,
      brandId: data.brandId ?? null,
      emailVerified: false,
      active: true,
      invitationStatus: "pending",
      invitedAt: new Date(),
      invitedByUserId: invitedBy.id,
    });

    await this.auditService.log(
      invitedBy,
      "user_invited",
      "user",
      id,
      { email: data.email, role: data.role },
    );

    return this.findOne(id);
  }

  async update(id: string, data: UpdateUserData, updatedBy: SessionUser) {
    const existing = await this.findOne(id);

    const updateValues: Record<string, any> = {};
    if (data.role !== undefined) updateValues.role = data.role;
    if (data.storeId !== undefined) updateValues.storeId = data.storeId;
    if (data.zoneId !== undefined) updateValues.zoneId = data.zoneId;
    if (data.brandId !== undefined) updateValues.brandId = data.brandId;
    if (data.active !== undefined) updateValues.active = data.active;
    if (data.fullName !== undefined) {
      updateValues.fullName = data.fullName;
      updateValues.name = data.fullName;
    }

    if (Object.keys(updateValues).length === 0) return existing;

    await this.db.update(users).set(updateValues).where(eq(users.id, id));

    await this.auditService.log(
      updatedBy,
      "user_updated",
      "user",
      id,
      updateValues,
    );

    return this.findOne(id);
  }
}
