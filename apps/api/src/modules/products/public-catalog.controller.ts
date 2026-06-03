import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../auth/decorators/public.decorator";
import { PublicCatalogService } from "./public-catalog.service";

/**
 * Unauthenticated catalog browse. Lives at /public/catalog so the auth guard
 * skips it via the @Public decorator and so it never collides with the
 * BA-scoped /products endpoints. Intended for the showroom page a customer
 * pulls up on her phone to find the product she wants the BA to scan.
 */
@ApiTags("PublicCatalog")
@Controller("public/catalog")
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Public()
  @Get("brands")
  @ApiOperation({ summary: "List brands with at least one active product." })
  listBrands() {
    return this.catalog.listBrands();
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: "Browse active products. Optional brand code + free-text query.",
  })
  list(
    @Query("brand") brand?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
  ) {
    return this.catalog.list({
      brand,
      q,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Public()
  @Get(":productId")
  @ApiOperation({
    summary:
      "Product detail with variants (sku + barcode) for in-store scanning.",
  })
  findOne(@Param("productId") productId: string) {
    return this.catalog.findOne(productId);
  }
}
