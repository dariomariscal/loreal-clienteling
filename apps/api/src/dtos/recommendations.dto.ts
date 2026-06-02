import {
  IsString,
  MaxLength,
  IsOptional,
  IsIn,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RECOMMENDATION_SOURCES, VISIT_PURPOSES } from "@loreal/contracts";

export class CreateRecommendationDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  productId: string;

  @ApiProperty({ type: String, enum: RECOMMENDATION_SOURCES, example: "manual" })
  @IsIn(RECOMMENDATION_SOURCES)
  source: string;

  @ApiPropertyOptional({ type: String, enum: VISIT_PURPOSES })
  @IsOptional()
  @IsIn(VISIT_PURPOSES)
  visitPurpose?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  aiReasoning?: string;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class AiRecommendationRequestDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ type: String, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  context?: string;
}

export class GenerateEngineRecommendationsDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 20,
    default: 5,
    description: "Maximum number of products to return.",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description: "Generate LLM rationale + WhatsApp draft per product.",
  })
  @IsOptional()
  @IsBoolean()
  withRationale?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description:
      "Persist the ranked output to the recommendations table (source = ai_suggested).",
  })
  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}
