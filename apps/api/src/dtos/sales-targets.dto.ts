import {
  IsUUID,
  IsIn,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export const SALES_TARGET_PERIODS = ["daily", "monthly"] as const;

export class CreateSalesTargetDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  storeId: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  brandId: string;

  @ApiProperty({ enum: SALES_TARGET_PERIODS })
  @IsIn(SALES_TARGET_PERIODS as unknown as string[])
  period: (typeof SALES_TARGET_PERIODS)[number];

  @ApiProperty({ type: String, example: "2026-05-26", description: "ISO date (YYYY-MM-DD). For monthly, first day of the month." })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "periodDate must be YYYY-MM-DD" })
  periodDate: string;

  @ApiProperty({ type: Number, example: 25000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  targetAmount: number;

  @ApiPropertyOptional({ type: String, default: "MXN", maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateSalesTargetDto extends PartialType(CreateSalesTargetDto) {}

export class SalesTargetFiltersDto {
  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ enum: SALES_TARGET_PERIODS })
  @IsOptional()
  @IsIn(SALES_TARGET_PERIODS as unknown as string[])
  period?: (typeof SALES_TARGET_PERIODS)[number];

  @ApiPropertyOptional({ type: String, example: "2026-05-01" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ type: String, example: "2026-05-31" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
