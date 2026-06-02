import {
  IsString,
  IsOptional,
  IsIn,
  IsUUID,
  IsDate,
  IsInt,
  IsPositive,
  Min,
  MaxLength,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  VISIT_CHANNELS,
  VISIT_REASONS,
  BOOKED_REASONS,
  VISIT_OUTCOMES,
  VISIT_SENTIMENTS,
} from "@loreal/contracts";

export class VisitProductViewDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  variantId?: string;
}

export class StartVisitDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    type: String,
    format: "uuid",
    description: "Set when the visit started from a booked appointment",
  })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional({ type: String, enum: VISIT_CHANNELS })
  @IsOptional()
  @IsIn(VISIT_CHANNELS)
  visitChannel?: string;

  @ApiPropertyOptional({ type: String, enum: BOOKED_REASONS })
  @IsOptional()
  @IsIn(BOOKED_REASONS)
  bookedReason?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  partySize?: number;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startedAt?: Date;
}

export class UpdateVisitDto {
  @ApiPropertyOptional({ type: String, enum: VISIT_CHANNELS })
  @IsOptional()
  @IsIn(VISIT_CHANNELS)
  visitChannel?: string;

  @ApiPropertyOptional({ type: String, enum: BOOKED_REASONS })
  @IsOptional()
  @IsIn(BOOKED_REASONS)
  bookedReason?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  partySize?: number;

  @ApiPropertyOptional({ type: String, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [VisitProductViewDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisitProductViewDto)
  productsViewed?: VisitProductViewDto[];
}

export class CloseVisitDto {
  @ApiProperty({ type: String, enum: VISIT_REASONS })
  @IsIn(VISIT_REASONS)
  visitReason: string;

  @ApiProperty({ type: String, enum: VISIT_OUTCOMES })
  @IsIn(VISIT_OUTCOMES)
  outcome: string;

  @ApiPropertyOptional({ type: String, enum: VISIT_SENTIMENTS })
  @IsOptional()
  @IsIn(VISIT_SENTIMENTS)
  sentiment?: string;

  @ApiPropertyOptional({ type: String, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [VisitProductViewDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisitProductViewDto)
  productsViewed?: VisitProductViewDto[];

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  convertedOrderId?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  followUpDate?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Defaults to now() on the server. Allows backfilling a paper log.",
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endedAt?: Date;
}

export class AbandonVisitDto {
  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
