import { Request } from 'express';

/**
 * Extract client IP address from request
 * Prioritizes X-Forwarded-For header, then falls back to socket remote address
 */
export function getClientIp(req: Request): string {
  let ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  
  // Simple sanitization: take first IP if comma-separated
  if (ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }
  
  // Handle IPv6 localhost
  if (ipAddress === '::1') {
    ipAddress = '127.0.0.1';
  }

  return ipAddress.slice(0, 45); // Truncate to fit common DB schema limits
}
