import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmail,
  IsIn,
  IsDate,
  IsUUID,
} from "class-validator";
import { Type } from "class-transformer";
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from "@nestjs/swagger";
import { GENDERS, LIFECYCLE_SEGMENTS } from "@loreal/contracts";
import { PaginationDto } from "./common.dto";

export class CreateCustomerDto {
  @ApiProperty({ type: String, example: "María", minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ type: String, example: "López", minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ type: String, example: "maria@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ type: String, example: "5551234567", minLength: 10, maxLength: 15 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phone?: string;

  @ApiPropertyOptional({
    type: String,
    enum: GENDERS,
    example: "female",
  })
  @IsOptional()
  @IsIn(GENDERS)
  gender?: string;

  @ApiPropertyOptional({ type: String, format: "date-time", example: "1990-05-15T00:00:00.000Z" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthDate?: Date;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class SearchCustomerDto {
  @ApiProperty({ type: String, example: "María López", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  query: string;

  @ApiPropertyOptional({ type: String, default: "name", enum: ["exact", "name", "semantic"] })
  @IsOptional()
  @IsIn(["exact", "name", "semantic"])
  type: string = "name";
}

export class CustomerFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ type: String, enum: LIFECYCLE_SEGMENTS })
  @IsOptional()
  @IsIn(LIFECYCLE_SEGMENTS)
  segment?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  baUserId?: string;

  @ApiPropertyOptional({ type: String, enum: ["name", "customerSince", "lastContactAt", "lastTransactionAt", "ltv"] })
  @IsOptional()
  @IsIn(["name", "customerSince", "lastContactAt", "lastTransactionAt", "ltv"])
  sortBy?: string;

  @ApiPropertyOptional({ type: String, enum: ["asc", "desc"] })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: string;
}
