import {
  IsString,
  MaxLength,
  IsOptional,
  IsIn,
  IsUUID,
  IsDate,
  IsInt,
  IsPositive,
  Min,
  Max,
  IsBoolean,
  IsUrl,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_OUTCOME_CODES,
  APPOINTMENT_CANCELLATION_REASONS,
  APPOINTMENT_NO_SHOW_REASONS,
} from "@loreal/contracts";

export class CreateAppointmentDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    type: String,
    format: "uuid",
    description: "FK to service_types.id",
  })
  @IsUUID()
  serviceTypeId: string;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({ type: Number, example: 60, minimum: 1, maximum: 480 })
  @IsInt()
  @IsPositive()
  @Max(480)
  durationMinutes: number;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean = false;

  @ApiPropertyOptional({
    type: String,
    example: "https://meet.google.com/abc-defg-hij",
  })
  @IsOptional()
  @IsUrl()
  meetingUrl?: string;

  @ApiPropertyOptional({
    description: "Customer-supplied briefing (goals, concerns, allergies).",
  })
  @IsOptional()
  @IsObject()
  preForm?: {
    goals?: string[];
    concerns?: string[];
    allergies?: string[];
    notes?: string;
  };

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  seriesId?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  seriesSequence?: number;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ type: String, enum: APPOINTMENT_STATUSES })
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTime?: Date;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 480 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  preForm?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  serviceOutcome?: Record<string, unknown>;

  @ApiPropertyOptional({ type: String, enum: APPOINTMENT_OUTCOME_CODES })
  @IsOptional()
  @IsIn(APPOINTMENT_OUTCOME_CODES)
  outcomeCode?: string;
}

export class CancelAppointmentDto {
  @ApiProperty({ type: String, enum: APPOINTMENT_CANCELLATION_REASONS })
  @IsIn(APPOINTMENT_CANCELLATION_REASONS)
  reason: string;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class MarkNoShowDto {
  @ApiProperty({ type: String, enum: APPOINTMENT_NO_SHOW_REASONS })
  @IsIn(APPOINTMENT_NO_SHOW_REASONS)
  reason: string;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ConfirmAppointmentByCustomerDto {
  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  confirmedAt?: Date;
}

/**
 * Create a recurring appointment series. The base occurrence is the first
 * row inserted (its id becomes the seriesId); subsequent occurrences are
 * `intervalDays` apart, up to `occurrences` total.
 */
export class CreateAppointmentSeriesDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  serviceTypeId: string;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDate()
  @Type(() => Date)
  firstStartTime: Date;

  @ApiProperty({ type: Number, example: 60, minimum: 1, maximum: 480 })
  @IsInt()
  @IsPositive()
  @Max(480)
  durationMinutes: number;

  @ApiProperty({
    type: Number,
    example: 7,
    description: "Days between occurrences (7 = weekly, 14 = biweekly).",
    minimum: 1,
    maximum: 90,
  })
  @IsInt()
  @Min(1)
  @Max(90)
  intervalDays: number;

  @ApiProperty({
    type: Number,
    example: 4,
    description: "Total occurrences including the first.",
    minimum: 2,
    maximum: 26,
  })
  @IsInt()
  @Min(2)
  @Max(26)
  occurrences: number;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  preForm?: {
    goals?: string[];
    concerns?: string[];
    allergies?: string[];
    notes?: string;
  };
}

/**
 * Cancel a whole series (scope=all) or a single occurrence (scope=one).
 * "one" delegates to the single-cancel path so cancellation_reason is set.
 */
export class CancelAppointmentSeriesDto {
  @ApiProperty({ type: String, enum: ["one", "all"] })
  @IsIn(["one", "all"])
  scope: "one" | "all";

  @ApiProperty({ type: String, enum: APPOINTMENT_CANCELLATION_REASONS })
  @IsIn(APPOINTMENT_CANCELLATION_REASONS)
  reason: string;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CheckOutAppointmentDto {
  @ApiProperty({ type: String, enum: APPOINTMENT_OUTCOME_CODES })
  @IsIn(APPOINTMENT_OUTCOME_CODES)
  outcomeCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  serviceOutcome?: {
    productsUsed?: string[];
    satisfactionScore?: number;
    notes?: string;
  };

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
