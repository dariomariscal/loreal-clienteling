import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import type { SessionUser } from "../../common/types/session";
import { CreateUserDto, UpdateMeDto } from "../../dtos/users.dto";
import { UsersService } from "./users.service";
import { AuditQueryService } from "../audit/audit.service";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(AuditQueryService) private readonly auditService: AuditQueryService,
  ) {}

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
    @CurrentUser() user: SessionUser,
  ) {
    return this.usersService.findAll(user, {
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

  /**
   * Self-profile endpoints. Any authenticated user can read and partially
   * update their own profile. Declared above `:id` so the static "me" path
   * is matched before the wildcard.
   */
  @Get("me")
  getMe(@CurrentUser() user: SessionUser) {
    return this.usersService.findOne(user.id);
  }

  @Patch("me")
  @ApiBody({ type: UpdateMeDto })
  updateMe(@Body() body: UpdateMeDto, @CurrentUser() user: SessionUser) {
    return this.usersService.updateSelf(user, body);
  }

  /**
   * Own audit log — every change the current user made (notes, appointments,
   * customer edits…). Read-only feed used by the advisor account screen.
   */
  @Get("me/activity")
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  getMyActivity(
    @CurrentUser() user: SessionUser,
    @Query("page") page: string | undefined,
    @Query("limit") limit: string | undefined,
  ) {
    return this.auditService.findAll({
      actorUserId: user.id,
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 100) : 25,
    });
  }

  @Get(":id")
  @Roles(["manager", "admin"])
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post("invite")
  @Roles(["admin"])
  invite(
    @Body() body: { email: string; fullName: string; role: string; storeId?: string; zoneId?: string; brandId?: string },
    @CurrentUser() user: SessionUser,
  ) {
    return this.usersService.invite(body, user);
  }

  /**
   * Creates a Clerk user directly with a generated password and returns it
   * once. Use when the admin will hand over credentials manually instead of
   * sending an invitation email.
   */
  @Post()
  @Roles(["admin"])
  @ApiBody({ type: CreateUserDto })
  createDirect(
    @Body() body: CreateUserDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.usersService.createDirect(body, user);
  }

  @Patch(":id")
  @Roles(["admin"])
  update(
    @Param("id") id: string,
    @Body() body: { role?: string; storeId?: string | null; zoneId?: string | null; brandId?: string | null; active?: boolean; fullName?: string },
    @CurrentUser() user: SessionUser,
  ) {
    return this.usersService.update(id, body, user);
  }

  @Post(":id/reset-password")
  @Roles(["admin"])
  resetPassword(
    @Param("id") id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.usersService.resetPassword(id, user);
  }

  @Delete("invitations/:invitationId")
  @Roles(["admin"])
  revokeInvitation(
    @Param("invitationId") invitationId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.usersService.revokeInvitation(invitationId, user);
  }
}
