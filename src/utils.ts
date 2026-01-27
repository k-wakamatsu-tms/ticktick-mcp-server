/**
 * GitHub OAuth utility functions.
 */

export type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
};

export function getUpstreamAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
    response_type: "code",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function fetchUpstreamAuthToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<[string | null, Response | null]> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    return [null, new Response("Failed to exchange code for token", { status: 502 })];
  }

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (data.error || !data.access_token) {
    return [null, new Response(`GitHub OAuth error: ${data.error}`, { status: 400 })];
  }

  return [data.access_token, null];
}
