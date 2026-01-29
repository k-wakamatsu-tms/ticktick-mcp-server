/**
 * GitHub OAuth flow handler using Hono.
 * Handles /authorize and /callback routes for GitHub login.
 */

import { Hono } from "hono";
import type { OAuthHelpers, AuthRequest } from "@cloudflare/workers-oauth-provider";
import {
  getUpstreamAuthorizeUrl,
  fetchUpstreamAuthToken,
  isLoginAllowed,
  type Props,
} from "./utils.js";
import {
  generateCSRFProtection,
  validateCSRFToken,
  createOAuthState,
  bindStateToSession,
  validateOAuthState,
  isClientApproved,
  addApprovedClient,
  renderApprovalDialog,
} from "./workers-oauth-utils.js";

type Bindings = Env & {
  OAUTH_PROVIDER: OAuthHelpers;
};

const app = new Hono<{ Bindings: Bindings }>();

// GET /authorize - Start the OAuth flow
app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  if (!oauthReqInfo.clientId) {
    return new Response("Missing client_id", { status: 400 });
  }

  // Check if client is already approved
  const cookieHeader = c.req.header("cookie");
  const approved = await isClientApproved(
    cookieHeader,
    oauthReqInfo.clientId,
    c.env.COOKIE_ENCRYPTION_KEY,
  );

  if (approved) {
    // Skip approval dialog, redirect to GitHub directly
    const state = await createOAuthState(c.env.OAUTH_KV, oauthReqInfo);
    const redirectUri = new URL("/callback", c.req.url).toString();
    const githubUrl = getUpstreamAuthorizeUrl(
      c.env.GITHUB_CLIENT_ID,
      redirectUri,
      state,
    );
    const sessionCookie = await bindStateToSession(state);
    return new Response(null, {
      status: 302,
      headers: {
        Location: githubUrl,
        "Set-Cookie": sessionCookie,
      },
    });
  }

  // Show approval dialog
  const { token, cookie } = generateCSRFProtection();
  const stateEncoded = btoa(JSON.stringify(oauthReqInfo));
  const response = renderApprovalDialog(
    oauthReqInfo.clientId,
    oauthReqInfo.scope?.join(" ") ?? "",
    token,
    stateEncoded,
    c.req.url,
  );

  response.headers.append("Set-Cookie", cookie);
  return response;
});

// POST /authorize - Handle approval form submission
app.post("/authorize", async (c) => {
  const formData = await c.req.formData();
  const action = formData.get("action") as string;
  const csrfToken = formData.get("csrf_token") as string;
  const stateEncoded = formData.get("state") as string;

  // Validate CSRF
  const cookieHeader = c.req.header("cookie");
  if (!validateCSRFToken(csrfToken, cookieHeader)) {
    return new Response("Invalid CSRF token", { status: 403 });
  }

  if (action !== "approve") {
    return new Response("Authorization denied by user", { status: 403 });
  }

  // Decode the OAuth request info
  const oauthReqInfo: AuthRequest = JSON.parse(atob(stateEncoded));

  // Create state and redirect to GitHub
  const state = await createOAuthState(c.env.OAUTH_KV, oauthReqInfo);
  const redirectUri = new URL("/callback", c.req.url).toString();
  const githubUrl = getUpstreamAuthorizeUrl(
    c.env.GITHUB_CLIENT_ID,
    redirectUri,
    state,
  );

  const sessionCookie = await bindStateToSession(state);
  const approvedCookie = await addApprovedClient(
    cookieHeader,
    oauthReqInfo.clientId!,
    c.env.COOKIE_ENCRYPTION_KEY,
  );

  return new Response(null, {
    status: 302,
    headers: [
      ["Location", githubUrl],
      ["Set-Cookie", sessionCookie],
      ["Set-Cookie", approvedCookie],
    ],
  });
});

// GET /callback - GitHub OAuth callback
app.get("/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  // Validate state
  const cookieHeader = c.req.header("cookie");
  const oauthReqInfo = (await validateOAuthState(
    c.env.OAUTH_KV,
    state,
    cookieHeader,
  )) as AuthRequest;

  // Exchange code for GitHub access token
  const redirectUri = new URL("/callback", c.req.url).toString();
  const [accessToken, errorResponse] = await fetchUpstreamAuthToken(
    c.env.GITHUB_CLIENT_ID,
    c.env.GITHUB_CLIENT_SECRET,
    code,
    redirectUri,
  );

  if (errorResponse) return errorResponse;

  // Fetch GitHub user info using plain fetch
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "ticktick-mcp-server",
      Accept: "application/json",
    },
  });

  if (!userRes.ok) {
    return new Response("Failed to fetch GitHub user info", { status: 502 });
  }

  const user = (await userRes.json()) as {
    login: string;
    name: string | null;
    email: string | null;
  };

  const allowed = isLoginAllowed(
    user.login,
    c.env.GITHUB_ALLOWED_LOGINS,
  );
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  // Complete the MCP OAuth flow
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: user.login,
    metadata: { label: user.name || user.login },
    scope: oauthReqInfo.scope,
    props: {
      login: user.login,
      name: user.name || user.login,
      email: user.email || "",
      accessToken: accessToken!,
    } as Props,
  });

  return Response.redirect(redirectTo);
});

export { app as GitHubHandler };
