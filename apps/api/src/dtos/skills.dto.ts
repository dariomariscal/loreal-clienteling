import {
  IsString,
  MaxLength,
  IsOptional,
  IsIn,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsDate,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SKILL_CATEGORIES } from "@loreal/contracts";

export class CreateSkillDto {
  @ApiProperty({ type: String, maxLength: 50, example: "brand_lancome" })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    type: String,
    maxLength: 200,
    example: "Lancôme certified",
  })
  @IsString()
  @MaxLength(200)
  displayName: string;

  @ApiProperty({ type: String, enum: SKILL_CATEGORIES })
  @IsIn(SKILL_CATEGORIES)
  category: string;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSkillDto {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ type: String, enum: SKILL_CATEGORIES })
  @IsOptional()
  @IsIn(SKILL_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class AssignSkillToUserDto {
  @ApiProperty({ type: String })
  @IsString()
  userId: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  skillId: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  proficiency?: number;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}

export class AssignSkillToServiceTypeDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  serviceTypeId: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  skillId: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  minProficiency?: number;
}
