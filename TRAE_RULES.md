# Trae Project Rules

本文档为 AI 辅助开发的上下文规则，旨在保持 "陪你" (Pei Ni) 项目开发的一致性和高质量。

## 1. 项目背景 (Context)
- **项目名称**: 陪你 (Pei Ni)
- **项目目标**: 连接旅行者与本地向导（地陪），提供定制化旅行服务的 Web 应用平台。
- **当前阶段**: **MVP (Minimum Viable Product)** 开发阶段。核心目标是快速实现并验证核心业务流程（注册、找人、下单）。

## 2. 开发原则 (Philosophy)
- **文档优先 (Docs First)**: 
  - 开发过程中遇到功能定义、API 规范或数据库设计疑问，**优先查阅 `docs/` 目录下的文档**。
  - 文档是 Single Source of Truth。
- **勇于建议 (Propose Improvements)**: 
  - 虽然以文档为准，但如果你发现文档中的设计存在技术缺陷、性能瓶颈或有更优的实现方案，**请务必主动提出**，说明理由并提供替代方案，供用户决策。不要盲目执行次优方案。
- **语言规范 (Language)**:
  - **文档、注释、Commit Message**: 主要/尽可能使用 **中文**。
  - **代码命名**: 变量、函数、类名等保持标准的 **英文** 命名（`camelCase`, `PascalCase` 等）。

## 3. 技术规范 (Tech Stack & Rules)

### 3.1 架构 (Architecture)
- **模式**: Monorepo (全栈一体化)。
- **目录结构**:
  - `server/`: Node.js 后端服务
  - `client/`: React 前端应用
  - `shared/`: 前后端共享类型定义

### 3.2 后端 (Backend)
- **框架**: Express + TypeScript。
- **数据库 (Database)**: 
  - **强制使用 Drizzle ORM** 进行所有数据库操作。
  - **禁止** 直接拼接 Raw SQL 字符串（现有遗留代码需按此规则重构）。
- **错误处理**: 使用 `asyncHandler` 包装 Controller，统一错误响应。
- **响应格式**: 
  ```json
  {
    "code": 0, // 0 成功, 非 0 失败
    "message": "success",
    "data": {}
  }
  ```

### 3.3 前端 (Frontend)
- **框架**: React + TypeScript + Vite。
- **样式**: Tailwind CSS。
- **组件库**: Shadcn UI。
- **API 请求**: 使用封装好的 Axios 实例 (`client/src/lib/api.ts`)，包含统一的拦截器处理。

### 3.4 命名规范 (Naming Convention)
- **文件/文件夹**: `kebab-case` (e.g., `user-controller.ts`, `guide-profile/`)。
- **变量/函数**: `camelCase` (e.g., `getUserById`, `isGuide`).
- **类/组件**: `PascalCase` (e.g., `UserButton`, `AuthService`).
- **常量**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`).

## 4. 工作流规范 (Workflow)
- **分支管理 (Branching Strategy)**:
  - `main`: 主分支，保持稳定，随时可发布。
  - `feature/<name>`: 新功能开发分支 (e.g., `feature/auth-flow`).
  - `fix/<name>`: Bug 修复分支 (e.g., `fix/login-error`).
  - `chore/<name>`: 杂项/维护分支 (e.g., `chore/cleanup`).
- **开发流程**:
  1. 从 `main` 拉取新分支。
  2. 开发并自测。
  3. 确认无误后合并回 `main` (Merge commit)。
- **提交信息 (Commit Message)**:
  - 格式: `<type>(<scope>): <subject>`
  - 示例: `feat(auth): add login validation`

## 5. 关键注意事项 (Important Notes)
- 每次开始任务前，请先检查 `docs/04_功能点开发任务_V1.1.md` 确认任务优先级。
- 涉及数据库变更时，必须同步更新 `docs/02_数据库设计_V1.1.md`（如果需要）和 Drizzle Schema。
- **代码审查**: 对现有代码进行修改前，必须先分析问题并向用户汇报，获得确认后再执行修改。
