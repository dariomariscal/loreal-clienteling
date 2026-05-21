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
  SKIN_SUBTONES,
  SKIN_CONCERNS,
  FRAGRANCE_PREFERENCES,
  ROUTINE_TYPES,
  BEAUTY_INTERESTS,
  SHADE_CATEGORIES,
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

  @ApiPropertyOptional({ type: String, enum: SKIN_SUBTONES })
  @IsOptional()
  @IsIn(SKIN_SUBTONES)
  skinSubtone?: string;

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

  @ApiPropertyOptional({ type: [String], enum: FRAGRANCE_PREFERENCES })
  @IsOptional()
  @IsArray()
  @IsIn(FRAGRANCE_PREFERENCES, { each: true })
  fragrancePreferences?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  makeupPreferences?: Record<string, unknown>;

  @ApiPropertyOptional({ type: String, enum: ROUTINE_TYPES })
  @IsOptional()
  @IsIn(ROUTINE_TYPES)
  routineType?: string;

  @ApiPropertyOptional({ type: [String], enum: BEAUTY_INTERESTS })
  @IsOptional()
  @IsArray()
  @IsIn(BEAUTY_INTERESTS, { each: true })
  interests?: string[];
}

export class CreateShadeDto {
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
