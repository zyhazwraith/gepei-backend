import { afterEach, describe, expect, it } from 'vitest';
import { assertStartupEnvOrThrow } from '../../server/config/startup-env.js';

const OLD_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  OPENID_PROVIDER: process.env.OPENID_PROVIDER,
  WECHAT_NOTIFY_URL: process.env.WECHAT_NOTIFY_URL,
  WECHAT_PAY_APP_ID: process.env.WECHAT_PAY_APP_ID,
  WECHAT_PAY_MCH_ID: process.env.WECHAT_PAY_MCH_ID,
  WECHAT_PAY_MCH_SERIAL_NO: process.env.WECHAT_PAY_MCH_SERIAL_NO,
  WECHAT_PAY_PRIVATE_KEY_PATH: process.env.WECHAT_PAY_PRIVATE_KEY_PATH,
  WECHAT_PAY_PLATFORM_SERIAL_NO: process.env.WECHAT_PAY_PLATFORM_SERIAL_NO,
  WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH: process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH,
  WECHAT_PAY_API_V3_KEY: process.env.WECHAT_PAY_API_V3_KEY,
  WECHAT_OAUTH_APP_ID: process.env.WECHAT_OAUTH_APP_ID,
  WECHAT_OAUTH_APP_SECRET: process.env.WECHAT_OAUTH_APP_SECRET,
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

  if (OLD_ENV.OPENID_PROVIDER === undefined) {
    delete process.env.OPENID_PROVIDER;
  } else {
    process.env.OPENID_PROVIDER = OLD_ENV.OPENID_PROVIDER;
  }

  if (OLD_ENV.WECHAT_NOTIFY_URL === undefined) {
    delete process.env.WECHAT_NOTIFY_URL;
  } else {
    process.env.WECHAT_NOTIFY_URL = OLD_ENV.WECHAT_NOTIFY_URL;
  }

  const optionalEnvKeys = [
    'WECHAT_PAY_APP_ID',
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_MCH_SERIAL_NO',
    'WECHAT_PAY_PRIVATE_KEY_PATH',
    'WECHAT_PAY_PLATFORM_SERIAL_NO',
    'WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH',
    'WECHAT_PAY_API_V3_KEY',
    'WECHAT_OAUTH_APP_ID',
    'WECHAT_OAUTH_APP_SECRET',
  ] as const;

  for (const key of optionalEnvKeys) {
    if (OLD_ENV[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = OLD_ENV[key];
    }
  }
});

describe('startup env assertions', () => {
  it('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    process.env.OPENID_PROVIDER = 'mock';
    expect(() => assertStartupEnvOrThrow()).toThrow('JWT_SECRET');
  });

  it('throws when PAYMENT_PROVIDER=wechat and WECHAT_NOTIFY_URL is missing', () => {
    process.env.JWT_SECRET = 'test_secret';
    process.env.PAYMENT_PROVIDER = 'wechat';
    process.env.OPENID_PROVIDER = 'mock';
    delete process.env.WECHAT_NOTIFY_URL;
    expect(() => assertStartupEnvOrThrow()).toThrow('WECHAT_NOTIFY_URL');
  });

  it('throws when WECHAT_NOTIFY_URL is not https', () => {
    process.env.JWT_SECRET = 'test_secret';
    process.env.PAYMENT_PROVIDER = 'wechat';
    process.env.OPENID_PROVIDER = 'mock';
    process.env.WECHAT_NOTIFY_URL = 'http://example.com/notify';
    expect(() => assertStartupEnvOrThrow()).toThrow('https');
  });

  it('passes with mock provider and JWT secret', () => {
    process.env.JWT_SECRET = 'test_secret';
    process.env.PAYMENT_PROVIDER = 'mock';
    process.env.OPENID_PROVIDER = 'mock';
    delete process.env.WECHAT_NOTIFY_URL;
    expect(() => assertStartupEnvOrThrow()).not.toThrow();
  });

  it('throws when OPENID_PROVIDER=wechat and oauth credentials are missing', () => {
    process.env.JWT_SECRET = 'test_secret';
    process.env.PAYMENT_PROVIDER = 'mock';
    process.env.OPENID_PROVIDER = 'wechat';
    delete process.env.WECHAT_OAUTH_APP_ID;
    delete process.env.WECHAT_OAUTH_APP_SECRET;
    expect(() => assertStartupEnvOrThrow()).toThrow('WECHAT_OAUTH_APP_ID');
  });
});
