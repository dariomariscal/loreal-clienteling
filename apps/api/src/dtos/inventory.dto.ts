import { IsUUID, IsOptional, IsIn, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export const STOCK_STATUSES = ["available", "low", "out_of_stock"] as const;

export class InventoryAlertsFiltersDto {
  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    enum: STOCK_STATUSES,
    isArray: true,
    description: "Defaults to ['low', 'out_of_stock']",
  })
  @IsOptional()
  status?: (typeof STOCK_STATUSES)[number] | (typeof STOCK_STATUSES)[number][];

  @ApiPropertyOptional({ type: Number, default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
