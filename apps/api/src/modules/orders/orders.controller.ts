import { Controller, Get, Post, Param, Body, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "../../dtos/orders.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Orders")
@ApiBearerAuth()
@Controller()
export class OrdersController {
  constructor(@Inject(OrdersService) private ordersService: OrdersService) {}

  @Get("customers/:customerId/orders")
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.ordersService.findByCustomer(customerId, session.user);
  }

  @Post("orders")
  @Roles(["ba", "manager"])
  @ApiBody({ type: CreateOrderDto })
  create(@Body() body: CreateOrderDto, @Session() session: UserSession) {
    return this.ordersService.create(body, session.user);
  }

  @Get("orders/:id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.ordersService.findOne(id);
  }
}
