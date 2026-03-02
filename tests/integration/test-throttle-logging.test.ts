import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { contextMiddleware } from '../../server/middleware/context.middleware.js';
import { apiLogMiddleware } from '../../server/middleware/api-log.middleware.js';
import { authThrottle, verificationCodeThrottle } from '../../server/middleware/throttle.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(contextMiddleware);
  app.use('/api/v1', apiLogMiddleware);

  app.post('/api/v1/auth/login', authThrottle, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post('/api/v1/auth/verification-code', verificationCodeThrottle, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

describe('throttle and api logging middleware', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('enforces login throttle and emits security log on 429', async () => {
    const app = buildApp();
    const ip = '11.22.33.44';

    for (let i = 0; i < 20; i += 1) {
      const res = await request(app).post('/api/v1/auth/login').set('X-Forwarded-For', ip).send({});
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).post('/api/v1/auth/login').set('X-Forwarded-For', ip).send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      message: 'Too many requests, please try again later',
    });

    const securityLines = logSpy.mock.calls
      .map(call => String(call[0]))
      .filter(line => line.includes('[SECURITY]') && line.includes('throttle_hit'));
    expect(securityLines.length).toBeGreaterThan(0);
  });

  it('uses stricter verification-code throttle and emits api logs', async () => {
    const app = buildApp();
    const ip = '44.55.66.77';

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/api/v1/auth/verification-code').set('X-Forwarded-For', ip).send({});
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).post('/api/v1/auth/verification-code').set('X-Forwarded-For', ip).send({});
    expect(blocked.status).toBe(429);

    const apiLines = logSpy.mock.calls
      .map(call => String(call[0]))
      .filter(line => line.includes('[API]'));
    expect(apiLines.length).toBeGreaterThan(0);

    const hasPathWithoutQuery = apiLines.some(line => line.includes('POST /api/v1/auth/verification-code '));
    expect(hasPathWithoutQuery).toBe(true);
  });
});
