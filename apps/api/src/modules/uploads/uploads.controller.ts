import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  Inject,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { UploadsService } from "./uploads.service";
import { AuditService } from "../../common/services/audit.service";
import type { UserSession } from "../../common/types/session";

@ApiTags("Uploads")
@ApiBearerAuth()
@Controller("uploads")
export class UploadsController {
  constructor(
    @Inject(UploadsService) private uploadsService: UploadsService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  @Post(":folder")
  @ApiParam({ name: "folder", type: String, description: "Target folder (e.g. logos, products, avatars, documents)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @Param("folder") folder: string,
    @UploadedFile() file: Express.Multer.File,
    @Session() session: UserSession,
  ) {
    const result = await this.uploadsService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder,
    );

    await this.auditService.log(
      session.user,
      "file_uploaded",
      "upload",
      result.key,
      { folder, originalName: file.originalname, mimeType: file.mimetype, size: file.size },
    );

    return result;
  }

  @Post(":folder/presigned")
  @ApiParam({ name: "folder", type: String })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        filename: { type: "string" },
        mimeType: { type: "string" },
      },
      required: ["filename", "mimeType"],
    },
  })
  async getPresignedUrl(
    @Param("folder") folder: string,
    @Body() body: { filename: string; mimeType: string },
  ) {
    return this.uploadsService.getPresignedUploadUrl(
      folder,
      body.filename,
      body.mimeType,
    );
  }

  @Delete()
  @Roles(["admin"])
  @ApiBody({
    schema: {
      type: "object",
      properties: { key: { type: "string" } },
      required: ["key"],
    },
  })
  async delete(
    @Body() body: { key: string },
    @Session() session: UserSession,
  ) {
    await this.uploadsService.delete(body.key);

    await this.auditService.log(
      session.user,
      "file_deleted",
      "upload",
      body.key,
    );

    return { deleted: true };
  }
}
