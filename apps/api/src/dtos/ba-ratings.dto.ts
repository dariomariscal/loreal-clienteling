import {
  IsUUID,
  IsIn,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const BA_RATING_SOURCES = [
  "post_visit_survey",
  "whatsapp_survey",
  "manager_attested",
  "counter_kiosk",
] as const;

export class CreateBaRatingDto {
  @ApiProperty({ type: String })
  @IsString()
  reviewedUserId: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ type: Number, minimum: 0, maximum: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  score: number;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiProperty({ enum: BA_RATING_SOURCES })
  @IsIn(BA_RATING_SOURCES as unknown as string[])
  source: (typeof BA_RATING_SOURCES)[number];
}

export class BaNpsFiltersDto {
  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

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
