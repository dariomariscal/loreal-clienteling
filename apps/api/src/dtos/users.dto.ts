import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsUUID,
  IsEmail,
} from "class-validator";
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { USER_ROLES } from "@loreal/contracts";

export class CreateUserDto {
  @ApiProperty({ type: String, example: "user@loreal.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ type: String, example: "María López", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName: string;

  @ApiProperty({ type: String, enum: USER_ROLES, example: "ba" })
  @IsIn(USER_ROLES)
  role: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  brandId?: string;
}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ["email"] as const),
) {}

/**
 * Self-service payload — the only field a user is allowed to change about
 * themselves through the API. Avatar and password are mutated via Clerk
 * directly from the client SDK (their changes flow back through webhooks).
 */
export class UpdateMeDto {
  @ApiPropertyOptional({ type: String, example: "María López", minLength: 1, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName?: string;
}

export class LoginDto {
  @ApiProperty({ type: String, example: "user@loreal.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ type: String, example: "password123", minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
