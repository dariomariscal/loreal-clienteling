import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { DivisionsService } from "./divisions.service";
import {
  CreateDivisionDto,
  UpdateDivisionDto,
} from "../../dtos/divisions.dto";

@ApiTags("Divisions")
@ApiBearerAuth()
@Controller("divisions")
export class DivisionsController {
  constructor(
    @Inject(DivisionsService)
    private readonly divisionsService: DivisionsService,
  ) {}

  /**
   * List all divisions. Read-open to every authenticated user so dropdowns
   * (user create/edit, brand admin) can populate without role gating.
   */
  @Get()
  findAll() {
    return this.divisionsService.findAll();
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.divisionsService.findOne(id);
  }

  @Post()
  @Roles(["admin"])
  @ApiBody({ type: CreateDivisionDto })
  create(@Body() body: CreateDivisionDto) {
    return this.divisionsService.create(body);
  }

  @Patch(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateDivisionDto })
  update(@Param("id") id: string, @Body() body: UpdateDivisionDto) {
    return this.divisionsService.update(id, body);
  }

  @Delete(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string) {
    return this.divisionsService.remove(id);
  }
}
