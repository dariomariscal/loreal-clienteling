import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, asc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  appointmentPreparedProducts,
  products,
  appointments,
} from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import type {
  AddPreparedProductDto,
  UpdatePreparedProductStatusDto,
} from "../../dtos/appointment-prepared-products.dto";

@Injectable()
export class AppointmentPreparedProductsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  /**
   * List all prepared SKUs for an appointment, enriched with catalog data
   * so the detail screen renders thumbnails / titles without a second
   * roundtrip.
   */
  async listForAppointment(appointmentId: string) {
    return this.db
      .select({
        id: appointmentPreparedProducts.id,
        appointmentId: appointmentPreparedProducts.appointmentId,
        productId: appointmentPreparedProducts.productId,
        variantId: appointmentPreparedProducts.variantId,
        position: appointmentPreparedProducts.position,
        status: appointmentPreparedProducts.status,
        note: appointmentPreparedProducts.note,
        addedByUserId: appointmentPreparedProducts.addedByUserId,
        addedAt: appointmentPreparedProducts.addedAt,
        statusChangedAt: appointmentPreparedProducts.statusChangedAt,
        product: {
          id: products.id,
          sku: products.sku,
          title: products.title,
          images: products.images,
          price: products.price,
        },
      })
      .from(appointmentPreparedProducts)
      .leftJoin(
        products,
        eq(appointmentPreparedProducts.productId, products.id),
      )
      .where(eq(appointmentPreparedProducts.appointmentId, appointmentId))
      .orderBy(asc(appointmentPreparedProducts.position));
  }

  async add(
    appointmentId: string,
    data: AddPreparedProductDto,
    user: SessionUser,
  ) {
    // Make sure the appointment exists; the FK would catch it but the 404
    // is more informative than a constraint error.
    const [appt] = await this.db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.id, appointmentId));
    if (!appt) throw new NotFoundException("Appointment not found");

    const [row] = await this.db
      .insert(appointmentPreparedProducts)
      .values({
        appointmentId,
        productId: data.productId,
        variantId: data.variantId,
        position: data.position ?? 0,
        status: data.status ?? "prepared",
        note: data.note,
        addedByUserId: user.id,
      })
      .returning();
    return row;
  }

  async updateStatus(id: string, data: UpdatePreparedProductStatusDto) {
    const [row] = await this.db
      .update(appointmentPreparedProducts)
      .set({
        status: data.status,
        note: data.note,
        statusChangedAt: new Date(),
      })
      .where(eq(appointmentPreparedProducts.id, id))
      .returning();
    if (!row) throw new NotFoundException("Prepared product not found");
    return row;
  }

  async remove(id: string) {
    const [row] = await this.db
      .delete(appointmentPreparedProducts)
      .where(eq(appointmentPreparedProducts.id, id))
      .returning();
    if (!row) throw new NotFoundException("Prepared product not found");
    return row;
  }
}
