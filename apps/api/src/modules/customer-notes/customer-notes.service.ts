import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { eq, and, or, desc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { customerNotes, users, products } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type {
  CreateCustomerNoteDto,
  UpdateCustomerNoteDto,
} from "../../dtos/customer-notes.dto";

@Injectable()
export class CustomerNotesService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  /**
   * Privacy rule: a `private: true` note is visible only to its author. Public
   * notes (the default) are visible to anyone with customer-scope access. The
   * private filter happens here, not in the controller — keeps the rule in
   * one place and prevents accidental leaks if a new caller is added later.
   */
  private privacyCondition(user: SessionUser) {
    if (user.role === "admin") return undefined;
    return or(
      eq(customerNotes.private, false),
      eq(customerNotes.authorUserId, user.id),
    );
  }

  async findByCustomer(customerId: string, user: SessionUser) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    const privacy = this.privacyCondition(user);

    return this.db
      .select({
        id: customerNotes.id,
        customerId: customerNotes.customerId,
        body: customerNotes.body,
        productId: customerNotes.productId,
        private: customerNotes.private,
        authorUserId: customerNotes.authorUserId,
        authorName: users.fullName,
        productName: products.name,
        createdAt: customerNotes.createdAt,
        updatedAt: customerNotes.updatedAt,
      })
      .from(customerNotes)
      .leftJoin(users, eq(users.id, customerNotes.authorUserId))
      .leftJoin(products, eq(products.id, customerNotes.productId))
      .where(
        privacy
          ? and(eq(customerNotes.customerId, customerId), privacy)
          : eq(customerNotes.customerId, customerId),
      )
      .orderBy(desc(customerNotes.createdAt));
  }

  async create(
    customerId: string,
    data: CreateCustomerNoteDto,
    user: SessionUser,
  ) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    const [note] = await this.db
      .insert(customerNotes)
      .values({
        customerId,
        body: data.body,
        productId: data.productId,
        private: data.private ?? false,
        authorUserId: user.id,
      })
      .returning();

    await this.auditService.log(
      user,
      "customer_note_created",
      "customer_note",
      note.id,
      { customerId, private: note.private },
    );

    return note;
  }

  async update(id: string, data: UpdateCustomerNoteDto, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.id, id));
    if (!existing) throw new NotFoundException("Note not found");

    if (existing.authorUserId !== user.id && user.role !== "admin") {
      throw new ForbiddenException("Only the author can edit this note");
    }

    const [updated] = await this.db
      .update(customerNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerNotes.id, id))
      .returning();

    return updated;
  }

  async remove(id: string, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.id, id));
    if (!existing) throw new NotFoundException("Note not found");

    if (existing.authorUserId !== user.id && user.role !== "admin") {
      throw new ForbiddenException("Only the author can delete this note");
    }

    await this.db.delete(customerNotes).where(eq(customerNotes.id, id));

    await this.auditService.log(
      user,
      "customer_note_deleted",
      "customer_note",
      id,
      { customerId: existing.customerId },
    );

    return { success: true };
  }
}
