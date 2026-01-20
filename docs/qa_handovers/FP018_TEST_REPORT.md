# FP018 地陪预订功能 (Guide Booking) 转测报告

## 1. 功能概述
本功能实现了从“地陪详情页”直接发起预订的流程。为了与原有的“定制下单(FP-013)”区分，我们将其独立为 **FP-018**。

## 2. 变更范围
### 文档
- 更新 `docs/05_功能点开发任务_V1.2.md`: 新增 FP-018 任务说明。

### 后端
- **Controller**: `server/controllers/order.controller.ts`
  - 修改 `createOrder` 接口，新增 `normal` 类型订单逻辑。
  - 支持 `guide_id`, `service_hours` 入参。
  - 实现基于地陪时薪的自动计价逻辑。

### 前端
- **新增页面**: `client/src/pages/OrderCreate.tsx`
  - 预订表单：日期、时长、备注。
  - 地陪信息卡片展示。
  - 实时价格计算。
- **路由配置**: `client/src/App.tsx` (添加 `/orders/create`)。

## 3. 测试结果

### 3.1 后端 API 测试
使用自动化测试脚本 `scripts/test-booking-flow.ts` 进行验证。

**测试用例**:
1. **正常下单** (Normal Booking) -> **通过**
   - 验证金额计算: 200/h * 4h = 800元。
   - 验证订单状态: pending。
2. **自我预订拦截** (Self-Booking) -> **通过**
   - 地陪尝试预订自己，返回错误。
3. **无效地陪拦截** (Invalid Guide ID) -> **通过**
   - 使用不存在的 guide_id，返回错误。

**测试日志**:
```
🚀 Starting FP-018 Guide Booking Flow Tests...

✅ [PASS] Created Guide User: 13995012137
✅ [PASS] Created Normal User: 13716867499
✅ [PASS] Guide Profile Verified. Guide ID: 74, Hourly Price: 200
✅ [PASS] Normal Order Created. ID: 243, Amount Correct (800)
✅ [PASS] Self-booking correctly rejected
✅ [PASS] Invalid Guide ID correctly rejected

✨ FP-018 Tests Completed.
```

### 3.2 前端功能验证 (代码审查)
- **入口**: `/guides/:id` -> 点击“立即预订” -> 跳转 `/orders/create?guide_id=xx`。
- **加载**: 页面自动加载地陪信息。
- **交互**: 修改时长，总价实时更新。
- **提交**: 提交成功后跳转至订单详情。

## 4. 部署说明
- 无需执行数据库迁移 (复用现有的 `orders` 表结构，`guideId` 字段已存在)。
- 需合并前端和后端代码。

## 5. 遗留问题
- 支付功能 (FP-016) 尚未开发，目前下单后直接跳转到订单详情或列表，状态为 `pending`。
