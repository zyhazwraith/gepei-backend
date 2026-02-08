# Admin User Management Enhancement Spec (V2.1)

## 1. Context
This specification defines the enhancements for the Admin User Management module, building upon the V2 foundation. The goal is to improve usability for administrators and add Customer Service (CS) role management capabilities.

## 2. Database Changes

### 2.1 Users Table (`users`)
Add a new field to track user activity.

| Field Name | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `last_login_at` | `timestamp` | Yes | `null` | Records the timestamp of the last successful login |

## 3. API Changes

### 3.1 Update User List (`GET /api/v1/admin/users`)
**Request:**
- No changes to parameters (page, limit, keyword).

**Response:**
- Add `lastLoginAt` field to the user object in the list.

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "phone": "13800000000",
        "userNickname": "UserA",
        "role": "user",
        "isGuide": false,
        "balance": 1000,
        "createdAt": "2023-10-01T10:00:00Z",
        "lastLoginAt": "2023-10-05T14:30:00Z", // New Field
        "status": "active"
      }
    ]
  }
}
```

### 3.2 Update User Role (`PUT /api/v1/admin/users/:id/role`)
**Description:**
Allows Admins to promote a user to Customer Service (CS) or demote them back to a regular user.

**Auth:**
- Requires `admin` role.

**Request Body:**
```json
{
  "role": "cs" // or "user"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "角色更新成功",
  "data": {
    "userId": 1,
    "role": "cs"
  }
}
```

## 4. Frontend UI Spec

### 4.1 Column Order
The table columns must strictly follow this order:
1.  **用户档案** (User Profile): Avatar + Nickname + Phone/ID
2.  **身份标识** (Identity): Admin / CS / Guide / User (Badge)
3.  **余额** (Balance): Right-aligned, Bold
4.  **上次登录** (Last Login): Relative time (e.g., "2 hours ago"), absolute date on hover.
5.  **注册时间** (Registered At): Date only
6.  **状态** (Status): Dot indicator
7.  **操作** (Actions): Dropdown menu

### 4.2 Dropdown Menu
Enhance the "More" (...) dropdown menu:
- **Existing**: Copy Phone, Copy ID, Ban/Unban.
- **New**:
    - If role is `user` or `guide`: Show "设为客服" (Set as CS).
    - If role is `cs`: Show "取消客服" (Revoke CS).

## 5. Verification Plan
Create a test script `scripts/verify-admin-user-v2.1.ts` to verify:
1.  User login updates `last_login_at`.
2.  `GET /admin/users` returns `lastLoginAt`.
3.  `PUT /admin/users/:id/role` correctly updates the role.
4.  Permission check: CS cannot change roles.
