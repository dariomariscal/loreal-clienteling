import {
  IsString,
  MaxLength,
  IsOptional,
  IsIn,
  IsUUID,
  IsInt,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PREPARED_PRODUCT_STATUSES } from "@loreal/contracts";

export class AddPreparedProductDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ type: String, enum: PREPARED_PRODUCT_STATUSES })
  @IsOptional()
  @IsIn(PREPARED_PRODUCT_STATUSES)
  status?: string;
}

export class UpdatePreparedProductStatusDto {
  @ApiProperty({ type: String, enum: PREPARED_PRODUCT_STATUSES })
  @IsIn(PREPARED_PRODUCT_STATUSES)
  status: string;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
