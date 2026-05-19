import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { appointmentEventTypes } from "@loreal/database";
import type {
  CreateAppointmentEventTypeDto,
  UpdateAppointmentEventTypeDto,
} from "../../dtos/appointment-event-types.dto";

const DEFAULT_EVENT_TYPES = [
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
export class AppointmentEventTypesService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async findAll() {
    return this.db
      .select()
      .from(appointmentEventTypes)
      .orderBy(appointmentEventTypes.displayName);
  }

  async findActive() {
    const rows = await this.db
      .select()
      .from(appointmentEventTypes)
      .where(eq(appointmentEventTypes.active, true))
      .orderBy(appointmentEventTypes.sortOrder, appointmentEventTypes.displayName);

    // First-run bootstrap: agendar citas requiere al menos un tipo de evento.
    // Si la tabla está vacía, inserta el set base de tipos para que el flujo
    // funcione sin que un admin tenga que crearlos manualmente.
    if (rows.length === 0) {
      await this.db.insert(appointmentEventTypes).values(DEFAULT_EVENT_TYPES);
      return this.db
        .select()
        .from(appointmentEventTypes)
        .where(eq(appointmentEventTypes.active, true))
        .orderBy(appointmentEventTypes.sortOrder, appointmentEventTypes.displayName);
    }

    return rows;
  }

  async findOne(id: string) {
    const [eventType] = await this.db
      .select()
      .from(appointmentEventTypes)
      .where(eq(appointmentEventTypes.id, id));
    if (!eventType) throw new NotFoundException("Appointment event type not found");
    return eventType;
  }

  async create(data: CreateAppointmentEventTypeDto) {
    const [eventType] = await this.db
      .insert(appointmentEventTypes)
      .values(data)
      .returning();
    return eventType;
  }

  async update(id: string, data: UpdateAppointmentEventTypeDto) {
    const [eventType] = await this.db
      .update(appointmentEventTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appointmentEventTypes.id, id))
      .returning();
    if (!eventType) throw new NotFoundException("Appointment event type not found");
    return eventType;
  }
}
