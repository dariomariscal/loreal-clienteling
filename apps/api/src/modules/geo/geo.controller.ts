import { Controller, Get, Inject, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { GeoService } from "./geo.service";

@ApiTags("Geo")
@ApiBearerAuth()
@Controller("geo")
export class GeoController {
  constructor(@Inject(GeoService) private geoService: GeoService) {}

  @Get("municipalities")
  @Roles(["admin", "supervisor", "manager", "ba"])
  @ApiQuery({ name: "stateCode", required: false, example: "09" })
  listMunicipalities(@Query("stateCode") stateCode?: string) {
    return this.geoService.listMunicipalities(stateCode);
  }

  @Get("municipalities/boundaries")
  @Roles(["admin", "supervisor", "manager", "ba"])
  @ApiQuery({ name: "stateCode", required: false, example: "09" })
  @ApiQuery({ name: "simplify", required: false, example: 0.001, description: "Simplify tolerance in degrees" })
  municipalitiesGeoJson(
    @Query("stateCode") stateCode?: string,
    @Query("simplify") simplify?: string,
  ) {
    const simplifyTolerance = simplify ? Number(simplify) : undefined;
    return this.geoService.municipalitiesGeoJson({
      stateCode,
      simplifyTolerance:
        simplifyTolerance && !Number.isNaN(simplifyTolerance) ? simplifyTolerance : undefined,
    });
  }
}
