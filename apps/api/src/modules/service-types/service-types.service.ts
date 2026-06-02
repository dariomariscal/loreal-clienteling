import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { and, eq, isNull, or, inArray, sql, type SQL } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  serviceTypes,
  serviceTypeRequiredSkills,
  userSkills,
} from "@loreal/database";
import { ScopeService } from "../../common/services/scope.service";
import type { SessionUser } from "../../common/types/session";
import type {
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
} from "../../dtos/service-types.dto";

@Injectable()
export class ServiceTypesService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async findAll() {
    return this.db
      .select()
      .from(serviceTypes)
      .orderBy(serviceTypes.displayName);
  }

  /**
   * Active service types visible to the caller.
   *
   * Brand scoping: a BA assigned to Lancôme must only see Lancôme services
   * — plus rows with `brand_id IS NULL` which are the cross-brand services
   * (VIP private shopping, virtual consult, masterclass) any BA can offer.
   *
   * Managers (area / national) see every brand inside their division, again
   * with the cross-brand rows always included. Admin sees everything.
   */
  async findActive(user: SessionUser) {
    const brandScope = await this.scopeService.scopeByBrand(
      user,
      serviceTypes.brandId,
    );

    const where: SQL | undefined =
      brandScope === undefined
        ? eq(serviceTypes.isActive, true)
        : and(
            eq(serviceTypes.isActive, true),
            or(brandScope, isNull(serviceTypes.brandId)),
          );

    return this.db
      .select()
      .from(serviceTypes)
      .where(where)
      .orderBy(serviceTypes.sortOrder, serviceTypes.displayName);
  }

  /**
   * Services the *current BA* is allowed to perform: brand-scoped (same as
   * findActive) AND the BA must hold every required skill. Used by the
   * booking sheet so unqualified services never appear in the picker.
   *
   * Managers / admin → defer to findActive (no per-user skill filter, since
   * they aren't the staff actually delivering the service).
   */
  async findEligibleForUser(user: SessionUser) {
    if (user.role !== "beauty_advisor") {
      return this.findActive(user);
    }

    const brandScope = await this.scopeService.scopeByBrand(
      user,
      serviceTypes.brandId,
    );
    const where: SQL | undefined =
      brandScope === undefined
        ? eq(serviceTypes.isActive, true)
        : and(
            eq(serviceTypes.isActive, true),
            or(brandScope, isNull(serviceTypes.brandId)),
          );

    const candidates = await this.db
      .select()
      .from(serviceTypes)
      .where(where)
      .orderBy(serviceTypes.sortOrder, serviceTypes.displayName);

    if (candidates.length === 0) return [];

    // Requirements per service (skill_id + minProficiency).
    const reqs = await this.db
      .select({
        serviceTypeId: serviceTypeRequiredSkills.serviceTypeId,
        skillId: serviceTypeRequiredSkills.skillId,
        minProficiency: serviceTypeRequiredSkills.minProficiency,
      })
      .from(serviceTypeRequiredSkills)
      .where(
        inArray(
          serviceTypeRequiredSkills.serviceTypeId,
          candidates.map((c) => c.id),
        ),
      );

    if (reqs.length === 0) return candidates;

    const requiredSkillIds = Array.from(new Set(reqs.map((r) => r.skillId)));
    const owned = await this.db
      .select({
        skillId: userSkills.skillId,
        proficiency: userSkills.proficiency,
      })
      .from(userSkills)
      .where(
        and(
          eq(userSkills.userId, user.id),
          inArray(userSkills.skillId, requiredSkillIds),
        ),
      );
    const ownedMap = new Map(owned.map((o) => [o.skillId, o.proficiency ?? 0]));

    const reqsByService = new Map<
      string,
      { skillId: string; minProficiency: number | null }[]
    >();
    for (const r of reqs) {
      const list = reqsByService.get(r.serviceTypeId) ?? [];
      list.push({ skillId: r.skillId, minProficiency: r.minProficiency });
      reqsByService.set(r.serviceTypeId, list);
    }

    return candidates.filter((svc) => {
      const list = reqsByService.get(svc.id);
      if (!list || list.length === 0) return true;
      return list.every((r) => {
        const prof = ownedMap.get(r.skillId);
        if (prof === undefined) return false;
        return prof >= (r.minProficiency ?? 0);
      });
    });
  }

  async findOne(id: string) {
    const [serviceType] = await this.db
      .select()
      .from(serviceTypes)
      .where(eq(serviceTypes.id, id));
    if (!serviceType) throw new NotFoundException("Service type not found");
    return serviceType;
  }

  async create(data: CreateServiceTypeDto) {
    const [serviceType] = await this.db
      .insert(serviceTypes)
      .values(data)
      .returning();
    return serviceType;
  }

  async update(id: string, data: UpdateServiceTypeDto) {
    const [serviceType] = await this.db
      .update(serviceTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceTypes.id, id))
      .returning();
    if (!serviceType) throw new NotFoundException("Service type not found");
    return serviceType;
  }
}
