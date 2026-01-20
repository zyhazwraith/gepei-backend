import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import guideRoutes from './routes/guide.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import userRoutes from './routes/user.routes.js';
import orderRoutes from './routes/order.routes.js';
import adminRoutes from './routes/admin.routes.js';

// 创建 Express 应用
export function createApp(): Application {
  const app = express();

  // 中间件配置
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 健康检查端点
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  // 静态文件服务（上传的图片）
  app.use('/uploads', express.static('uploads'));

  // 静态文件服务（前端构建产物）
  // 生产环境下，Express 托管前端静态文件
  // 注意：需要确保 client/dist 目录存在
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));

  // API 路由（添加/v1版本号）
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/guides', guideRoutes);
  app.use('/api/v1/upload', uploadRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // 404 处理 (API)
  app.use('/api/*', notFoundHandler);

  // 前端路由支持 (SPA Fallback)
  // 所有非 API 请求都返回 index.html，交由前端 React Router 处理
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // 全局错误处理
  app.use(errorHandler);

  return app;
}
