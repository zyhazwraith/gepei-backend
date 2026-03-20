import { createHash } from 'crypto';
import { extractTokenFromHeader } from '../../utils/jwt.js';

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function buildOpenIdSessionKey(userId: number, authorizationHeader?: string): string {
  const token = extractTokenFromHeader(authorizationHeader) || 'no-token';
  return `${userId}:${hashText(token)}`;
}

export function hashOpenId(openid: string): string {
  return hashText(openid);
}
