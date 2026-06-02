import { IsString, IsOptional, IsUUID, MinLength, MaxLength, IsIn } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const SCAN_ACTION_TYPES = [
  "add_to_cart",
  "add_to_wishlist",
  "reserve",
  "sample_logged",
  "shown_to_customer",
  "send_whatsapp",
  "viewed_only",
] as const;

export class ProductLookupQueryDto {
  @ApiProperty({
    type: String,
    description: "EAN-13 barcode or SKU literal.",
    example: "361427300240W",
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  barcode: string;

  @ApiPropertyOptional({
    type: String,
    format: "uuid",
    description:
      "Active customer to attach signals against. Omit for anonymous stock-check scans.",
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class CreateScanEventDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  variantId: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: SCAN_ACTION_TYPES })
  @IsOptional()
  @IsIn(SCAN_ACTION_TYPES)
  actionTaken?: (typeof SCAN_ACTION_TYPES)[number];
}
