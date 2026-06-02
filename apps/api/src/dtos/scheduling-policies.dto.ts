import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsIn,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SLOT_GRANULARITY_VALUES } from "@loreal/contracts";

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateSchedulingPolicyDto {
  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @ApiProperty({ type: Number, enum: SLOT_GRANULARITY_VALUES, example: 30 })
  @IsIn(SLOT_GRANULARITY_VALUES)
  slotGranularityMinutes: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minLeadTimeMinutes?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAdvanceDays?: number;

  @ApiPropertyOptional({
    description: "Day-of-week toggles. Missing keys default to true.",
    example: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
  })
  @IsOptional()
  @IsObject()
  activeDays?: {
    mon?: boolean;
    tue?: boolean;
    wed?: boolean;
    thu?: boolean;
    fri?: boolean;
    sat?: boolean;
    sun?: boolean;
  };

  @ApiPropertyOptional({ type: String, example: "10:00" })
  @IsOptional()
  @Matches(HHMM_REGEX)
  workWindowStart?: string;

  @ApiPropertyOptional({ type: String, example: "20:00" })
  @IsOptional()
  @Matches(HHMM_REGEX)
  workWindowEnd?: string;

  @ApiPropertyOptional({
    description: 'Blackout date ranges as `[{from, to, reason}]`',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  blackoutDates?: Array<{ from: string; to: string; reason?: string }>;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateSchedulingPolicyDto extends CreateSchedulingPolicyDto {}
