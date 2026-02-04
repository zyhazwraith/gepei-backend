import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { contextMiddleware } from './middleware/context.middleware.js';
import authRoutes from './routes/auth.routes.js';
import guideRoutes from './routes/guide.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import attachmentRoutes from './routes/attachment.routes.js';
import systemConfigRoutes from './routes/system-config.routes.js';
import userRoutes from './routes/user.routes.js';
import orderRoutes from './routes/order.routes.js';
import overtimeRoutes from './routes/overtime.routes.js';
import adminRoutes from './routes/admin.routes.js';

// 创建 Express 应用
export function createApp(): Application {
  const app = express();

  // 中间件配置
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // 上下文中间件 (必须在 authMiddleware 之后运行，但这里是全局注册，
  // 实际的 User 注入是在 authRoutes 内部的 authMiddleware 完成的。
  // 因此 Context 中间件在全局层只能捕获 IP。
  // 若要捕获 User，需要在 authMiddleware 中显式调用 Context.run 或更新 store。
  // 考虑到 express 中间件机制，我们需要一个能 wrap 后续调用的 context middleware。
  // 简单方案：放在最外层初始化 Context，auth middleware 后续更新 store (如果 ALS 支持 mutable) 
  // 或者：authMiddleware 本身也应该感知 Context。
  // 鉴于 authMiddleware 目前是路由级的，我们先把 contextMiddleware 放在这里用于初始化。
  // 为了支持 auth 后获取 user，我们需要在 authMiddleware 里补充逻辑，或者
  // 简单地：contextMiddleware 负责初始化，而实际使用时，User 可能在后续才被挂载到 req。
  // 但 ALS 的 store 是在 run 时确定的。
  // 修正策略：Context Middleware 仅初始化基础信息。业务逻辑中若需 User，从 req.user 取，
  // 或者让 Context 提供 update 方法 (ALS 不直接支持，但 Store 对象本身是引用的，可以修改属性)。
  app.use(contextMiddleware);

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
  // app.use('/api/v1/upload', uploadRoutes); // Deprecated in favor of attachments
  app.use('/api/v1/attachments', attachmentRoutes); // New V2 Attachment API
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/overtime', overtimeRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // F-3: System Config Routes
  // Public GET /api/v1/system-configs
  app.use('/api/v1/system-configs', systemConfigRoutes);
  
  // Note: Admin PUT /api/v1/admin/system-configs is now mounted in adminRoutes

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
