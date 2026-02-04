# O-5 User Ban System (用户封禁)

## 1. Context
管理员需要能够对违规用户进行封禁（Ban）和解封（Unban）操作。
封禁后的用户无法登录，且现有 Token 立即失效（通过中间件检查）。

## 2. Technical Design

### 2.1 Database Schema
使用 `users` 表现有字段：
- `status`: `'active' | 'banned'` (ENUM)
- `ban_reason`: `varchar` (nullable) - 存储封禁原因

### 2.2 Double Guard Strategy (双重防护)
为了确保安全性与实时性，采用 **Double Guard** 策略：

1.  **Layer 1: Login Guard (登录拦截)**
    *   **Location**: `auth.controller.ts` -> `login` / `wechatLogin`
    *   **Logic**: 在签发 Token 前检查 `user.status`。如果是 `banned`，拒绝登录并返回 403 及原因。

2.  **Layer 2: Middleware Guard (实时拦截)**
    *   **Location**: `auth.middleware.ts` -> `authenticate`
    *   **Logic**: 解析 Token 得到 `userId` 后，**必须**检查 `user.status`。
    *   **Effect**: 即使 Token 未过期，只要 DB 状态变为 `banned`，所有后续请求立即被拒绝 (403)。

### 2.3 API Design
采用 **RPC-style** 资源操作接口，以明确语义并区分校验逻辑。

#### A. Ban User
*   **Endpoint**: `PUT /api/v1/admin/users/:id/ban`
*   **Permission**: `Admin` only
*   **Request Body**:
    ```json
    {
      "reason": "发布违规内容" // Required
    }
    ```
*   **Logic**:
    1.  Check if user exists.
    2.  Check if target user is Admin (Cannot ban other admins).
    3.  Update `status = 'banned'`, `ban_reason = reason`.
    4.  Log to `AuditLog` (Action: `BAN_USER`).

#### B. Unban User
*   **Endpoint**: `PUT /api/v1/admin/users/:id/unban`
*   **Permission**: `Admin` only
*   **Request Body**: Empty `{}`
*   **Logic**:
    1.  Check if user exists.
    2.  Update `status = 'active'`, `ban_reason = null`.
    3.  Log to `AuditLog` (Action: `UNBAN_USER`).

## 3. Implementation Checklist
- [ ] **Middleware**: Modify `authenticate` in `server/middleware/auth.middleware.ts` to throw if banned.
- [ ] **Auth**: Modify `login` in `server/controllers/auth.controller.ts` to check ban status.
- [ ] **Controller**: Add `banUser`, `unbanUser` to `server/controllers/admin.controller.ts`.
- [ ] **Route**: Register routes in `server/routes/admin.routes.ts` (or equivalent).
- [ ] **Test**: Create `scripts/test-ban-flow.ts` to verify:
    -   Ban user -> Login fails.
    -   Ban user -> Existing token fails (Middleware).
    -   Unban user -> Login succeeds.
