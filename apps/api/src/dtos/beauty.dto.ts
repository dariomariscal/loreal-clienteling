import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsUUID,
  IsArray,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  SKIN_TYPES,
  SKIN_TONES,
  UNDERTONES,
  FITZPATRICK_SCALES,
  SKIN_CONCERNS,
  FRAGRANCE_FAMILIES,
  BEAUTY_INTERESTS,
  SHADE_CATEGORIES,
  HAIR_TYPES,
  HAIR_TEXTURES,
} from "@loreal/contracts";

export class UpsertBeautyProfileDto {
  // customerId comes from the URL path; controller overrides whatever the
  // client sends. Keep it optional so the body validates with or without it.
  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ type: String, enum: SKIN_TYPES })
  @IsOptional()
  @IsIn(SKIN_TYPES)
  skinType?: string;

  @ApiPropertyOptional({ type: String, enum: SKIN_TONES })
  @IsOptional()
  @IsIn(SKIN_TONES)
  skinTone?: string;

  @ApiPropertyOptional({ type: String, enum: FITZPATRICK_SCALES })
  @IsOptional()
  @IsIn(FITZPATRICK_SCALES)
  fitzpatrickScale?: string;

  @ApiPropertyOptional({ type: String, enum: UNDERTONES })
  @IsOptional()
  @IsIn(UNDERTONES)
  undertone?: string;

  @ApiPropertyOptional({ type: [String], enum: SKIN_CONCERNS })
  @IsOptional()
  @IsArray()
  @IsIn(SKIN_CONCERNS, { each: true })
  skinConcerns?: string[];

  @ApiPropertyOptional({ type: [String], example: ["retinol", "niacinamide"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredIngredients?: string[];

  @ApiPropertyOptional({ type: [String], example: ["alcohol", "parabens"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidedIngredients?: string[];

  @ApiPropertyOptional({ type: String, enum: HAIR_TYPES })
  @IsOptional()
  @IsIn(HAIR_TYPES)
  hairType?: string;

  @ApiPropertyOptional({ type: String, enum: HAIR_TEXTURES })
  @IsOptional()
  @IsIn(HAIR_TEXTURES)
  hairTexture?: string;

  @ApiPropertyOptional({ type: String, example: "Castaño oscuro", maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  hairColorCurrent?: string;

  @ApiPropertyOptional({ type: [String], enum: FRAGRANCE_FAMILIES })
  @IsOptional()
  @IsArray()
  @IsIn(FRAGRANCE_FAMILIES, { each: true })
  fragranceFamilies?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  makeupPreferences?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String], enum: BEAUTY_INTERESTS })
  @IsOptional()
  @IsArray()
  @IsIn(BEAUTY_INTERESTS, { each: true })
  interests?: string[];
}

export class CreateShadeMatchDto {
  @ApiProperty({ type: String, enum: SHADE_CATEGORIES, example: "foundation" })
  @IsIn(SHADE_CATEGORIES)
  category: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  brandId: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  productId: string;

  @ApiProperty({ type: String, example: "N4.5", minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  shadeCode: string;
}
