import {
  IsOptional,
  IsUUID,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export const TASK_STATUSES = ["pending", "dismissed", "completed", "all"] as const;
export type TaskStatusFilter = (typeof TASK_STATUSES)[number];

export class ListTasksQueryDto {
  @ApiPropertyOptional({ type: String, enum: TASK_STATUSES, default: "pending" })
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatusFilter;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ type: String, example: "2026-05-25" })
  @IsOptional()
  @IsDateString()
  dueOn?: string;

  @ApiPropertyOptional({ type: String, example: "2026-05-25" })
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @ApiPropertyOptional({ type: String, example: "2026-06-01" })
  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  triggerType?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class SnoozeTaskDto {
  @ApiPropertyOptional({ type: String, example: "2026-05-30" })
  @IsDateString()
  dueDate: string;
}
