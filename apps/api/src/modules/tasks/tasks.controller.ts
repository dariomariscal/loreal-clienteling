import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiParam, ApiBody } from "@nestjs/swagger";
import { Session } from "../../auth/decorators/session.decorator";
import { TasksService } from "./tasks.service";
import { ListTasksQueryDto, SnoozeTaskDto } from "../../dtos/tasks.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Tasks")
@ApiBearerAuth()
@Controller("tasks")
export class TasksController {
  constructor(@Inject(TasksService) private tasksService: TasksService) {}

  @Get()
  list(@Query() query: ListTasksQueryDto, @Session() session: UserSession) {
    return this.tasksService.list(query, session.user);
  }

  @Get("counts")
  counts(@Session() session: UserSession) {
    return this.tasksService.counts(session.user);
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string, @Session() session: UserSession) {
    return this.tasksService.findOne(id, session.user);
  }

  @Post(":id/complete")
  @ApiParam({ name: "id", type: String })
  complete(@Param("id") id: string, @Session() session: UserSession) {
    return this.tasksService.complete(id, session.user);
  }

  @Post(":id/dismiss")
  @ApiParam({ name: "id", type: String })
  dismiss(@Param("id") id: string, @Session() session: UserSession) {
    return this.tasksService.dismiss(id, session.user);
  }

  @Post(":id/snooze")
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: SnoozeTaskDto })
  snooze(
    @Param("id") id: string,
    @Body() body: SnoozeTaskDto,
    @Session() session: UserSession,
  ) {
    return this.tasksService.snooze(id, body, session.user);
  }

  @Post(":id/reopen")
  @ApiParam({ name: "id", type: String })
  reopen(@Param("id") id: string, @Session() session: UserSession) {
    return this.tasksService.reopen(id, session.user);
  }
}
