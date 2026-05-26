import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export class CreateDivisionDto {
  @ApiProperty({
    type: String,
    example: "luxe",
    minLength: 1,
    maxLength: 30,
    description:
      "Stable identifier used as URL slug and in user/brand scope lookups.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code: string;

  @ApiProperty({
    type: String,
    example: "L'Oréal Luxe",
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDivisionDto extends PartialType(CreateDivisionDto) {}
