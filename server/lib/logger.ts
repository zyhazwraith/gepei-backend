import { runtimeConfig } from '../config/runtime.config.js';

type LogType = 'API' | 'SECURITY' | 'SYSTEM' | 'ERROR';

function getShanghaiTime(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: runtimeConfig.logging.timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date());

  const map = new Map(parts.map(part => [part.type, part.value]));
  return `${map.get('year')}-${map.get('month')}-${map.get('day')} ${map.get('hour')}:${map.get('minute')}:${map.get('second')}`;
}

function sanitize(value: unknown): string {
  return String(value ?? '-').replace(/[\r\n\t]+/g, ' ').trim();
}

function formatKv(kv: Record<string, unknown>): string {
  return Object.entries(kv)
    .map(([key, value]) => `${key}=${sanitize(value)}`)
    .join(' ');
}

function emit(type: LogType, message: string, toStderr = false): void {
  const line = `${getShanghaiTime()} [${type}] ${message}`;
  if (toStderr) {
    console.error(line);
    return;
  }
  console.log(line);
}

export const logger = {
  api(message: string): void {
    emit('API', message);
  },

  security(message: string): void {
    emit('SECURITY', message);
  },

  system(message: string): void {
    emit('SYSTEM', message);
  },

  error(message: string, detail?: unknown): void {
    const suffix = detail === undefined ? '' : ` detail=${sanitize(detail)}`;
    emit('ERROR', `${message}${suffix}`, true);
  },

  kv: formatKv,
};
