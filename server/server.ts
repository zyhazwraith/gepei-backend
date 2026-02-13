import 'dotenv/config';
import { createApp } from './app.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { startScheduler } from './scheduler/index.js';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 启动服务器
async function startServer() {
  try {
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

    // 启动服务器
    app.listen(PORT, () => {
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
