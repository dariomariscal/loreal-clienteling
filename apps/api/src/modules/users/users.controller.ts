import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Roles, Session } from "@thallesp/nestjs-better-auth";
import { UsersService } from "./users.service";
import type { UserSession } from "../../common/types/session";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(@Inject(UsersService) private usersService: UsersService) {}

  @Get()
  @Roles(["manager", "admin"])
  @ApiQuery({ name: "role", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "zoneId", type: String, required: false })
  @ApiQuery({ name: "brandId", type: String, required: false })
  @ApiQuery({ name: "active", type: Boolean, required: false })
  @ApiQuery({ name: "invitationStatus", type: String, required: false })
  @ApiQuery({ name: "search", type: String, required: false })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  findAll(
    @Query("role") role: string | undefined,
    @Query("storeId") storeId: string | undefined,
    @Query("zoneId") zoneId: string | undefined,
    @Query("brandId") brandId: string | undefined,
    @Query("active") active: string | undefined,
    @Query("invitationStatus") invitationStatus: string | undefined,
    @Query("search") search: string | undefined,
    @Query("page") page: string | undefined,
    @Query("limit") limit: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.usersService.findAll(session.user, {
      role,
      storeId,
      zoneId,
      brandId,
      active: active !== undefined ? active === "true" : undefined,
      invitationStatus,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(":id")
  @Roles(["manager", "admin"])
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(["admin"])
  create(
    @Body() body: { email: string; fullName: string; role: string; storeId?: string; zoneId?: string; brandId?: string },
    @Session() session: UserSession,
  ) {
    return this.usersService.create(body, session.user);
  }

  @Get(":id/password")
  @Roles(["admin"])
  revealPassword(@Param("id") id: string, @Session() session: UserSession) {
    return this.usersService.revealPassword(id, session.user);
  }

  @Post("invite")
  @Roles(["admin"])
  invite(
    @Body() body: { email: string; fullName: string; role: string; storeId?: string; zoneId?: string; brandId?: string },
    @Session() session: UserSession,
  ) {
    return this.usersService.invite(body, session.user);
  }

  @Patch(":id")
  @Roles(["admin"])
  update(
    @Param("id") id: string,
    @Body() body: { role?: string; storeId?: string | null; zoneId?: string | null; brandId?: string | null; active?: boolean; fullName?: string },
    @Session() session: UserSession,
  ) {
    return this.usersService.update(id, body, session.user);
  }
}
