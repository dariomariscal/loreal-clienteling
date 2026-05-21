import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { CustomerNotesService } from "./customer-notes.service";
import {
  CreateCustomerNoteDto,
  UpdateCustomerNoteDto,
} from "../../dtos/customer-notes.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Customer notes")
@ApiBearerAuth()
@Controller()
export class CustomerNotesController {
  constructor(
    @Inject(CustomerNotesService)
    private customerNotesService: CustomerNotesService,
  ) {}

  @Get("customers/:customerId/notes")
  @Roles(["ba", "manager", "supervisor", "admin"])
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.customerNotesService.findByCustomer(customerId, session.user);
  }

  @Post("customers/:customerId/notes")
  @Roles(["ba", "manager"])
  @ApiParam({ name: "customerId", type: String })
  @ApiBody({ type: CreateCustomerNoteDto })
  create(
    @Param("customerId") customerId: string,
    @Body() body: CreateCustomerNoteDto,
    @Session() session: UserSession,
  ) {
    return this.customerNotesService.create(customerId, body, session.user);
  }

  @Patch("customer-notes/:id")
  @Roles(["ba", "manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateCustomerNoteDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateCustomerNoteDto,
    @Session() session: UserSession,
  ) {
    return this.customerNotesService.update(id, body, session.user);
  }

  @Delete("customer-notes/:id")
  @Roles(["ba", "manager", "admin"])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string, @Session() session: UserSession) {
    return this.customerNotesService.remove(id, session.user);
  }
}
