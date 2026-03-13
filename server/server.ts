import 'dotenv/config';
import type { Server } from 'http';
import { createApp } from './app.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { startScheduler, stopScheduler } from './scheduler/index.js';
import { logger } from './lib/logger.js';
import { assertStartupEnvOrThrow } from './config/startup-env.js';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SHUTDOWN_TIMEOUT_MS = 10000;

// 启动服务器
async function startServer() {
  try {
    try {
      assertStartupEnvOrThrow();
    } catch (error) {
      logger.error('startup_env_invalid', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    // 测试数据库连接 (Using Drizzle)
    try {
      await db.execute(sql`SELECT 1`);
      logger.system('database_connected');
    } catch (error) {
      logger.error('database_connection_failed', error instanceof Error ? error.message : String(error));
      logger.error('startup_aborted');
      process.exit(1);
    }

    // 创建应用
    const app = createApp();
    let shuttingDown = false;
    let shutdownTimer: NodeJS.Timeout | null = null;
    let server: Server | null = null;

    const gracefulShutdown = (signal: NodeJS.Signals) => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      logger.system(`graceful_shutdown_started signal=${signal}`);

      stopScheduler();

      shutdownTimer = setTimeout(() => {
        logger.error(`graceful_shutdown_timeout timeout_ms=${SHUTDOWN_TIMEOUT_MS}`);
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      shutdownTimer.unref();

      if (!server) {
        if (shutdownTimer) clearTimeout(shutdownTimer);
        process.exit(0);
      }

      server.close((err?: Error) => {
        if (shutdownTimer) clearTimeout(shutdownTimer);
        if (err) {
          logger.error('http_server_close_failed', err.message);
          process.exit(1);
          return;
        }
        logger.system('graceful_shutdown_completed');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // 启动服务器
    server = app.listen(PORT, () => {
      logger.system(`server_started port=${PORT} env=${NODE_ENV} health=/health`);

      // 启动调度器
      startScheduler();
    });
  } catch (error) {
    logger.error('failed_to_start_server', error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  }
}

// 启动
startServer();
