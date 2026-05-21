import { Controller, Get, Param, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery, ApiParam } from "@nestjs/swagger";
import { PrivacyNoticesService } from "./privacy-notices.service";

@ApiTags("Privacy Notices")
@ApiBearerAuth()
@Controller("privacy-notices")
export class PrivacyNoticesController {
  constructor(
    @Inject(PrivacyNoticesService)
    private privacyNoticesService: PrivacyNoticesService,
  ) {}

  @Get("active")
  @ApiQuery({ name: "lang", required: false, type: String, example: "es-MX" })
  findActive(@Query("lang") lang?: string) {
    return this.privacyNoticesService.findActive(lang ?? "es-MX");
  }

  @Get(":version")
  @ApiParam({ name: "version", type: String, example: "1.0" })
  @ApiQuery({ name: "lang", required: false, type: String })
  findByVersion(
    @Param("version") version: string,
    @Query("lang") lang?: string,
  ) {
    return this.privacyNoticesService.findByVersion(version, lang ?? "es-MX");
  }
}
