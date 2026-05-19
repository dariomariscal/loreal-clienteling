import {
  IsString,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayUnique,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { STORE_CHAINS } from "@loreal/contracts";

export class CreateStoreDto {
  @ApiProperty({ type: String, example: "LIV-SANTA-FE", minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiProperty({ type: String, example: "Liverpool Santa Fe", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName: string;

  @ApiProperty({ type: String, enum: STORE_CHAINS, example: "liverpool" })
  @IsIn(STORE_CHAINS)
  chain: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ type: String, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ type: String, example: "Ciudad de México", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ type: String, example: "CDMX", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ type: Number, example: 19.4326 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ type: Number, example: -99.1332 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ type: [String], format: "uuid", description: "Brand IDs that operate in this store" })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  brandIds?: string[];
}

export class UpdateStoreDto extends PartialType(CreateStoreDto) {}
