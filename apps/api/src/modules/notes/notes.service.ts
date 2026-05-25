import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { eq, and, or, desc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { notes, users, products } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { CustomerActivityService } from "../../common/services/customer-activity.service";
import type { CreateNoteDto, UpdateNoteDto } from "../../dtos/notes.dto";

@Injectable()
export class NotesService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(CustomerActivityService)
    private customerActivity: CustomerActivityService,
  ) {}

  /**
   * Privacy rule: a `isPrivate: true` note is visible only to its author.
   * Public notes (the default) are visible to anyone with customer-scope
   * access. The private filter happens here, not in the controller — keeps
   * the rule in one place and prevents accidental leaks if a new caller is
   * added later.
   */
  private privacyCondition(user: SessionUser) {
    if (user.role === "admin") return undefined;
    return or(
      eq(notes.isPrivate, false),
      eq(notes.createdByUserId, user.id),
    );
  }

  async findByCustomer(customerId: string, user: SessionUser) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    const privacy = this.privacyCondition(user);

    return this.db
      .select({
        id: notes.id,
        customerId: notes.customerId,
        body: notes.body,
        productId: notes.productId,
        isPrivate: notes.isPrivate,
        createdByUserId: notes.createdByUserId,
        createdByName: users.fullName,
        productName: products.title,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .leftJoin(users, eq(users.id, notes.createdByUserId))
      .leftJoin(products, eq(products.id, notes.productId))
      .where(
        privacy
          ? and(eq(notes.customerId, customerId), privacy)
          : eq(notes.customerId, customerId),
      )
      .orderBy(desc(notes.createdAt));
  }

  async create(
    customerId: string,
    data: CreateNoteDto,
    user: SessionUser,
  ) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    const [note] = await this.db
      .insert(notes)
      .values({
        customerId,
        body: data.body,
        productId: data.productId,
        isPrivate: data.isPrivate ?? false,
        createdByUserId: user.id,
      })
      .returning();

    await this.customerActivity.touchInteraction(customerId);

    await this.auditService.log(
      user,
      "note_created",
      "note",
      note.id,
      { customerId, isPrivate: note.isPrivate },
    );

    return note;
  }

  async update(id: string, data: UpdateNoteDto, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(notes)
      .where(eq(notes.id, id));
    if (!existing) throw new NotFoundException("Note not found");

    if (existing.createdByUserId !== user.id && user.role !== "admin") {
      throw new ForbiddenException("Only the author can edit this note");
    }

    const [updated] = await this.db
      .update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();

    return updated;
  }

  async remove(id: string, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(notes)
      .where(eq(notes.id, id));
    if (!existing) throw new NotFoundException("Note not found");

    if (existing.createdByUserId !== user.id && user.role !== "admin") {
      throw new ForbiddenException("Only the author can delete this note");
    }

    await this.db.delete(notes).where(eq(notes.id, id));

    await this.auditService.log(
      user,
      "note_deleted",
      "note",
      id,
      { customerId: existing.customerId },
    );

    return { success: true };
  }
}
