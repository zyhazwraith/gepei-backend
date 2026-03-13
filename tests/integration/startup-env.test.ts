import { afterEach, describe, expect, it } from 'vitest';
import { assertStartupEnvOrThrow } from '../../server/config/startup-env.js';

const OLD_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  WECHAT_NOTIFY_URL: process.env.WECHAT_NOTIFY_URL,
};

afterEach(() => {
  if (OLD_ENV.JWT_SECRET === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = OLD_ENV.JWT_SECRET;
  }

  if (OLD_ENV.PAYMENT_PROVIDER === undefined) {
    delete process.env.PAYMENT_PROVIDER;
  } else {
    process.env.PAYMENT_PROVIDER = OLD_ENV.PAYMENT_PROVIDER;
  }

  if (OLD_ENV.WECHAT_NOTIFY_URL === undefined) {
    delete process.env.WECHAT_NOTIFY_URL;
  } else {
    process.env.WECHAT_NOTIFY_URL = OLD_ENV.WECHAT_NOTIFY_URL;
  }
});

describe('startup env assertions', () => {
  it('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => assertStartupEnvOrThrow()).toThrow('JWT_SECRET');
  });

  it('throws when PAYMENT_PROVIDER=wechat and WECHAT_NOTIFY_URL is missing', () => {
    process.env.JWT_SECRET = 'test_secret';
    process.env.PAYMENT_PROVIDER = 'wechat';
    delete process.env.WECHAT_NOTIFY_URL;
    expect(() => assertStartupEnvOrThrow()).toThrow('WECHAT_NOTIFY_URL');
  });

  it('throws when WECHAT_NOTIFY_URL is not https', () => {
    process.env.JWT_SECRET = 'test_secret';
    process.env.PAYMENT_PROVIDER = 'wechat';
    process.env.WECHAT_NOTIFY_URL = 'http://example.com/notify';
    expect(() => assertStartupEnvOrThrow()).toThrow('https');
  });

  it('passes with mock provider and JWT secret', () => {
    process.env.JWT_SECRET = 'test_secret';
    process.env.PAYMENT_PROVIDER = 'mock';
    delete process.env.WECHAT_NOTIFY_URL;
    expect(() => assertStartupEnvOrThrow()).not.toThrow();
  });
});
