import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsNumberString,
  IsUUID,
  IsHexColor,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export class CreateServiceTypeDto {
  @ApiProperty({
    type: String,
    example: "lancome_skin_genius",
    minLength: 1,
    maxLength: 30,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code: string;

  @ApiProperty({
    type: String,
    example: "Skin Genius diagnosis · Lancôme",
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, example: 45 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferAfterMinutes?: number;

  @ApiPropertyOptional({ type: String, example: "1200.00" })
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiPropertyOptional({ type: String, example: "#ec4899" })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  requiresConfirmation?: boolean;

  @ApiPropertyOptional({ type: Number, minimum: 0, example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minLeadTimeMinutes?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAdvanceDays?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateServiceTypeDto extends PartialType(CreateServiceTypeDto) {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
