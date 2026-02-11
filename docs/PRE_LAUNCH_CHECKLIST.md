# 上线前准备备忘录 (Pre-launch Checklist)

## 🚨 阻断性问题 (Blockers) - 必须解决才能上线
1. **真实支付接入**
   - [ ] 申请微信支付商户号 (MCHID) 和 API 证书。
   - [ ] 引入 `wechatpay-node-v3` SDK。
   - [ ] 实现 `notify_url` 回调处理，替代 `MockWechatProvider`。
   - [ ] 配置 `.env`: `WECHAT_APPID`, `WECHAT_MCHID`, `API_V3_KEY`。

2. **身份认证与短信**
   - [ ] 接入阿里云/腾讯云短信服务 (SMS)。
   - [ ] 替换模拟验证码逻辑 (目前是 console.log)。
   - [ ] (可选) 接入实名认证 API (身份证 OCR/二要素校验)。

## ⚠️ 重要配置 (Critical) - 影响稳定性
1. **生产环境配置**
   - [ ] 完善 `.env` 文件，移除开发环境的敏感默认值。
   - [ ] 替换 `console.log` 为结构化日志系统 (如 winston/pino)，并将日志持久化到文件或云端。

2. **定时任务**
   - [ ] 评估 `node-cron` 的单点风险。如果是单机部署暂无问题；如果是多实例部署，需引入 Redis 分布式锁或独立 Scheduler。

## 📦 部署准备
1. **Docker 化 (讨论中)**
   - [ ] 编写 `Dockerfile`。
   - [ ] 编写 `docker-compose.yml` (App + MySQL + Redis?)。
2. **CI/CD**
   - [ ] 配置 GitHub Actions 或其他 CI 工具，实现自动构建与部署。
