import { Controller, Get, Post, Patch, Param, Body, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiOperation } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { ProductsService } from "./products.service";
import {
  BulkCreateProductsDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateAvailabilityDto,
  ProductFiltersDto,
} from "../../dtos/products.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Products")
@ApiBearerAuth()
@Controller("products")
export class ProductsController {
  constructor(@Inject(ProductsService) private productsService: ProductsService) {}

  @Get()
  findAll(
    @Query() filters: ProductFiltersDto,
    @Session() session: UserSession,
  ) {
    return this.productsService.findAll(session.user, filters);
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles(["admin"])
  @ApiBody({ type: CreateProductDto })
  create(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
  }

  @Post("bulk")
  @Roles(["admin"])
  @ApiOperation({
    summary: "Bulk import products",
    description:
      "Validates all rows up-front (SKU uniqueness, brand FK) and inserts in a single transaction. atomic mode aborts the whole batch on any failure; best_effort inserts valid rows and reports failures per row.",
  })
  @ApiBody({ type: BulkCreateProductsDto })
  bulkCreate(@Body() body: BulkCreateProductsDto) {
    return this.productsService.bulkCreate(body);
  }

  @Patch(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateProductDto })
  update(@Param("id") id: string, @Body() body: UpdateProductDto) {
    return this.productsService.update(id, body);
  }

  @Get(":id/availability")
  @ApiParam({ name: "id", type: String })
  getAvailability(@Param("id") id: string, @Session() session: UserSession) {
    return this.productsService.getAvailability(id, session.user);
  }

  @Patch(":id/availability/:storeId")
  @Roles(["admin", "manager"])
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "storeId", type: String })
  @ApiBody({ type: UpdateAvailabilityDto })
  updateAvailability(
    @Param("id") id: string,
    @Param("storeId") storeId: string,
    @Body() body: UpdateAvailabilityDto,
  ) {
    return this.productsService.updateAvailability(id, storeId, body.stockStatus);
  }
}
