export const COOKIE_NAME = "gepei_token";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const OAUTH_CONFIG = {
  oauthPortalUrl: (import.meta as any).env.VITE_OAUTH_PORTAL_URL,
  appId: (import.meta as any).env.VITE_APP_ID,
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
