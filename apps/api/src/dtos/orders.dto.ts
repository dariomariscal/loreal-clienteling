import {
  IsString,
  MinLength,
  IsOptional,
  IsIn,
  IsUUID,
  IsNumber,
  IsPositive,
  IsInt,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ORDER_SOURCES } from "@loreal/contracts";

export class OrderLineItemDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  productId: string;

  @ApiProperty({ type: String, example: "SKU-001", minLength: 1 })
  @IsString()
  @MinLength(1)
  sku: string;

  @ApiProperty({ type: Number, example: 2, minimum: 1 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ type: Number, example: 1299.0, minimum: 0 })
  @IsNumber()
  @IsPositive()
  unitPrice: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: String, enum: ORDER_SOURCES, example: "manual" })
  @IsIn(ORDER_SOURCES)
  sourceName: string;

  @ApiProperty({ type: [OrderLineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineItemDto)
  items: OrderLineItemDto[];

  @ApiProperty({ type: Number, example: 2598.0, minimum: 0 })
  @IsNumber()
  @IsPositive()
  totalPrice: number;

  @ApiPropertyOptional({ type: String, example: "POS-12345" })
  @IsOptional()
  @IsString()
  externalOrderId?: string;
}
