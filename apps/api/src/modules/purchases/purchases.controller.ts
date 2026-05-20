import { Controller, Get, Post, Param, Body, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { PurchasesService } from "./purchases.service";
import { CreatePurchaseDto } from "../../dtos/purchases.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Purchases")
@ApiBearerAuth()
@Controller()
export class PurchasesController {
  constructor(@Inject(PurchasesService) private purchasesService: PurchasesService) {}

  @Get("customers/:customerId/purchases")
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.purchasesService.findByCustomer(customerId, session.user);
  }

  @Post("purchases")
  @Roles(["ba", "manager"])
  @ApiBody({ type: CreatePurchaseDto })
  create(
    @Body() body: CreatePurchaseDto,
    @Session() session: UserSession,
  ) {
    return this.purchasesService.create(body, session.user);
  }

  @Get("purchases/:id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.purchasesService.findOne(id);
  }
}
