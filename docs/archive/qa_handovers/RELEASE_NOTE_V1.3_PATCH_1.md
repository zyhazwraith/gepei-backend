# 版本封存报告 V1.3 (开发中 - Patch 1)

**日期**: 2026-01-21
**状态**: 开发中 (封存当前稳定状态)
**版本**: V1.3-Dev-Patch1

## 1. 核心修复 (Critical Fixes)

### 1.1 地陪资料回显修复 (Guide Profile Edit)
- **问题**: 地陪编辑页面 (`GuideEdit.tsx`) 在保存资料后，刷新页面无法回显已保存的数据。
- **根因**: 
  1. `apiClient` 响应拦截器已解包 `response.data`，但前端代码仍尝试访问 `response.data.code` (导致 `undefined`)。
  2. 后端返回字段为 Snake Case (`id_number`)，前端部分逻辑混用了 Camel Case (`idNumber`)。
- **修复**:
  - 修正前端 `response` 判断逻辑，直接使用 `response.code`。
  - 统一前端字段映射，严格匹配 API 文档的 Snake Case。
  - 增强 `GuideEdit` 组件的鲁棒性，移除冗余的条件判断，确保空值也能正确重置表单状态。

### 1.2 API 字段一致性标准化 (API Consistency)
- **重构**: **全栈迁移至 Camel Case**。
- **背景**: 之前项目存在混合风格（Guide/User 使用 Snake Case，Order/Admin 使用 Camel Case），导致开发心智负担和维护成本增加。
- **改动**: 
  - 更新了 API 文档，确立 Camel Case 为唯一规范。
  - 重构了后端 `guide.controller.ts`, `user.controller.ts`，移除了手动 Snake Case 映射，直接返回 Drizzle ORM 的 Camel Case 对象。
  - 重构了前端 `api.ts` 和所有相关页面（`Login`, `Register`, `Profile`, `GuideEdit`, `OrderList`, `OrderCreate` 等），将所有字段引用统一为 Camel Case (e.g., `userId`, `nickName`, `hourlyPrice`)。
- **结果**: 现在前后端及数据库 ORM 层风格高度统一，符合 TypeScript 全栈开发的最佳实践。

### 1.3 图片上传功能
- **修复**: 修复了 `upload.routes.ts` 中的路径解析错误和目录权限问题，确保图片可正常上传并预览。

## 2. 代码质量与规范
- **响应结构**: 确认所有前端页面 (`OrderList`, `OrderDetail` 等) 均正确处理了 `apiClient` 解包后的响应结构。
- **敏感信息保护**: 确认公开的地陪列表/详情接口已正确过滤 `id_number` 等敏感字段。

## 3. 遗留/待办 (TODO)
- **前端体验**: `GuideEdit` 保存成功后目前跳转至个人中心 (`/profile`)，符合预期。
- **测试脚本**: 已清理临时的 E2E 和 Flow 测试脚本。

---
**封存确认**: 当前代码库在 V1.3 功能范围内（地陪、订单、管理）运行稳定，关键 Bug 已修复。
