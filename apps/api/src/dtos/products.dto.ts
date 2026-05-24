import {
  IsString,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
  IsUUID,
  IsNumber,
  IsPositive,
  IsInt,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsUrl,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  PRODUCT_CATEGORIES,
  STOCK_STATUSES,
  BULK_PRODUCT_LIMIT,
  type BulkImportMode,
} from "@loreal/contracts";
import { PaginationDto } from "./common.dto";

export class CreateProductDto {
  @ApiProperty({ type: String, example: "SKU-001", minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  sku: string;

  @ApiProperty({ type: String, example: "Revitalift Sérum", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  brandId: string;

  @ApiProperty({ type: String, enum: PRODUCT_CATEGORIES, example: "skincare" })
  @IsIn(PRODUCT_CATEGORIES)
  category: string;

  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional({ type: String, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ type: Number, example: 1299.0, minimum: 0 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ type: Number, example: 90 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  estimatedDurationDays?: number;

  @ApiPropertyOptional({ type: [String], description: "Product image URLs" })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ type: String, enum: PRODUCT_CATEGORIES })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ProductSemanticSearchDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ type: String, enum: STOCK_STATUSES, example: "available" })
  @IsIn(STOCK_STATUSES)
  stockStatus: string;
}

export class BulkCreateProductsDto {
  @ApiProperty({
    type: [CreateProductDto],
    description: `Rows to insert. Maximum ${BULK_PRODUCT_LIMIT} per request.`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_PRODUCT_LIMIT)
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products: CreateProductDto[];

  @ApiPropertyOptional({
    enum: ["atomic", "best_effort"],
    default: "atomic",
    description:
      "atomic: rollback the whole batch if any row fails. best_effort: insert valid rows and report errors per row.",
  })
  @IsOptional()
  @IsIn(["atomic", "best_effort"])
  mode?: BulkImportMode;
}
