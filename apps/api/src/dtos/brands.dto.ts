import { IsString, MinLength, MaxLength, IsIn, IsOptional, IsBoolean, IsObject, IsNumber, IsPositive, IsInt } from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { BRAND_TIERS } from "@loreal/contracts";

export class CreateBrandDto {
  @ApiProperty({ type: String, example: "LANCOME", minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiProperty({ type: String, example: "Lancôme", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName: string;

  @ApiProperty({ type: String, enum: BRAND_TIERS, example: "luxury" })
  @IsIn(BRAND_TIERS)
  tier: string;

  @ApiPropertyOptional({ type: String, maxLength: 500, example: "/logos/lancome.svg" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}

export class UpdateBrandDto extends PartialType(CreateBrandDto) {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertBrandConfigDto {
  @ApiPropertyOptional({ type: String, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string;

  @ApiPropertyOptional({ type: String, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  secondaryColor?: string;

  @ApiPropertyOptional({ type: String, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accentColor?: string;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fontFamily?: string;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  replenishmentRules?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isVirtualTryonEnabled?: boolean;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  vipThresholdAmount?: number;

  @ApiPropertyOptional({ type: Number, example: 12 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  vipThresholdPeriodMonths?: number;
}
