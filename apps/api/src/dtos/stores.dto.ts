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
  Length,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { STORE_CHAINS, type StoreHours } from "@loreal/contracts";

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

  @ApiPropertyOptional({ type: String, example: "Miguel Hidalgo", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ type: String, example: "09016" })
  @IsOptional()
  @IsString()
  @Length(5, 5)
  municipalityId?: string;

  @ApiPropertyOptional({ type: String, example: "11560", maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postcode?: string;

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

  @ApiPropertyOptional({ type: String, example: "4491393400", maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Opening hours grouped by day range, plus optional click & collect block and access notes. Example: { "store": { "mon-sun": "11:00-21:00" }, "clickCollect": { "mon-sun": "11:00-21:00" }, "access": "Entrada por Playa y viaje" }',
  })
  @IsOptional()
  @IsObject()
  hours?: StoreHours;

  @ApiPropertyOptional({ type: [String], format: "uuid", description: "Brand IDs that operate in this store" })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  brandIds?: string[];
}

export class UpdateStoreDto extends PartialType(CreateStoreDto) {}
