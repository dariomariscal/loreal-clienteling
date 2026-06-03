import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductLookupService } from "./product-lookup.service";
import { PublicCatalogController } from "./public-catalog.controller";
import { PublicCatalogService } from "./public-catalog.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [AiModule],
  controllers: [ProductsController, PublicCatalogController],
  providers: [ProductsService, ProductLookupService, PublicCatalogService],
  exports: [ProductsService, ProductLookupService],
})
export class ProductsModule {}
