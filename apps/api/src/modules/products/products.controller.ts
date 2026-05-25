import { Controller, Get, Post, Patch, Param, Body, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiOperation } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { ProductsService } from "./products.service";
import { ProductSemanticSearchService } from "../ai/services/product-semantic-search.service";
import {
  BulkCreateProductsDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateInventoryLevelDto,
  ProductFiltersDto,
  ProductSemanticSearchDto,
} from "../../dtos/products.dto";
import type { UserSession } from "../../common/types/session";

const BA_ROLES = ["ba", "manager", "supervisor", "admin"] as const;

@ApiTags("Products")
@ApiBearerAuth()
@Controller("products")
export class ProductsController {
  constructor(
    @Inject(ProductsService) private productsService: ProductsService,
    @Inject(ProductSemanticSearchService)
    private semanticSearch: ProductSemanticSearchService,
  ) {}

  @Get()
  findAll(
    @Query() filters: ProductFiltersDto,
    @Session() session: UserSession,
  ) {
    return this.productsService.findAll(session.user, filters);
  }

  // Declared before the :id route so the literal path doesn't collide with the
  // UUID param matcher.
  @Get("semantic-search")
  @Roles([...BA_ROLES])
  @ApiOperation({
    summary: "Semantic + lexical product search",
    description:
      "Combines ILIKE matches on sku/name with HNSW cosine search over product_embeddings. Falls back to lexical-only if embeddings haven't been generated for a product yet.",
  })
  semanticSearchProducts(
    @Query() query: ProductSemanticSearchDto,
    @Session() session: UserSession,
  ) {
    return this.semanticSearch.search(query.q, session.user, query.limit);
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
  @ApiBody({ type: UpdateInventoryLevelDto })
  updateAvailability(
    @Param("id") id: string,
    @Param("storeId") storeId: string,
    @Body() body: UpdateInventoryLevelDto,
  ) {
    return this.productsService.updateAvailability(id, storeId, body.stockStatus);
  }
}
