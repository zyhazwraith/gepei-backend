/**
 * Token存储工具
 * 使用localStorage存储JWT Token
 */

const TOKEN_KEY = 'gepei_token';

/**
 * 保存Token到localStorage
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 从localStorage获取Token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 从localStorage移除Token
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 检查Token是否存在
 */
export function hasToken(): boolean {
  return !!getToken();
}
