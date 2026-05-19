import {
  IsString,
  MaxLength,
  IsOptional,
  IsIn,
  IsUUID,
  IsDate,
  IsInt,
  IsPositive,
  Max,
  IsBoolean,
  IsUrl,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { APPOINTMENT_STATUSES } from "@loreal/contracts";

export class CreateAppointmentDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: String, format: "uuid", description: "FK to appointment_event_types.id" })
  @IsUUID()
  eventTypeId: string;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDate()
  @Type(() => Date)
  scheduledAt: Date;

  @ApiProperty({ type: Number, example: 60, minimum: 1, maximum: 480 })
  @IsInt()
  @IsPositive()
  @Max(480)
  durationMinutes: number;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean = false;

  @ApiPropertyOptional({ type: String, example: "https://meet.google.com/abc-defg-hij" })
  @IsOptional()
  @IsUrl()
  videoLink?: string;
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
  scheduledAt?: Date;

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
  comments?: string;
}
