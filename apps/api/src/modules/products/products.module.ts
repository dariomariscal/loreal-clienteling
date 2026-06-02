import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductLookupService } from "./product-lookup.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [AiModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductLookupService],
  exports: [ProductsService, ProductLookupService],
})
export class ProductsModule {}
