import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsInt,
  IsDateString,
  IsUrl,
  Min,
  MaxLength,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const EVENT_KINDS = [
  "masterclass",
  "launch",
  "vip_preview",
  "trunk_show",
  "discovery",
] as const;

export const EVENT_STATUSES = [
  "scheduled",
  "live",
  "completed",
  "cancelled",
] as const;

export const RSVP_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "waitlist",
] as const;

export class CreateEventDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  storeId: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty({ type: String, maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ type: String, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ type: String, enum: EVENT_KINDS })
  @IsIn(EVENT_KINDS)
  kind: (typeof EVENT_KINDS)[number];

  @ApiProperty({ type: String, format: "date-time" })
  @IsDateString()
  startTime: string;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  coverImageUrl?: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ type: String, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional({ type: String, enum: EVENT_STATUSES })
  @IsOptional()
  @IsIn(EVENT_STATUSES)
  status?: (typeof EVENT_STATUSES)[number];
}

export class ListEventsQueryDto {
  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ type: String, enum: EVENT_STATUSES })
  @IsOptional()
  @IsIn(EVENT_STATUSES)
  status?: (typeof EVENT_STATUSES)[number];

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class InviteCustomerDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;
}

export class InviteCustomersDto {
  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @IsUUID("4", { each: true })
  customerIds: string[];
}

export class UpdateRsvpDto {
  @ApiProperty({ type: String, enum: RSVP_STATUSES })
  @IsIn(RSVP_STATUSES)
  rsvpStatus: (typeof RSVP_STATUSES)[number];
}

export const EVENT_ASSIGNMENT_ROLES = ["lead", "staff", "mua", "host"] as const;

export class AssignBaToEventDto {
  @ApiProperty({ type: String, description: "Clerk userId of the BA being assigned" })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ enum: EVENT_ASSIGNMENT_ROLES, default: "staff" })
  @IsOptional()
  @IsIn(EVENT_ASSIGNMENT_ROLES as unknown as string[])
  role?: (typeof EVENT_ASSIGNMENT_ROLES)[number];
}
