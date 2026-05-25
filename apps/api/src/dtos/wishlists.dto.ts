import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsInt,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const WISHLIST_KINDS = ["wishlist", "lookbook"] as const;
export const SHARE_CHANNELS = ["whatsapp", "sms", "email", "link"] as const;

export class WishlistItemInputDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateWishlistDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: String, maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ type: String, enum: WISHLIST_KINDS, default: "wishlist" })
  @IsOptional()
  @IsIn(WISHLIST_KINDS)
  kind?: (typeof WISHLIST_KINDS)[number];

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: [WishlistItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WishlistItemInputDto)
  items?: WishlistItemInputDto[];
}

export class UpdateWishlistDto {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class ShareWishlistDto {
  @ApiProperty({ type: String, enum: SHARE_CHANNELS })
  @IsIn(SHARE_CHANNELS)
  channel: (typeof SHARE_CHANNELS)[number];
}

export class AddWishlistItemDto extends WishlistItemInputDto {}

export class UpdateWishlistItemDto {
  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
