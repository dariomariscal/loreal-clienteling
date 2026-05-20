import { Controller, Get, Param, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AuditQueryService } from "./audit.service";
import { AuditQueryDto } from "../../dtos/audit.dto";

@ApiTags("Audit")
@ApiBearerAuth()
@Controller("audit-logs")
@Roles(["admin"])
export class AuditController {
  constructor(@Inject(AuditQueryService) private auditQueryService: AuditQueryService) {}

  @Get()
  findAll(@Query() query: AuditQueryDto) {
    return this.auditQueryService.findAll({
      page: query.page,
      limit: query.limit,
      action: query.action,
      entityType: query.entityType,
      actorUserId: query.actorUserId,
      from: query.from,
      to: query.to,
    });
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.auditQueryService.findOne(id);
  }
}
