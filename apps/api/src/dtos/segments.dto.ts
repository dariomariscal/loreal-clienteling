import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  ValidateNested,
  MaxLength,
  Min,
  IsInt,
  IsUUID,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const LIFECYCLE_STAGES = [
  "new",
  "returning",
  "vip",
  "at_risk",
  "dormant",
] as const;

export const LOYALTY_TIERS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "vip",
] as const;

/**
 * Filter schema persisted in customer_segments.filter (jsonb). Resolved to SQL
 * at query time. Keep the shape narrow — adding fields here means adding
 * resolver branches in SegmentsService.
 */
export class SegmentFilterDto {
  @ApiPropertyOptional({ type: [String], enum: LIFECYCLE_STAGES })
  @IsOptional()
  @IsArray()
  @IsIn(LIFECYCLE_STAGES, { each: true })
  lifecycleStages?: (typeof LIFECYCLE_STAGES)[number][];

  @ApiPropertyOptional({ type: [String], enum: LOYALTY_TIERS })
  @IsOptional()
  @IsArray()
  @IsIn(LOYALTY_TIERS, { each: true })
  loyaltyTiers?: (typeof LOYALTY_TIERS)[number][];

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysSinceLastOrderMin?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysSinceLastOrderMax?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalSpentMin?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordersCountMin?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  assignedToMe?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  birthdayThisMonth?: boolean;
}

export class CreateSegmentDto {
  @ApiProperty({ type: String, maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ type: SegmentFilterDto })
  @ValidateNested()
  @Type(() => SegmentFilterDto)
  filter: SegmentFilterDto;

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description: "Dynamic segments re-evaluate on each read.",
  })
  @IsOptional()
  @IsBoolean()
  isDynamic?: boolean;
}

export class UpdateSegmentDto {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: SegmentFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SegmentFilterDto)
  filter?: SegmentFilterDto;
}

export class ListSegmentCustomersQueryDto {
  @ApiPropertyOptional({ type: Number, default: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class PreviewSegmentDto {
  @ApiProperty({ type: SegmentFilterDto })
  @ValidateNested()
  @Type(() => SegmentFilterDto)
  filter: SegmentFilterDto;
}
