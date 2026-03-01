import 'dotenv/config';
import type { Server } from 'http';
import { createApp } from './app.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { startScheduler, stopScheduler } from './scheduler/index.js';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SHUTDOWN_TIMEOUT_MS = 10000;

// 启动服务器
async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('✗ Missing required env: JWT_SECRET');
      process.exit(1);
    }

    // 测试数据库连接 (Using Drizzle)
    try {
      await db.execute(sql`SELECT 1`);
      console.log('✓ Database connected successfully');
    } catch (error) {
      console.error('✗ Database connection failed:', error);
      console.error('Failed to connect to database. Exiting...');
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
      console.log(`[Server] Received ${signal}, starting graceful shutdown...`);

      stopScheduler();

      shutdownTimer = setTimeout(() => {
        console.error(`[Server] Graceful shutdown timeout (${SHUTDOWN_TIMEOUT_MS}ms), forcing exit.`);
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
          console.error('[Server] Failed to close HTTP server cleanly:', err);
          process.exit(1);
          return;
        }
        console.log('[Server] Graceful shutdown completed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // 启动服务器
    server = app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 Environment: ${NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('='.repeat(50));

      // 启动调度器
      startScheduler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 启动
startServer();
