import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { asc, count, eq } from "drizzle-orm";
import { brands, divisions, users } from "@loreal/database";
import {
  DATABASE_TOKEN,
  type Database,
} from "../../config/database.provider";
import type {
  CreateDivisionDto,
  UpdateDivisionDto,
} from "../../dtos/divisions.dto";

/**
 * Divisions are read-mostly tenancy data: the four L'Oréal divisions (luxe,
 * consumer, active, professional) rarely change. We still expose mutation
 * endpoints so a future organizational tweak (e.g. spinning out CeraVe into
 * its own division) doesn't require a schema migration.
 *
 * Scope rule: every authenticated user can READ divisions (the dropdown is
 * used in user create/edit by every admin-tier role). Only `admin` mutates.
 * This is enforced at the controller level via @Roles.
 */
@Injectable()
export class DivisionsService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async findAll() {
    return this.db
      .select()
      .from(divisions)
      .orderBy(asc(divisions.displayName));
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select()
      .from(divisions)
      .where(eq(divisions.id, id));
    if (!row) throw new NotFoundException("Division not found");
    return row;
  }

  async findByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(divisions)
      .where(eq(divisions.code, code));
    if (!row) throw new NotFoundException("Division not found");
    return row;
  }

  async create(data: CreateDivisionDto) {
    const code = data.code.trim().toLowerCase();
    const [existing] = await this.db
      .select({ id: divisions.id })
      .from(divisions)
      .where(eq(divisions.code, code));
    if (existing) {
      throw new ConflictException("Ya existe una división con ese código");
    }

    const [row] = await this.db
      .insert(divisions)
      .values({
        code,
        displayName: data.displayName,
        isActive: data.isActive ?? true,
      })
      .returning();
    return row;
  }

  async update(id: string, data: UpdateDivisionDto) {
    await this.findOne(id); // 404 if missing

    const patch: Record<string, unknown> = {};
    if (data.code !== undefined) patch.code = data.code.trim().toLowerCase();
    if (data.displayName !== undefined) patch.displayName = data.displayName;
    if (data.isActive !== undefined) patch.isActive = data.isActive;

    if (Object.keys(patch).length === 0) {
      return this.findOne(id);
    }

    const [row] = await this.db
      .update(divisions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(divisions.id, id))
      .returning();
    return row;
  }

  /**
   * Soft delete: a division with users or brands attached can't be deleted,
   * because users.division_id / brands.division_id would dangle. We surface
   * a precise reason so the admin understands what's blocking.
   */
  async remove(id: string) {
    await this.findOne(id);

    const [{ count: brandRefs }] = await this.db
      .select({ count: count() })
      .from(brands)
      .where(eq(brands.divisionId, id));
    if (brandRefs > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${brandRefs} marca(s) están asignadas a esta división.`,
      );
    }

    const [{ count: userRefs }] = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.divisionId, id));
    if (userRefs > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${userRefs} usuario(s) están asignados a esta división.`,
      );
    }

    await this.db.delete(divisions).where(eq(divisions.id, id));
    return { success: true };
  }
}
