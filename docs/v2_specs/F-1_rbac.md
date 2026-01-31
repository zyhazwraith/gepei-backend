# Spec: [F-1] RBAC Role-Based Access Control

## 1. 核心目标 (Goal)
建立基于角色的访问控制 (RBAC) 体系，明确 **Admin (管理员)** 与 **CS (客服)** 的权限边界。

## 2. 角色定义 (Role Definitions)

保持数据库 `role` 枚举不变，不新增 `guide` 角色。

| 角色 (Enum) | 说明 |
| :--- | :--- |
| **user** | 普通用户。若 `is_guide=1` 则为地陪。 |
| **cs** | 客服。运营人员，权限较大。 |
| **admin** | 管理员。拥有最高权限，独占资金与系统配置权。 |

## 3. 权限矩阵 (Permission Matrix)

| 模块 | 功能点 | Admin | CS | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **订单** | 创建定制单 (Create Custom Order) | ✅ | ✅ | 包含录入与生成支付链接 |
| | 浏览/查询订单 (View Orders) | ✅ | ✅ | |
| | 修改订单状态 (Update Status) | ✅ | ✅ | 如确认服务完成等 |
| **用户** | 浏览用户列表 (View Users) | ✅ | ✅ | |
| | **封禁/解禁用户 (Ban/Unban)** | ✅ | ✅ | CS 可操作 |
| **地陪** | **审核地陪资料 (Audit Guide)** | ✅ | ✅ | CS 可操作 |
| **资金** | **提现审核 (Withdraw Audit)** | ✅ | ❌ | 仅限 Admin |
| | **发起退款 (Refund)** | ✅ | ❌ | 仅限 Admin |
| **系统** | 系统配置 (System Config) | ✅ | ❌ | 仅限 Admin |

## 4. 技术实施 (Implementation Scope)

### 4.1 核心修正
*   更新 `shared/types.ts`: 明确 `User.role` 类型为 `'user' | 'admin' | 'cs'`。
*   更新 `server/middleware/auth.middleware.ts`: 确保鉴权逻辑支持 `cs`。

### 4.2 验证 (Verification)
编写 `scripts/verify-rbac.ts`:
*   验证 CS 账号能否成功访问 `custom-orders` 和 `users` 接口。
*   验证 User 账号访问被拒绝 (403)。
