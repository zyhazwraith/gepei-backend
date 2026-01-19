### 1. Git 留痕与接手
- **操作**: 
  1. `git init` (如果尚未初始化) 或检查 `git status`。
  2. `git add .` 添加所有变更（包括清理的文件和新增的 `TRAE_RULES.md`）。
  3. `git commit -m "chore: project handover to Trae, rules added and cleanup"`。
  4. `git push` (尝试推送到远程仓库，如果配置了的話)。

### 2. 逐一审查与修复 (FP-001 ~ FP-004)

#### **FP-001: 项目初始化 (重点重构)**
- **问题**: 现有代码在 `server/models/user.model.ts` 和 `server/config/database.ts` 中使用了 Raw SQL (`mysql2`)，违反了 `TRAE_RULES.md` 中强制使用 Drizzle ORM 的规定。
- **修复计划**:
  1.  **配置 Drizzle**:
      - 创建 `drizzle.config.ts`。
      - 创建 `server/db/schema.ts`，定义 `users` 表结构。
      - 创建 `server/db/index.ts`，初始化 Drizzle 客户端连接。
  2.  **重构数据库连接**: 废弃 `server/config/database.ts` 中的 Raw SQL 连接池，改用 Drizzle。
  3.  **环境配置**: 确保 `.env` 文件存在且包含正确的数据库连接信息。

#### **FP-002: 用户注册**
- **审查**:
  - `auth.controller.ts` 中的 `register` 逻辑看起来正确，但依赖于待重构的 `user.model.ts`。
  - 前端 `Register.tsx` 逻辑基本符合文档。
- **修复**:
  - 重写 `server/models/user.model.ts`，使用 Drizzle 的 `db.insert(users).values(...)` 替代 Raw SQL。
  - 确保密码哈希 (`bcrypt`) 和唯一性检查逻辑在 Drizzle 重构后依然有效。

#### **FP-003: 用户登录**
- **审查**:
  - `auth.controller.ts` 中的 `login` 逻辑依赖 `findUserByPhone`。
- **修复**:
  - 重写 `server/models/user.model.ts` 中的 `findUserByPhone`，使用 Drizzle 的 `db.query.users.findFirst(...)`。

#### **FP-004: 获取当前用户**
- **审查**:
  - `auth.controller.ts` 中的 `getCurrentUser` 依赖 `req.user`。
  - `auth.middleware.ts` 依赖 `findUserById`。
  - 前端 `AuthContext.tsx` 逻辑看起来健全。
- **修复**:
  - 重写 `server/models/user.model.ts` 中的 `findUserById`，使用 Drizzle 查询。

### **执行顺序**
1. **Git Commit** (立即执行)。
2. **Drizzle 配置** (创建 Schema 和 Client)。
3. **重构 Model** (替换 `user.model.ts` 实现)。
4. **验证** (运行代码，确保注册/登录流程跑通)。

准备立即执行 Git 操作和 Drizzle 重构。