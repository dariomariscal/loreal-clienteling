import { IsUUID, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSampleDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    type: String,
    format: "uuid",
    description:
      "Specific variant (shade/size) handed out. Required to track shade-level conversion.",
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;
}
