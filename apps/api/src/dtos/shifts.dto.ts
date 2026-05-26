import {
  IsUUID,
  IsIn,
  IsOptional,
  IsString,
  IsDate,
  Matches,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export const SHIFT_STATUSES = [
  "scheduled",
  "active",
  "completed",
  "off",
  "vacation",
  "sick",
] as const;

export class CreateShiftDto {
  @ApiProperty({ type: String })
  @IsString()
  userId: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  storeId: string;

  @ApiProperty({ type: String, example: "2026-05-26" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "shiftDate must be YYYY-MM-DD" })
  shiftDate: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTime?: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @ApiPropertyOptional({ enum: SHIFT_STATUSES, default: "scheduled" })
  @IsOptional()
  @IsIn(SHIFT_STATUSES as unknown as string[])
  status?: (typeof SHIFT_STATUSES)[number];

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {}

export class ShiftFiltersDto {
  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userId?: string;

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

  @ApiPropertyOptional({ enum: SHIFT_STATUSES })
  @IsOptional()
  @IsIn(SHIFT_STATUSES as unknown as string[])
  status?: (typeof SHIFT_STATUSES)[number];
}
