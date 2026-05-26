import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { shifts, users } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type {
  CreateShiftDto,
  UpdateShiftDto,
  ShiftFiltersDto,
} from "../../dtos/shifts.dto";

@Injectable()
export class ShiftsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  async findAll(user: SessionUser, filters: ShiftFiltersDto) {
    const scope = await this.scopeService.scopeByStore(user, shifts.storeId);

    const conditions = [
      ...(scope ? [scope] : []),
      ...(filters.storeId ? [eq(shifts.storeId, filters.storeId)] : []),
      ...(filters.userId ? [eq(shifts.userId, filters.userId)] : []),
      ...(filters.from ? [gte(shifts.shiftDate, filters.from)] : []),
      ...(filters.to ? [lte(shifts.shiftDate, filters.to)] : []),
      ...(filters.status ? [eq(shifts.status, filters.status)] : []),
    ];

    return this.db
      .select({
        id: shifts.id,
        userId: shifts.userId,
        userFullName: users.fullName,
        userSpecialty: users.specialty,
        storeId: shifts.storeId,
        shiftDate: shifts.shiftDate,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        status: shifts.status,
        notes: shifts.notes,
        createdAt: shifts.createdAt,
        updatedAt: shifts.updatedAt,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(shifts.shiftDate), asc(shifts.startTime));
  }

  /**
   * Today's roster for the user's counter. Returns every BA whose shift
   * intersects "now" plus the off/vacation/sick rows so the manager sees who
   * is missing today. `isOnShiftNow` is computed server-side so the client
   * doesn't need to reason about timezones.
   */
  async getTodayRoster(user: SessionUser, opts: { storeId?: string } = {}) {
    const storeId = opts.storeId ?? user.storeId;
    if (!storeId) {
      throw new ForbiddenException(
        "Cannot resolve roster without a storeId",
      );
    }

    if (user.role !== UserRole.ADMIN) {
      const accessibleStoreIds = await this.scopeService.getAccessibleStoreIds(user);
      if (!accessibleStoreIds.includes(storeId)) {
        throw new ForbiddenException("You do not have access to this store");
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    const rows = await this.db
      .select({
        shiftId: shifts.id,
        userId: shifts.userId,
        fullName: users.fullName,
        specialty: users.specialty,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        status: shifts.status,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.userId, users.id))
      .where(
        and(eq(shifts.storeId, storeId), eq(shifts.shiftDate, today)),
      )
      .orderBy(asc(shifts.startTime));

    return rows.map((row) => {
      const isOnShiftNow =
        row.status === "active" ||
        (row.status === "scheduled" &&
          row.startTime !== null &&
          row.endTime !== null &&
          new Date(row.startTime) <= now &&
          now <= new Date(row.endTime));
      return { ...row, isOnShiftNow };
    });
  }

  async create(data: CreateShiftDto, user: SessionUser) {
    this.assertCanManage(user, data.storeId);

    const [shift] = await this.db
      .insert(shifts)
      .values({
        userId: data.userId,
        storeId: data.storeId,
        shiftDate: data.shiftDate,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        status: data.status ?? "scheduled",
        notes: data.notes ?? null,
        createdByUserId: user.id,
      })
      .returning()
      .catch((err: unknown) => {
        if (err instanceof Error && err.message.includes("shifts_user_date_idx")) {
          throw new ConflictException(
            "A shift for this user and date already exists",
          );
        }
        throw err;
      });

    await this.auditService.log(user, "create", "shift", shift.id, {
      userId: data.userId,
      shiftDate: data.shiftDate,
    });

    return shift;
  }

  async update(id: string, data: UpdateShiftDto, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, id));
    if (!existing) throw new NotFoundException("Shift not found");

    this.assertCanManage(user, existing.storeId);

    const [updated] = await this.db
      .update(shifts)
      .set({
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(shifts.id, id))
      .returning();

    await this.auditService.log(
      user,
      "update",
      "shift",
      id,
      data as unknown as Record<string, unknown>,
    );
    return updated;
  }

  async remove(id: string, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, id));
    if (!existing) throw new NotFoundException("Shift not found");

    this.assertCanManage(user, existing.storeId);

    await this.db.delete(shifts).where(eq(shifts.id, id));
    await this.auditService.log(user, "delete", "shift", id);
    return { success: true };
  }

  private assertCanManage(user: SessionUser, storeId: string): void {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.NATIONAL_RETAIL_MANAGER) return;
    if (user.role === UserRole.AREA_MANAGER) return;

    if (user.role === UserRole.COUNTER_MANAGER) {
      if (user.storeId !== storeId) {
        throw new ForbiddenException(
          "Counter Manager can only manage shifts for their own store",
        );
      }
      return;
    }

    throw new ForbiddenException("This role cannot manage shifts");
  }
}
