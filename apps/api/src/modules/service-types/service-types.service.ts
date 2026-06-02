import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { serviceTypes } from "@loreal/database";
import type {
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
} from "../../dtos/service-types.dto";

@Injectable()
export class ServiceTypesService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async findAll() {
    return this.db
      .select()
      .from(serviceTypes)
      .orderBy(serviceTypes.displayName);
  }

  async findActive() {
    return this.db
      .select()
      .from(serviceTypes)
      .where(eq(serviceTypes.isActive, true))
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
