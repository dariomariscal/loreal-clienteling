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
import { NotesService } from "./notes.service";
import { CreateNoteDto, UpdateNoteDto } from "../../dtos/notes.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Notes")
@ApiBearerAuth()
@Controller()
export class NotesController {
  constructor(
    @Inject(NotesService)
    private notesService: NotesService,
  ) {}

  @Get("customers/:customerId/notes")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.notesService.findByCustomer(customerId, session.user);
  }

  @Post("customers/:customerId/notes")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "customerId", type: String })
  @ApiBody({ type: CreateNoteDto })
  create(
    @Param("customerId") customerId: string,
    @Body() body: CreateNoteDto,
    @Session() session: UserSession,
  ) {
    return this.notesService.create(customerId, body, session.user);
  }

  @Patch("notes/:id")
  @Roles(["beauty_advisor", "counter_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateNoteDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateNoteDto,
    @Session() session: UserSession,
  ) {
    return this.notesService.update(id, body, session.user);
  }

  @Delete("notes/:id")
  @Roles(["beauty_advisor", "counter_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string, @Session() session: UserSession) {
    return this.notesService.remove(id, session.user);
  }
}
