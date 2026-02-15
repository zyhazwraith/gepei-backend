# Feature Spec: 阿里云短信认证体系 (SMS Auth System)

## 1. Context & User Story
*   **Goal**: 引入短信验证码功能，实现用户快捷登录（自动注册）、找回密码，提升用户体验和安全性。
*   **Scope**: 
    *   发送短信验证码 (阿里云)
    *   统一登录接口 (支持 密码/验证码)
    *   重置密码流程
    *   自动清理过期验证码

## 2. Technical Design

### 2.1 Stateless Architecture
System adopts a stateless design using Aliyun's `SendSmsVerifyCode` and `CheckSmsVerifyCode` APIs.
*   **No DB Storage**: Verification codes are not stored in our database.
*   **Rate Limiting**: Managed by Aliyun/Gateway side.
*   **Security**: Prevents code leakage and reduces DB load.

### 2.2 API Specifications

#### A. 发送验证码
*   **Endpoint**: `POST /api/v1/auth/verification-code`
*   **Rate Limit**: 60s per phone
*   **Request**:
    ```json
    {
      "phone": "13800138000",
      "usage": "login" // or 'reset_password'
    }
    ```
*   **Response**: `{ "success": true, "message": "短信已发送" }`

#### B. 统一登录 (Unified Login)
*   **Endpoint**: `POST /api/v1/auth/login`
*   **Request (Pattern 1: Password)**:
    ```json
    { "phone": "...", "password": "..." }
    ```
*   **Request (Pattern 2: SMS Code)**:
    ```json
    { "phone": "...", "code": "..." }
    ```
*   **Logic**:
    *   If `code` provided -> Verify SMS -> (User exists ? Login : Register)
    *   If `password` provided -> Verify Password -> Login

#### C. 重置密码
*   **Endpoint**: `POST /api/v1/auth/reset-password`
*   **Request**:
    ```json
    {
      "phone": "...",
      "code": "...",
      "newPassword": "..."
    }
    ```

### 2.3 Cleanup Strategy
*   **Deprecated**: No cleanup job needed as no data is stored.

## 3. Implementation Checklist
*   [ ] **Infra**: Install `@alicloud/dysmsapi20170525`, Create DB Table.
*   [ ] **Backend Core**: 
    *   `SmsService` (Aliyun wrapper)
    *   `VerificationService` (Generate/Verify/Store)
    *   `CleanVerificationCodesJob`
*   [ ] **API Implementation**:
    *   `AuthController.sendVerificationCode`
    *   `AuthController.login` (Update logic)
    *   `AuthController.resetPassword`
*   [ ] **Frontend**:
    *   Login Page: Add Tabs (Password/SMS)
    *   Reset Password Flow
