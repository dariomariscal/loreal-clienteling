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
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { SkillsService } from "./skills.service";
import {
  CreateSkillDto,
  UpdateSkillDto,
  AssignSkillToUserDto,
  AssignSkillToServiceTypeDto,
} from "../../dtos/skills.dto";

@ApiTags("Skills")
@ApiBearerAuth()
@Controller("skills")
export class SkillsController {
  constructor(@Inject(SkillsService) private service: SkillsService) {}

  // ── Catalog ────────────────────────────────────────────────────────
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(["admin"])
  @ApiBody({ type: CreateSkillDto })
  create(@Body() body: CreateSkillDto) {
    return this.service.create(body);
  }

  @Patch(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateSkillDto })
  update(@Param("id") id: string, @Body() body: UpdateSkillDto) {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  // ── User ↔ skill ───────────────────────────────────────────────────
  @Get("users/:userId")
  @ApiParam({ name: "userId", type: String })
  listForUser(@Param("userId") userId: string) {
    return this.service.listForUser(userId);
  }

  @Post("users")
  @Roles(["counter_manager", "area_manager", "admin"])
  @ApiBody({ type: AssignSkillToUserDto })
  assignToUser(@Body() body: AssignSkillToUserDto) {
    return this.service.assignToUser(body);
  }

  @Delete("users/:userId/:skillId")
  @Roles(["counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "userId", type: String })
  @ApiParam({ name: "skillId", type: String })
  removeFromUser(
    @Param("userId") userId: string,
    @Param("skillId") skillId: string,
  ) {
    return this.service.removeFromUser(userId, skillId);
  }

  // ── Service ↔ skill ────────────────────────────────────────────────
  @Get("services/:serviceTypeId")
  @ApiParam({ name: "serviceTypeId", type: String })
  listForService(@Param("serviceTypeId") serviceTypeId: string) {
    return this.service.listForService(serviceTypeId);
  }

  @Post("services")
  @Roles(["admin"])
  @ApiBody({ type: AssignSkillToServiceTypeDto })
  assignToService(@Body() body: AssignSkillToServiceTypeDto) {
    return this.service.assignToService(body);
  }

  @Delete("services/:serviceTypeId/:skillId")
  @Roles(["admin"])
  @ApiParam({ name: "serviceTypeId", type: String })
  @ApiParam({ name: "skillId", type: String })
  removeFromService(
    @Param("serviceTypeId") serviceTypeId: string,
    @Param("skillId") skillId: string,
  ) {
    return this.service.removeFromService(serviceTypeId, skillId);
  }

  // ── Routing: BAs eligible for a service ────────────────────────────
  @Get("services/:serviceTypeId/eligible-advisors")
  @ApiParam({ name: "serviceTypeId", type: String })
  eligibleAdvisorsForService(
    @Param("serviceTypeId") serviceTypeId: string,
  ) {
    return this.service.eligibleAdvisorsForService(serviceTypeId);
  }
}
