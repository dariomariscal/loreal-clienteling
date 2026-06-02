import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { and, eq, isNull, or, type SQL } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { serviceTypes } from "@loreal/database";
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
