import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { and, eq, sql, asc, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  skills,
  userSkills,
  serviceTypeRequiredSkills,
  users,
} from "@loreal/database";
import type {
  CreateSkillDto,
  UpdateSkillDto,
  AssignSkillToUserDto,
  AssignSkillToServiceTypeDto,
} from "../../dtos/skills.dto";

@Injectable()
export class SkillsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  // ── Skills catalog CRUD ────────────────────────────────────────────────
  findAll() {
    return this.db.select().from(skills).orderBy(asc(skills.sortOrder));
  }

  async findOne(id: string) {
    const [row] = await this.db.select().from(skills).where(eq(skills.id, id));
    if (!row) throw new NotFoundException("Skill not found");
    return row;
  }

  async create(data: CreateSkillDto) {
    const [row] = await this.db.insert(skills).values(data).returning();
    return row;
  }

  async update(id: string, data: UpdateSkillDto) {
    const [row] = await this.db
      .update(skills)
      .set(data)
      .where(eq(skills.id, id))
      .returning();
    if (!row) throw new NotFoundException("Skill not found");
    return row;
  }

  async remove(id: string) {
    const [row] = await this.db
      .delete(skills)
      .where(eq(skills.id, id))
      .returning();
    if (!row) throw new NotFoundException("Skill not found");
    return row;
  }

  // ── User ↔ skill ──────────────────────────────────────────────────────
  /** Return every skill held by a user, joined to the catalog. */
  listForUser(userId: string) {
    return this.db
      .select({
        id: userSkills.id,
        userId: userSkills.userId,
        skillId: userSkills.skillId,
        proficiency: userSkills.proficiency,
        expiresAt: userSkills.expiresAt,
        code: skills.code,
        displayName: skills.displayName,
        category: skills.category,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, userId))
      .orderBy(asc(skills.sortOrder));
  }

  async assignToUser(data: AssignSkillToUserDto) {
    const [row] = await this.db
      .insert(userSkills)
      .values({
        userId: data.userId,
        skillId: data.skillId,
        proficiency: data.proficiency,
        expiresAt: data.expiresAt,
      })
      .onConflictDoNothing({
        target: [userSkills.userId, userSkills.skillId],
      })
      .returning();
    return row ?? null;
  }

  async removeFromUser(userId: string, skillId: string) {
    return this.db
      .delete(userSkills)
      .where(
        and(eq(userSkills.userId, userId), eq(userSkills.skillId, skillId)),
      );
  }

  // ── Service ↔ skill ───────────────────────────────────────────────────
  listForService(serviceTypeId: string) {
    return this.db
      .select({
        id: serviceTypeRequiredSkills.id,
        serviceTypeId: serviceTypeRequiredSkills.serviceTypeId,
        skillId: serviceTypeRequiredSkills.skillId,
        minProficiency: serviceTypeRequiredSkills.minProficiency,
        code: skills.code,
        displayName: skills.displayName,
        category: skills.category,
      })
      .from(serviceTypeRequiredSkills)
      .innerJoin(skills, eq(serviceTypeRequiredSkills.skillId, skills.id))
      .where(eq(serviceTypeRequiredSkills.serviceTypeId, serviceTypeId))
      .orderBy(asc(skills.sortOrder));
  }

  async assignToService(data: AssignSkillToServiceTypeDto) {
    const [row] = await this.db
      .insert(serviceTypeRequiredSkills)
      .values({
        serviceTypeId: data.serviceTypeId,
        skillId: data.skillId,
        minProficiency: data.minProficiency,
      })
      .onConflictDoNothing({
        target: [
          serviceTypeRequiredSkills.serviceTypeId,
          serviceTypeRequiredSkills.skillId,
        ],
      })
      .returning();
    return row ?? null;
  }

  async removeFromService(serviceTypeId: string, skillId: string) {
    return this.db
      .delete(serviceTypeRequiredSkills)
      .where(
        and(
          eq(serviceTypeRequiredSkills.serviceTypeId, serviceTypeId),
          eq(serviceTypeRequiredSkills.skillId, skillId),
        ),
      );
  }

  /**
   * "Which BAs can perform this service?" — returns users that hold ALL
   * required skills (AND semantics) at or above any required min
   * proficiency. Use this to power the BA picker on the booking flow.
   */
  async eligibleAdvisorsForService(serviceTypeId: string) {
    const required = await this.db
      .select()
      .from(serviceTypeRequiredSkills)
      .where(eq(serviceTypeRequiredSkills.serviceTypeId, serviceTypeId));

    if (required.length === 0) {
      // No requirements → every active BA qualifies.
      return this.db
        .select({
          userId: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
          specialty: users.specialty,
        })
        .from(users)
        .where(
          and(
            eq(users.role, "beauty_advisor"),
            eq(users.isActive, true),
          ),
        );
    }

    const requiredSkillIds = required.map((r) => r.skillId);

    // Find users holding every required skill at sufficient proficiency.
    const candidates = await this.db
      .select({
        userId: userSkills.userId,
        skillId: userSkills.skillId,
        proficiency: userSkills.proficiency,
      })
      .from(userSkills)
      .where(inArray(userSkills.skillId, requiredSkillIds));

    const minByRequiredSkill = new Map(
      required.map((r) => [r.skillId, r.minProficiency ?? 0]),
    );
    const userSkillSet = new Map<string, Map<string, number>>();
    for (const c of candidates) {
      let inner = userSkillSet.get(c.userId);
      if (!inner) {
        inner = new Map();
        userSkillSet.set(c.userId, inner);
      }
      inner.set(c.skillId, c.proficiency ?? 0);
    }

    const eligibleIds: string[] = [];
    for (const [userId, owned] of userSkillSet) {
      const satisfies = requiredSkillIds.every((sid) => {
        const prof = owned.get(sid);
        if (prof === undefined) return false;
        const minP = minByRequiredSkill.get(sid) ?? 0;
        return prof >= minP;
      });
      if (satisfies) eligibleIds.push(userId);
    }

    if (eligibleIds.length === 0) return [];

    return this.db
      .select({
        userId: users.id,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        specialty: users.specialty,
      })
      .from(users)
      .where(
        and(
          inArray(users.id, eligibleIds),
          eq(users.role, "beauty_advisor"),
          eq(users.isActive, true),
        ),
      )
      .orderBy(sql`${users.fullName}`);
  }
}
