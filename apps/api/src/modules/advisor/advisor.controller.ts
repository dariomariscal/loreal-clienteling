import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { AdvisorService } from "./advisor.service";
import type { UserSession } from "../../common/types/session";

@ApiTags("Advisor")
@ApiBearerAuth()
@Controller("advisor")
export class AdvisorController {
  constructor(
    @Inject(AdvisorService) private advisorService: AdvisorService,
  ) {}

  /**
   * The Beauty Advisor's "Today" feed. Returns the five buckets a BA needs
   * to start the day, in a single payload so the home screen renders in one
   * fetch. Industry standard (Tulip "Advisor", Salesfloor "Outreach"):
   *
   * - appointmentsToday: today's bookings (any status), oldest first
   * - upcomingBirthdays: customers whose birthday lands in the next 7 days
   * - atRiskCustomers: top 10 of the BA's clients flagged `at_risk`
   * - newCustomersThisWeek: customers the BA registered or last interacted
   *   with in the past 7 days
   * - pendingFollowups: lifecycle alerts the scheduler created but the BA
   *   hasn't acted on yet (stored as communications without delivery yet)
   *
   * The endpoint is BA-centric; managers and admins receive the same shape
   * but scoped to their store, which is useful when they cover a shift.
   */
  @Get("today")
  @Roles(["ba", "manager", "supervisor", "admin"])
  today(@Session() session: UserSession) {
    return this.advisorService.getToday(session.user);
  }
}
