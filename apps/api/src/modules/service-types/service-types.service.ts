import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { serviceTypes } from "@loreal/database";
import type {
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
} from "../../dtos/service-types.dto";

const DEFAULT_SERVICE_TYPES = [
  {
    code: "consulta",
    displayName: "Consulta de belleza",
    durationMinutes: 30,
    color: "#D4AF37",
    description: "Sesión inicial para conocer a la clienta y sus necesidades.",
    sortOrder: 1,
  },
  {
    code: "diagnostico",
    displayName: "Diagnóstico de piel",
    durationMinutes: 45,
    color: "#9B59B6",
    description: "Evaluación de piel para recomendar rutina.",
    sortOrder: 2,
  },
  {
    code: "maquillaje",
    displayName: "Sesión de maquillaje",
    durationMinutes: 60,
    color: "#E74C3C",
    description: "Aplicación o demostración de maquillaje.",
    sortOrder: 3,
  },
  {
    code: "evento",
    displayName: "Evento privado",
    durationMinutes: 90,
    color: "#2ECC71",
    description: "Sesión para eventos especiales o private shopping.",
    sortOrder: 4,
  },
];

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
    const rows = await this.db
      .select()
      .from(serviceTypes)
      .where(eq(serviceTypes.isActive, true))
      .orderBy(serviceTypes.sortOrder, serviceTypes.displayName);

    // First-run bootstrap: scheduling needs at least one service type. If
    // the table is empty, seed the defaults so the flow works without an
    // admin having to create them manually.
    if (rows.length === 0) {
      await this.db.insert(serviceTypes).values(DEFAULT_SERVICE_TYPES);
      return this.db
        .select()
        .from(serviceTypes)
        .where(eq(serviceTypes.isActive, true))
        .orderBy(serviceTypes.sortOrder, serviceTypes.displayName);
    }

    return rows;
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
