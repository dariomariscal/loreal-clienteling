import { Controller, Get, Post, Delete, Param, Body, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { ConsentsService } from "./consents.service";
import { GrantConsentDto } from "../../dtos/consents.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Consents")
@ApiBearerAuth()
@Controller("customers/:customerId/consents")
export class ConsentsController {
  constructor(@Inject(ConsentsService) private consentsService: ConsentsService) {}

  @Get()
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.consentsService.findByCustomer(customerId, session.user);
  }

  @Post()
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "customerId", type: String })
  @ApiBody({ type: GrantConsentDto })
  grant(
    @Param("customerId") customerId: string,
    @Body() body: GrantConsentDto,
    @Session() session: UserSession,
  ) {
    return this.consentsService.grant(
      { ...body, customerId },
      session.user,
    );
  }

  @Delete(":type")
  @Roles(["beauty_advisor", "counter_manager", "admin"])
  @ApiParam({ name: "customerId", type: String })
  @ApiParam({ name: "type", type: String })
  revoke(
    @Param("customerId") customerId: string,
    @Param("type") type: string,
    @Session() session: UserSession,
  ) {
    return this.consentsService.revoke(customerId, type, session.user);
  }
}
