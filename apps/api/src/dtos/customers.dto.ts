import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmail,
  IsIn,
  IsDate,
  IsUUID,
  IsBoolean,
  IsUrl,
  ValidateNested,
  IsObject,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type, Transform } from "class-transformer";

/**
 * Strip every non-digit and the optional Mexican country code so the DB
 * stores a clean 10-digit string. Validators downstream still enforce length.
 */
function normalizeMxPhone(raw: unknown): string | undefined {
  if (typeof raw !== "string") return raw as undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("52")) return digits.slice(2);
  return digits;
}
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

  @ApiPropertyOptional({ type: String, example: "5551234567", minLength: 10, maxLength: 10 })
  @IsOptional()
  @Transform(({ value }) => normalizeMxPhone(value))
  @IsString()
  @MinLength(10, { message: "El teléfono debe tener 10 dígitos (formato MX)" })
  @MaxLength(10, { message: "El teléfono debe tener 10 dígitos (formato MX)" })
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

  @ApiPropertyOptional({
    type: Number,
    description:
      "Filter customers whose birthday (month + day) falls in the next N days from today.",
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  birthdayWithinDays?: number;

  @ApiPropertyOptional({ type: String, enum: ["name", "customerSince", "lastContactAt", "lastTransactionAt", "ltv"] })
  @IsOptional()
  @IsIn(["name", "customerSince", "lastContactAt", "lastTransactionAt", "ltv"])
  sortBy?: string;

  @ApiPropertyOptional({ type: String, enum: ["asc", "desc"] })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: string;
}

// ── Registration (wizard payload: customer + consents in one shot) ──────────

export class MarketingChannelsDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;
}

export class RegistrationConsentsDto {
  @ApiProperty({ type: String, example: "1.0", maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  privacyNoticeVersion: string;

  @ApiProperty({
    type: String,
    example: "https://r2.dev/signatures/uuid.png",
    description: "URL of the uploaded signature PNG (use POST /uploads/signatures first).",
  })
  @IsString()
  @IsUrl({ require_tld: false })
  signatureUrl: string;

  @ApiProperty({ type: MarketingChannelsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => MarketingChannelsDto)
  marketingChannels: MarketingChannelsDto;
}

export class RegisterCustomerDto {
  @ApiProperty({ type: CreateCustomerDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer: CreateCustomerDto;

  @ApiProperty({ type: RegistrationConsentsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => RegistrationConsentsDto)
  consents: RegistrationConsentsDto;
}

// ── Duplicate check (pre-registration anti-dedup) ───────────────────────────

export class CheckDuplicateDto {
  @ApiPropertyOptional({ type: String, example: "maria@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ type: String, example: "5551234567" })
  @IsOptional()
  @Transform(({ value }) => normalizeMxPhone(value))
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  phone?: string;
}
