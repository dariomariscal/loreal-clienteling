import { Controller, Get, Param, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { AuditQueryService } from "./audit.service";
import { AuditQueryDto } from "../../dtos/audit.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Audit")
@ApiBearerAuth()
@Controller("audit-logs")
export class AuditController {
  constructor(@Inject(AuditQueryService) private auditQueryService: AuditQueryService) {}

  @Get()
  @Roles(["admin"])
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

  @Get("summary")
  @Roles(["area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  summary(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("limit") limit: string | undefined,
    @Session() session: UserSession,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.auditQueryService.summary(session.user, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit:
        parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Get(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.auditQueryService.findOne(id);
  }
}
