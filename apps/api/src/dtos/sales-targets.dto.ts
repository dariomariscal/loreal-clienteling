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

export const TARGET_OWNER_TYPES = ["counter", "user", "store", "area"] as const;

export const TARGET_METRIC_KINDS = [
  "sales_amount",
  "sales_units",
  "appointments_booked",
  "appointments_completed",
  "follow_ups_completed",
  "new_customers",
  "samples_given",
  "visits",
] as const;

export const TARGET_PERIOD_KINDS = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
] as const;

export class CreateSalesTargetDto {
  @ApiPropertyOptional({ enum: TARGET_OWNER_TYPES, default: "counter" })
  @IsOptional()
  @IsIn(TARGET_OWNER_TYPES as unknown as string[])
  ownerType?: (typeof TARGET_OWNER_TYPES)[number];

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ type: String, description: "User id when ownerType='user'" })
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @ApiPropertyOptional({ enum: TARGET_METRIC_KINDS, default: "sales_amount" })
  @IsOptional()
  @IsIn(TARGET_METRIC_KINDS as unknown as string[])
  metricKind?: (typeof TARGET_METRIC_KINDS)[number];

  @ApiProperty({ enum: TARGET_PERIOD_KINDS })
  @IsIn(TARGET_PERIOD_KINDS as unknown as string[])
  periodKind: (typeof TARGET_PERIOD_KINDS)[number];

  @ApiProperty({ type: String, example: "2026-05-01" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "periodStart must be YYYY-MM-DD" })
  periodStart: string;

  @ApiProperty({ type: String, example: "2026-05-31" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "periodEnd must be YYYY-MM-DD" })
  periodEnd: string;

  @ApiProperty({ type: Number, example: 25000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  targetValue: number;

  @ApiPropertyOptional({ type: String, default: "MXN", maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  parentTargetId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateSalesTargetDto extends PartialType(CreateSalesTargetDto) {}

export class SalesTargetFiltersDto {
  @ApiPropertyOptional({ enum: TARGET_OWNER_TYPES })
  @IsOptional()
  @IsIn(TARGET_OWNER_TYPES as unknown as string[])
  ownerType?: (typeof TARGET_OWNER_TYPES)[number];

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @ApiPropertyOptional({ enum: TARGET_METRIC_KINDS })
  @IsOptional()
  @IsIn(TARGET_METRIC_KINDS as unknown as string[])
  metricKind?: (typeof TARGET_METRIC_KINDS)[number];

  @ApiPropertyOptional({ enum: TARGET_PERIOD_KINDS })
  @IsOptional()
  @IsIn(TARGET_PERIOD_KINDS as unknown as string[])
  periodKind?: (typeof TARGET_PERIOD_KINDS)[number];

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
