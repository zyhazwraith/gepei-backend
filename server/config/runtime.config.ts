function getEnvNumber(name: string, fallback: number, { min = 1 }: { min?: number } = {}): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`[config] Invalid ${name}: "${raw}"`);
  }
  return Math.floor(parsed);
}

function getEnvString(name: string, fallback: string): string {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    return fallback;
  }
  return raw.trim();
}

export const runtimeConfig = {
  logging: {
    timezone: getEnvString('LOG_TIMEZONE', 'Asia/Shanghai'),
  },
  throttle: {
    windowMs: getEnvNumber('THROTTLE_WINDOW_MS', 60_000),
    authMax: getEnvNumber('THROTTLE_AUTH_MAX', 20),
    verificationCodeMax: getEnvNumber('THROTTLE_VERIFICATION_CODE_MAX', 5),
    message: getEnvString('THROTTLE_MESSAGE', 'Too many requests, please try again later'),
  },
} as const;
