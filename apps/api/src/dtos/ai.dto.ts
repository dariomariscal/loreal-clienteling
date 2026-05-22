import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ExtractNoteFromTextDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  rawText: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ type: String, example: "es" })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  language?: string;
}

export class SemanticSearchDto {
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
  limit?: number;
}

export class DailyOpportunitiesQueryDto {
  @ApiPropertyOptional({
    type: String,
    example: "2026-05-22",
    description: "ISO date (YYYY-MM-DD). Defaults to today in server tz.",
  })
  @IsOptional()
  @Matches(ISO_DATE, { message: "forDate must be YYYY-MM-DD" })
  forDate?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 20, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
