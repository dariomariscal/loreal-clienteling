import { Controller, Get, Inject, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { GeoService } from "./geo.service";
import type { UserSession } from "../../common/types/session";

@ApiTags("Geo")
@ApiBearerAuth()
@Controller("geo")
export class GeoController {
  constructor(@Inject(GeoService) private geoService: GeoService) {}

  @Get("municipalities")
  @Roles(["admin", "area_manager", "counter_manager", "beauty_advisor"])
  @ApiQuery({ name: "stateCode", required: false, example: "09" })
  listMunicipalities(@Query("stateCode") stateCode?: string) {
    return this.geoService.listMunicipalities(stateCode);
  }

  @Get("municipalities/boundaries")
  @Roles(["admin", "area_manager", "counter_manager", "beauty_advisor"])
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

  @Get("customer-density")
  @Roles([
    "admin",
    "area_manager",
    "national_retail_manager",
    "counter_manager",
  ])
  @ApiQuery({ name: "geojson", required: false, type: Boolean })
  @ApiQuery({ name: "simplify", required: false, type: Number })
  customerDensity(
    @Session() session: UserSession,
    @Query("geojson") geojson?: string,
    @Query("simplify") simplify?: string,
  ) {
    const tol = simplify ? Number(simplify) : undefined;
    return this.geoService.customerDensity(session.user, {
      geojson: geojson === "true",
      simplifyTolerance: tol && !Number.isNaN(tol) ? tol : undefined,
    });
  }
}
