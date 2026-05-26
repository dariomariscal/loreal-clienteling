import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { SegmentsService } from "./segments.service";
import {
  CreateSegmentDto,
  UpdateSegmentDto,
  ListSegmentCustomersQueryDto,
  PreviewSegmentDto,
} from "../../dtos/segments.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Segments")
@ApiBearerAuth()
@Controller("segments")
export class SegmentsController {
  constructor(
    @Inject(SegmentsService) private segmentsService: SegmentsService,
  ) {}

  @Get()
  list(@Session() session: UserSession) {
    return this.segmentsService.list(session.user);
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string, @Session() session: UserSession) {
    return this.segmentsService.findOne(id, session.user);
  }

  @Post()
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiBody({ type: CreateSegmentDto })
  create(@Body() body: CreateSegmentDto, @Session() session: UserSession) {
    return this.segmentsService.create(body, session.user);
  }

  @Patch(":id")
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateSegmentDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateSegmentDto,
    @Session() session: UserSession,
  ) {
    return this.segmentsService.update(id, body, session.user);
  }

  @Delete(":id")
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string, @Session() session: UserSession) {
    return this.segmentsService.remove(id, session.user);
  }

  @Get(":id/customers")
  @ApiParam({ name: "id", type: String })
  customers(
    @Param("id") id: string,
    @Query() query: ListSegmentCustomersQueryDto,
    @Session() session: UserSession,
  ) {
    return this.segmentsService.listCustomers(id, query, session.user);
  }

  @Get(":id/count")
  @ApiParam({ name: "id", type: String })
  count(@Param("id") id: string, @Session() session: UserSession) {
    return this.segmentsService.countCustomers(id, session.user);
  }

  @Post("preview")
  @ApiBody({ type: PreviewSegmentDto })
  preview(
    @Body() body: PreviewSegmentDto,
    @Session() session: UserSession,
  ) {
    return this.segmentsService.previewCustomers(body.filter, 100, session.user);
  }
}
