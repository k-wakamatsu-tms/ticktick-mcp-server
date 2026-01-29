/**
 * OAuth security utilities for Cloudflare Workers.
 * Handles CSRF protection, state management, session cookies, and approval dialog.
 */

export class OAuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({ error: this.code, error_description: this.message }),
      {
        status: this.statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "#";
    }
    return parsed.toString();
  } catch {
    return "#";
  }
}

export function generateCSRFProtection(): {
  token: string;
  cookie: string;
} {
  const token = crypto.randomUUID();
  const cookie = `__Host-CSRF_TOKEN=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`;
  return { token, cookie };
}

export function validateCSRFToken(
  formToken: string | undefined,
  cookieHeader: string | undefined,
): boolean {
  if (!formToken || !cookieHeader) return false;
  const match = cookieHeader.match(/__Host-CSRF_TOKEN=([^;]+)/);
  if (!match) return false;
  return formToken === match[1];
}

export async function createOAuthState(
  kv: KVNamespace,
  data: unknown,
): Promise<string> {
  const state = crypto.randomUUID();
  await kv.put(`oauth_state:${state}`, JSON.stringify(data), {
    expirationTtl: 600,
  });
  return state;
}

export async function bindStateToSession(state: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(state);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `__Host-CONSENTED_STATE=${hashHex}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}

export async function validateOAuthState(
  kv: KVNamespace,
  state: string,
  cookieHeader: string | undefined,
): Promise<unknown> {
  // Validate KV
  const key = `oauth_state:${state}`;
  const stored = await kv.get(key);
  if (!stored) {
    throw new OAuthError("invalid_request", "Invalid or expired state");
  }
  await kv.delete(key);

  // Validate session cookie
  if (cookieHeader) {
    const match = cookieHeader.match(/__Host-CONSENTED_STATE=([^;]+)/);
    if (match) {
      const encoder = new TextEncoder();
      const data = encoder.encode(state);
      const hash = await crypto.subtle.digest("SHA-256", data);
      const hashHex = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (match[1] !== hashHex) {
        throw new OAuthError("invalid_request", "State session mismatch");
      }
    }
  }

  return JSON.parse(stored);
}

async function hmacSign(
  key: string,
  data: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isClientApproved(
  cookieHeader: string | undefined,
  clientId: string,
  encryptionKey: string,
): Promise<boolean> {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(/__Host-APPROVED_CLIENTS=([^;]+)/);
  if (!match) return false;
  try {
    const decoded = decodeURIComponent(match[1]);
    const [data, sig] = decoded.split(".");
    const expected = await hmacSign(encryptionKey, data);
    if (sig !== expected) return false;
    const clients: string[] = JSON.parse(atob(data));
    return clients.includes(clientId);
  } catch {
    return false;
  }
}

export async function addApprovedClient(
  cookieHeader: string | undefined,
  clientId: string,
  encryptionKey: string,
): Promise<string> {
  let clients: string[] = [];
  if (cookieHeader) {
    const match = cookieHeader.match(/__Host-APPROVED_CLIENTS=([^;]+)/);
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        const [data, sig] = decoded.split(".");
        const expected = await hmacSign(encryptionKey, data);
        if (sig === expected) {
          clients = JSON.parse(atob(data));
        }
      } catch {
        // ignore
      }
    }
  }
  if (!clients.includes(clientId)) {
    clients.push(clientId);
  }
  const data = btoa(JSON.stringify(clients));
  const sig = await hmacSign(encryptionKey, data);
  const value = encodeURIComponent(`${data}.${sig}`);
  return `__Host-APPROVED_CLIENTS=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 3600}`;
}

export function renderApprovalDialog(
  clientId: string,
  scope: string,
  csrfToken: string,
  stateEncoded: string,
  requestUrl?: string,
): Response {
  // Get the origin for CSP form-action
  const origin = requestUrl ? new URL(requestUrl).origin : "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TickTick MCP - Authorize</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .card { background: white; border-radius: 12px; padding: 2rem; max-width: 400px; width: 90%; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { font-size: 1.3rem; margin: 0 0 1rem; }
    .info { background: #f0f0f0; border-radius: 8px; padding: 1rem; margin: 1rem 0; font-size: 0.9rem; }
    .info dt { font-weight: 600; }
    .info dd { margin: 0.25rem 0 0.75rem; word-break: break-all; }
    .actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
    button { flex: 1; padding: 0.75rem; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; }
    .approve { background: #4CAF50; color: white; }
    .deny { background: #e0e0e0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize TickTick MCP</h1>
    <p>An application is requesting access to your TickTick MCP server.</p>
    <dl class="info">
      <dt>Client ID</dt>
      <dd>${sanitizeText(clientId)}</dd>
      <dt>Scope</dt>
      <dd>${sanitizeText(scope || "default")}</dd>
    </dl>
    <form method="POST" action="/authorize">
      <input type="hidden" name="csrf_token" value="${sanitizeText(csrfToken)}" />
      <input type="hidden" name="state" value="${sanitizeText(stateEncoded)}" />
      <div class="actions">
        <button type="submit" name="action" value="approve" class="approve">Approve</button>
        <button type="submit" name="action" value="deny" class="deny">Deny</button>
      </div>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Content-Security-Policy":
        `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${origin}`,
    },
  });
}
