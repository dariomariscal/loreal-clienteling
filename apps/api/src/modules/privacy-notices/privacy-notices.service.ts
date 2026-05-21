import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { and, eq, isNull, or, gt, desc, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { privacyNotices } from "@loreal/database";

@Injectable()
export class PrivacyNoticesService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  /**
   * Returns the currently-effective notice for the given language. A notice is
   * active when effectiveFrom <= now() AND (effectiveTo IS NULL OR effectiveTo > now()).
   * If multiple match (shouldn't happen), the most recent effectiveFrom wins.
   */
  async findActive(language = "es-MX") {
    const [notice] = await this.db
      .select()
      .from(privacyNotices)
      .where(
        and(
          eq(privacyNotices.language, language),
          sql`${privacyNotices.effectiveFrom} <= now()`,
          or(
            isNull(privacyNotices.effectiveTo),
            gt(privacyNotices.effectiveTo, sql`now()`),
          ),
        ),
      )
      .orderBy(desc(privacyNotices.effectiveFrom))
      .limit(1);

    if (!notice) {
      throw new NotFoundException(
        `No active privacy notice found for language "${language}"`,
      );
    }
    return notice;
  }

  /**
   * Used by registration flow to validate that the version the client sent is
   * the one currently active. Prevents replay attacks with stale versions.
   */
  async assertVersionIsActive(version: string, language = "es-MX") {
    const active = await this.findActive(language);
    if (active.version !== version) {
      throw new NotFoundException(
        `Privacy notice version "${version}" is not the active version for "${language}" (active is "${active.version}")`,
      );
    }
    return active;
  }

  async findByVersion(version: string, language = "es-MX") {
    const [notice] = await this.db
      .select()
      .from(privacyNotices)
      .where(
        and(
          eq(privacyNotices.version, version),
          eq(privacyNotices.language, language),
        ),
      );
    if (!notice) {
      throw new NotFoundException(
        `Privacy notice v${version} (${language}) not found`,
      );
    }
    return notice;
  }
}
