import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsUUID,
  IsDate,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  COMMUNICATION_CHANNELS,
  CAMPAIGN_TYPES,
  MESSAGE_DIRECTIONS,
  MESSAGE_STATUSES,
} from "@loreal/contracts";

export class CreateMessageDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: String, enum: COMMUNICATION_CHANNELS, example: "whatsapp" })
  @IsIn(COMMUNICATION_CHANNELS)
  channel: string;

  @ApiPropertyOptional({
    type: String,
    enum: MESSAGE_DIRECTIONS,
    default: "outbound",
    description:
      "outbound = sent by the advisor (default); inbound = received from the customer via provider webhook.",
  })
  @IsOptional()
  @IsIn(MESSAGE_DIRECTIONS)
  direction?: string;

  @ApiPropertyOptional({ type: String, enum: MESSAGE_STATUSES })
  @IsOptional()
  @IsIn(MESSAGE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ type: String, maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  fromAddress?: string;

  @ApiPropertyOptional({ type: String, maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  toAddress?: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 128,
    description: "Provider message id (Twilio SID, WhatsApp wamid). Used for idempotency.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  providerMessageId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ type: String, example: "Hola María, tu cita está confirmada.", minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional({
    type: String,
    enum: CAMPAIGN_TYPES,
    example: "replenishment",
    description: "Required for outbound campaign messages; omitted for inbound.",
  })
  @IsOptional()
  @IsIn(CAMPAIGN_TYPES)
  campaignType?: string;
}

export class CreateTemplateDto {
  @ApiProperty({ type: String, example: "Seguimiento 3 meses", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty({ type: String, enum: COMMUNICATION_CHANNELS, example: "whatsapp" })
  @IsIn(COMMUNICATION_CHANNELS)
  channel: string;

  @ApiProperty({ type: String, enum: CAMPAIGN_TYPES, example: "replenishment" })
  @IsIn(CAMPAIGN_TYPES)
  campaignType: string;

  @ApiProperty({ type: String, minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}

export class UpdateTrackingDto {
  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deliveredAt?: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  readAt?: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  respondedAt?: Date;
}
