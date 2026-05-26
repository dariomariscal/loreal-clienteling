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
import { WishlistsService } from "./wishlists.service";
import {
  CreateWishlistDto,
  UpdateWishlistDto,
  ShareWishlistDto,
  AddWishlistItemDto,
  UpdateWishlistItemDto,
} from "../../dtos/wishlists.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Wishlists")
@ApiBearerAuth()
@Controller()
export class WishlistsController {
  constructor(
    @Inject(WishlistsService) private wishlistsService: WishlistsService,
  ) {}

  @Get("customers/:customerId/wishlists")
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.wishlistsService.findByCustomer(customerId, session.user);
  }

  @Get("wishlists/:id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string, @Session() session: UserSession) {
    return this.wishlistsService.findOne(id, session.user);
  }

  @Post("wishlists")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiBody({ type: CreateWishlistDto })
  create(
    @Body() body: CreateWishlistDto,
    @Session() session: UserSession,
  ) {
    return this.wishlistsService.create(body, session.user);
  }

  @Patch("wishlists/:id")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateWishlistDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateWishlistDto,
    @Session() session: UserSession,
  ) {
    return this.wishlistsService.update(id, body, session.user);
  }

  @Delete("wishlists/:id")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string, @Session() session: UserSession) {
    return this.wishlistsService.remove(id, session.user);
  }

  @Post("wishlists/:id/share")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ShareWishlistDto })
  share(
    @Param("id") id: string,
    @Body() body: ShareWishlistDto,
    @Session() session: UserSession,
  ) {
    return this.wishlistsService.share(id, body, session.user);
  }

  @Post("wishlists/:id/items")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AddWishlistItemDto })
  addItem(
    @Param("id") id: string,
    @Body() body: AddWishlistItemDto,
    @Session() session: UserSession,
  ) {
    return this.wishlistsService.addItem(id, body, session.user);
  }

  @Patch("wishlists/:id/items/:itemId")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "itemId", type: String })
  @ApiBody({ type: UpdateWishlistItemDto })
  updateItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateWishlistItemDto,
    @Session() session: UserSession,
  ) {
    return this.wishlistsService.updateItem(id, itemId, body, session.user);
  }

  @Delete("wishlists/:id/items/:itemId")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "itemId", type: String })
  removeItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Session() session: UserSession,
  ) {
    return this.wishlistsService.removeItem(id, itemId, session.user);
  }
}
