type OpenIdSessionValue = {
  openid: string;
  appId: string;
  boundAt: number;
};

export type OpenIdSessionIdentity = {
  openid: string;
  appId: string;
};

const openidSessionByKey = new Map<string, OpenIdSessionValue>();

export function bindSessionOpenId(sessionKey: string, openid: string, appId: string): void {
  openidSessionByKey.set(sessionKey, {
    openid,
    appId,
    boundAt: Date.now(),
  });
}

export function getSessionOpenId(sessionKey: string): OpenIdSessionIdentity | null {
  const value = openidSessionByKey.get(sessionKey);
  if (!value) {
    return null;
  }
  return {
    openid: value.openid,
    appId: value.appId,
  };
}
