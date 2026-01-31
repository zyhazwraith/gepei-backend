# Feature Spec: [F-3] System Config & QR Code

**Status**: Final
**Task**: [F-3] 系统配置接口 (System Config)
**Type**: Feature
**Owner**: Backend Team

---

## 1. Context & User Story

*   **Context**: 系统需要通过后台动态配置一些全局参数，最典型的是“客服微信二维码”。该功能依赖于 [F-0] 附件系统提供的文件存储能力。
*   **User Story**:
    > 作为管理员，我希望上传并更新客服二维码，以便用户在 App 端联系客服。
    > 作为用户，我希望看到的二维码是最新的。

---

## 2. Technical Design

### 2.1 API Design

#### 2.1.1 Get Public Configs
*   **Endpoint**: `GET /api/v1/system-configs`
*   **Auth**: Public (No Token Required)
*   **Query**: None (Always returns all whitelisted configs)
*   **Response**:
    ```json
    {
      "code": 0,
      "data": {
        "cs_qrcode_url": "/uploads/system/qrcode.png?t=171...",
        "cs_phone": "13800000000"
      }
    }
    ```

#### 2.1.2 Update Config (Admin Only)
*   **Endpoint**: `PUT /api/v1/admin/system-configs`
*   **Auth**: Admin Only
*   **Body**:
    ```json
    {
      "configs": [
        { "key": "cs_qrcode_url", "value": "/uploads/system/qrcode.png?t=..." }
      ]
    }
    ```
*   **Response**: `200 OK`

### 2.2 Workflow (QR Code Update)
1.  **Step 1 (Upload)**: Admin 前端调用 `POST /api/v1/attachments/system` (slot='qrcode')。
    *   后端覆盖 `uploads/system/qrcode.png`。
    *   后端返回 URL: `/uploads/system/qrcode.png?t=123456`.
2.  **Step 2 (Save)**: Admin 前端调用 `PUT /api/v1/admin/system-configs`。
    *   Payload: `{ configs: [{ key: 'cs_qrcode_url', value: '...' }] }`
    *   后端更新 `system_configs` 表。

### 2.3 Database Design (`system_configs`)
复用现有 Schema，无需变更。
*   `key`: varchar(50) PK
*   `value`: text
*   `description`: varchar(100)

**Predefined Keys**:
*   `cs_qrcode_url`: 客服二维码图片地址。

---

## 3. Implementation Checklist

*   [ ] **Backend: Service/Controller**
    *   `SystemConfigService`: `getConfigs(keys?)`, `updateConfigs(pair[])`.
    *   `SystemConfigController`: Handle APIs.
*   [ ] **Backend: Routes**
    *   `GET /api/v1/system-configs` (Public)
    *   `PUT /api/v1/admin/system-configs` (Admin)
*   [ ] **Backend: Verification**
    *   Script: `scripts/verify-F3.ts` (Simulate Upload -> Update -> Get flow).

---

## 4. Frontend Implementation

### 4.1 Page Design
*   **Path**: `/admin/settings`
*   **Structure**:
    *   Card: **System Settings**
        *   ImageUploader: `cs_qrcode_url` (WeChat QR Code)
    *   **Action**: Save Button

### 4.2 Components
*   **ImageUploader**: Reuses `Attachment API` (`POST /attachments/system`).
    *   Props: `onUploadSuccess(url: string)`
    *   Flow: Upload -> Get URL -> Set Form Value.

### 4.3 Implementation Steps
1.  **API**: Add `getPublicConfigs` & `updateSystemConfigs` to `api.ts`.
2.  **Page**: Create `SettingsPage.tsx` using `react-hook-form`.
3.  **Route**: Register `/admin/settings`.

