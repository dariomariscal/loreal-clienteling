import {
  IsUUID,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  IsObject,
  IsDate,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const APPROVAL_TYPES = [
  "reservation_long",
  "discount_special",
  "return",
  "vip_profile_change",
] as const;

export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export class CreateApprovalRequestDto {
  @ApiProperty({ enum: APPROVAL_TYPES })
  @IsIn(APPROVAL_TYPES as unknown as string[])
  type: (typeof APPROVAL_TYPES)[number];

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiProperty({
    type: Object,
    description: "Payload shape depends on `type`. See ApprovalType docs.",
  })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}

export class DecideApprovalRequestDto {
  @ApiProperty({ enum: ["approve", "reject"] })
  @IsIn(["approve", "reject"])
  decision: "approve" | "reject";

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ApprovalRequestFiltersDto {
  @ApiPropertyOptional({ enum: APPROVAL_STATUSES })
  @IsOptional()
  @IsIn(APPROVAL_STATUSES as unknown as string[])
  status?: (typeof APPROVAL_STATUSES)[number];

  @ApiPropertyOptional({ enum: APPROVAL_TYPES })
  @IsOptional()
  @IsIn(APPROVAL_TYPES as unknown as string[])
  type?: (typeof APPROVAL_TYPES)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  requestedByUserId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
