import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/decorators/public.decorator";

@ApiTags("Health")
@Controller()
export class HealthController {
  @Get("health")
  @Public()
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
