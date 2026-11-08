import { describe, expect, it } from "vitest";
import { MINIMUM_PEER_RESPONDENTS } from "../src/lib/assessment-methodology.js";
import { UNC_CHARLOTTE_DEMO_EMAILS, UNC_CHARLOTTE_DEMO_EMAIL_PREFIX } from "./seed-unc-charlotte-demo-comparisons.js";

const activeRoles = ["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff"] as const;

describe("UNC Charlotte comparison-demo seed", () => {
  it("provides enough clearly labelled synthetic peers for every active stakeholder group", () => {
    expect(new Set(UNC_CHARLOTTE_DEMO_EMAILS).size).toBe(UNC_CHARLOTTE_DEMO_EMAILS.length);
    for (const role of activeRoles) {
      const profilesForRole = UNC_CHARLOTTE_DEMO_EMAILS.filter((email) => email.startsWith(`${UNC_CHARLOTTE_DEMO_EMAIL_PREFIX}${role}.`));
      // One account is excluded from its own peer comparison, so this must be
      // strictly greater than the minimum privacy threshold.
      expect(profilesForRole.length).toBeGreaterThanOrEqual(MINIMUM_PEER_RESPONDENTS + 1);
      expect(profilesForRole.every((email) => email.endsWith("@hearmes.test"))).toBe(true);
    }
  });
});
