import {
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsUrl,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import {
  NOTIFICATION_KINDS,
  type NotificationKind,
} from "@loreal/contracts";

export const NOTIFICATION_LIST_STATUSES = [
  "unread",
  "read",
  "dismissed",
  "all",
] as const;
export type NotificationListStatus =
  (typeof NOTIFICATION_LIST_STATUSES)[number];

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    type: String,
    enum: NOTIFICATION_LIST_STATUSES,
    default: "unread",
  })
  @IsOptional()
  @IsIn(NOTIFICATION_LIST_STATUSES)
  status?: NotificationListStatus;

  @ApiPropertyOptional({ type: String, enum: NOTIFICATION_KINDS })
  @IsOptional()
  @IsIn(NOTIFICATION_KINDS)
  kind?: NotificationKind;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UpsertNotificationPreferenceDto {
  @ApiProperty({ type: String, enum: NOTIFICATION_KINDS })
  @IsIn(NOTIFICATION_KINDS)
  kind!: NotificationKind;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ type: String, example: "22:00" })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "quietHoursStart must be HH:MM (24h)",
  })
  quietHoursStart?: string | null;

  @ApiPropertyOptional({ type: String, example: "07:00" })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "quietHoursEnd must be HH:MM (24h)",
  })
  quietHoursEnd?: string | null;
}

class PushSubscriptionKeysDto {
  @ApiProperty({ type: String })
  @IsString()
  p256dh!: string;

  @ApiProperty({ type: String })
  @IsString()
  auth!: string;
}

export class CreatePushSubscriptionDto {
  @ApiProperty({ type: String })
  @IsUrl({ require_tld: false, require_protocol: true })
  endpoint!: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ type: String, example: "iPad mostrador 1" })
  @IsOptional()
  @IsString()
  deviceLabel?: string;
}
