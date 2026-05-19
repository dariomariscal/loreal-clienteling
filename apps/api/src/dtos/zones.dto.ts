import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsHexColor,
  IsArray,
  ArrayUnique,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export class CreateZoneDto {
  @ApiProperty({ type: String, example: "CDMX-NOR", minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiProperty({ type: String, example: "CDMX Norte", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName: string;

  @ApiPropertyOptional({ type: String, example: "#D4AF37" })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ type: String, example: "map-pin", maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["09015", "09016"],
    description: "INEGI 5-digit municipality codes that compose this zone",
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Length(5, 5, { each: true })
  municipalityIds?: string[];
}

export class UpdateZoneDto extends PartialType(CreateZoneDto) {}
