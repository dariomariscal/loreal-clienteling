import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { samples } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { CustomerActivityService } from "../../common/services/customer-activity.service";
import type { CreateSampleDto } from "../../dtos/samples.dto";

@Injectable()
export class SamplesService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(CustomerActivityService)
    private customerActivity: CustomerActivityService,
  ) {}

  async findByCustomer(customerId: string, user: SessionUser) {
    const storeScope = await this.scopeService.scopeByStore(
      user,
      samples.storeId,
    );

    const conditions = [
      eq(samples.customerId, customerId),
      ...(storeScope ? [storeScope] : []),
    ];

    return this.db
      .select()
      .from(samples)
      .where(and(...conditions))
      .orderBy(samples.deliveredAt);
  }

  async create(data: CreateSampleDto, user: SessionUser) {
    const storeId = this.scopeService.assertStore(user);

    const [sample] = await this.db
      .insert(samples)
      .values({
        customerId: data.customerId,
        productId: data.productId,
        variantId: data.variantId ?? null,
        deliveredByUserId: user.id,
        storeId,
      })
      .returning();

    await this.customerActivity.touchInteraction(data.customerId);

    await this.auditService.log(user, "create", "sample", sample.id, {
      customerId: data.customerId,
      productId: data.productId,
      variantId: data.variantId ?? null,
    });

    return sample;
  }

  async markConverted(id: string, purchaseId: string) {
    const [updated] = await this.db
      .update(samples)
      .set({
        isConverted: true,
        convertedOrderId: purchaseId,
      })
      .where(eq(samples.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Sample not found");
    return updated;
  }
}
