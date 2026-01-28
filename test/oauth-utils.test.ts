import { describe, it, expect } from "vitest";
import {
  generateCSRFProtection,
  validateCSRFToken,
} from "../src/workers-oauth-utils.js";

describe("CSRF Protection", () => {
  describe("generateCSRFProtection", () => {
    it("returns a token and cookie string", () => {
      const { token, cookie } = generateCSRFProtection();
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(cookie).toContain(`__Host-CSRF_TOKEN=${token}`);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
      expect(cookie).toContain("SameSite=Strict");
    });

    it("generates unique tokens each time", () => {
      const { token: t1 } = generateCSRFProtection();
      const { token: t2 } = generateCSRFProtection();
      expect(t1).not.toBe(t2);
    });
  });

  describe("validateCSRFToken", () => {
    it("returns true for matching token", () => {
      const { token, cookie } = generateCSRFProtection();
      expect(validateCSRFToken(token, cookie)).toBe(true);
    });

    it("returns false for mismatched token", () => {
      const { cookie } = generateCSRFProtection();
      expect(validateCSRFToken("wrong-token", cookie)).toBe(false);
    });

    it("returns false when form token is undefined", () => {
      expect(validateCSRFToken(undefined, "some-cookie")).toBe(false);
    });

    it("returns false when cookie header is undefined", () => {
      expect(validateCSRFToken("some-token", undefined)).toBe(false);
    });

    it("returns false when cookie has no CSRF token", () => {
      expect(
        validateCSRFToken("token", "other_cookie=value"),
      ).toBe(false);
    });

    it("validates correctly with multiple cookies", () => {
      const { token } = generateCSRFProtection();
      const cookieHeader = `session=abc; __Host-CSRF_TOKEN=${token}; other=xyz`;
      expect(validateCSRFToken(token, cookieHeader)).toBe(true);
    });
  });
});
