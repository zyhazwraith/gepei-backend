# Feature Spec: [F-0] Attachment System Infrastructure

**Status**: Draft
**Task**: [F-0] 附件系统基础设施 (Attachment System)
**Type**: Infrastructure
**Owner**: Backend Team

---

## 1. Context & User Story

*   **Context**: 系统需要一个统一、健壮的文件管理服务，替代分散的上传逻辑。为了彻底解决“僵尸文件”和“清理难”的问题，V2 采用 **基于业务槽位的全覆盖策略 (Key-Based Overwrite Strategy)**。
*   **User Story**:
    > 作为开发者，我希望上传文件时只需指定“用途(usage)”和“业务ID(context)”，系统能自动处理压缩、格式转换，并覆盖对应的旧文件，确保文件系统整洁有序。

---

## 2. Technical Design

### 2.1 核心策略 (Strategy Configuration)

所有文件路径和处理规则集中定义，严禁散落在 Controller 中。

| Usage Type | Slot (Default) | Path Rule (Relative) | Format | Resize | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `avatar` | `main` | `avatars/u_{userId}.webp` | WebP (Q80) | 200x200 | 用户/地陪头像。单例覆盖。 |
| `guide_photo` | `1`~`5` | `guides/u_{userId}_p_{slot}.webp` | WebP (Q80) | Max 1080p | 地陪相册。按槽位(1-5)覆盖。 |
| `check_in` | `start`/`end` | `orders/o_{orderId}_{slot}.webp` | WebP (Q80) | Max 1080p | 订单打卡。分开始/结束覆盖。 |
| `system` | `qrcode` | `system/{slot}.png` | PNG/JPEG | Original | 系统配置。默认 slot='qrcode'。 |

*注：`userId` 和 `orderId` 统称为 `contextId`。*

### 2.2 API Contract

#### Upload Attachment
*   **Endpoint**: `POST /api/v1/attachments/:usage`
    *   *Refinement*: 将 usage 放入 URL Path，方便路由分层和校验。
*   **Auth**: Authenticated
*   **Request**: `multipart/form-data`
    *   `file`: Binary (Max 10MB)
    *   `contextId`: String (Required for `avatar`, `guide_photo`, `check_in`. Optional for `system`)
    *   `slot`: String (Optional, defaults to defined default)
*   **Response**:
    ```json
    {
      "code": 0,
      "data": {
        "id": 101, // DB ID (Upserted)
        "url": "/uploads/avatars/u_1001.webp?t=1717171717", // Appended timestamp for cache busting
        "key": "avatars/u_1001.webp"
      }
    }
    ```

### 2.3 Database Design (`attachments`)
复用现有表，但逻辑调整为 **Upsert (Insert on Duplicate Key Update)**。

*   **Unique Constraint**: 需要新增唯一索引 `UNIQUE KEY idx_key (key)` (Key 是相对路径)。
*   **Fields**:
    *   `key`: `varchar(255)` (New! Stores "avatars/u_1001.webp")
    *   `url`: `varchar(500)` (Stores public URL)
    *   `uploaderId`: `int` (Last updater)
    *   `updatedAt`: `datetime`

### 2.4 Code Structure (Controller Layering)
为了保持清晰，Controller 将按模块分层（目录结构）：

```text
server/
  controllers/
    attachments/           <-- New Directory
      base.controller.ts   (Common logic)
      avatar.controller.ts (Handle avatar specific logic if any)
      system.controller.ts
      ...
  services/
    attachment.service.ts  (Core Strategy & Sharp Logic)
```
*但考虑到 MVP 复杂度，如果逻辑高度统一，可以合并为一个 `AttachmentController` 但内部用 Strategy Pattern 分发。鉴于用户建议“分一个层级”，我们将采用目录结构来组织。*

---

## 3. Implementation Checklist

*   [ ] **Step 1: Database Migration**
    *   Modify `attachments` schema: Add `key` column, Add Unique Index on `key`.
*   [ ] **Step 2: Service Layer**
    *   Implement `AttachmentService` with `STRATEGIES` config.
    *   Implement `sharp` processing.
*   [ ] **Step 3: Controller Layer**
    *   Implement `POST /api/v1/attachments/:usage` handler.
*   [ ] **Step 4: Route Registration**
    *   `server/routes/attachment.routes.ts`
*   [ ] **Step 5: Verification**
    *   Test overwriting (upload same file twice -> verify DB row count stays 1, updatedAt changes).
    *   Test cache busting (URL has timestamp).

---

## 4. Open Questions
*   **Permission Check**: 谁能上传 `contextId=1001` 的头像？
    *   *Answer*: Service 层需校验 `req.user.id === contextId` (for avatar/guide) or `isAdmin` (for system). 这需要在 Controller 层根据 usage 动态校验。
