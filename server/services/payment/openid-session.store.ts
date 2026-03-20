type OpenIdSessionValue = {
  openid: string;
  appId: string;
  boundAt: number;
};

export type OpenIdSessionIdentity = {
  openid: string;
  appId: string;
};

const openidSessionByUserId = new Map<number, OpenIdSessionValue>();

export function bindSessionOpenId(userId: number, openid: string, appId: string): void {
  openidSessionByUserId.set(userId, {
    openid,
    appId,
    boundAt: Date.now(),
  });
}

export function getSessionOpenId(userId: number): OpenIdSessionIdentity | null {
  const value = openidSessionByUserId.get(userId);
  if (!value) {
    return null;
  }
  return {
    openid: value.openid,
    appId: value.appId,
  };
}
