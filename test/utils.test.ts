import { describe, it, expect, vi } from "vitest";
import {
  getUpstreamAuthorizeUrl,
  fetchUpstreamAuthToken,
  parseAllowedLogins,
  isLoginAllowed,
} from "../src/utils.js";

describe("getUpstreamAuthorizeUrl", () => {
  it("builds correct GitHub OAuth URL", () => {
    const url = getUpstreamAuthorizeUrl(
      "client123",
      "https://example.com/callback",
      "state_abc",
    );
    expect(url).toContain("https://github.com/login/oauth/authorize");
    expect(url).toContain("client_id=client123");
    expect(url).toContain(
      "redirect_uri=" + encodeURIComponent("https://example.com/callback"),
    );
    expect(url).toContain("state=state_abc");
    expect(url).toContain("scope=read%3Auser+user%3Aemail");
    expect(url).toContain("response_type=code");
  });
});

describe("fetchUpstreamAuthToken", () => {
  it("returns access token on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: "gh_token_123" }),
      }),
    );

    const [token, error] = await fetchUpstreamAuthToken(
      "client_id",
      "client_secret",
      "code123",
      "https://example.com/callback",
    );

    expect(token).toBe("gh_token_123");
    expect(error).toBeNull();
  });

  it("returns error response on HTTP failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    const [token, error] = await fetchUpstreamAuthToken(
      "client_id",
      "client_secret",
      "code123",
      "https://example.com/callback",
    );

    expect(token).toBeNull();
    expect(error).toBeInstanceOf(Response);
    expect(error!.status).toBe(502);
  });

  it("returns error response when GitHub returns error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ error: "bad_verification_code" }),
      }),
    );

    const [token, error] = await fetchUpstreamAuthToken(
      "client_id",
      "client_secret",
      "bad_code",
      "https://example.com/callback",
    );

    expect(token).toBeNull();
    expect(error).toBeInstanceOf(Response);
    expect(error!.status).toBe(400);
  });

  it("sends correct request body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: "token" }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await fetchUpstreamAuthToken(
      "cid",
      "csecret",
      "code",
      "https://example.com/cb",
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://github.com/login/oauth/access_token",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          client_id: "cid",
          client_secret: "csecret",
          code: "code",
          redirect_uri: "https://example.com/cb",
        }),
      }),
    );
  });
});

describe("parseAllowedLogins", () => {
  it("returns null when raw is undefined", () => {
    expect(parseAllowedLogins(undefined)).toBeNull();
  });

  it("returns null for empty or whitespace", () => {
    expect(parseAllowedLogins("   ")).toBeNull();
  });

  it("parses and normalizes comma-separated logins", () => {
    expect(
      parseAllowedLogins(" k-wakamatsu-tms , Other "),
    ).toEqual(["k-wakamatsu-tms", "other"]);
  });

  it("returns null when all items are empty", () => {
    expect(parseAllowedLogins(" , , ")).toBeNull();
  });
});

describe("isLoginAllowed", () => {
  it("denies when allowlist is unset", () => {
    expect(isLoginAllowed("k-wakamatsu-tms", undefined)).toBe(false);
  });

  it("allows case-insensitive matches", () => {
    expect(
      isLoginAllowed("K-Wakamatsu-TMS", "k-wakamatsu-tms"),
    ).toBe(true);
  });

  it("denies non-matching users", () => {
    expect(
      isLoginAllowed("k-wakamatsu-tms", "other"),
    ).toBe(false);
  });
});
