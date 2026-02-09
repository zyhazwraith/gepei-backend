# Feature Spec: Admin Guide Management V2.2

## 1. Context & User Story
*   **Goal**: Decouple "Guide Certification" from "Marketplace Visibility".
*   **Problem**: Previously, approving a guide (`isGuide=true`) immediately made them visible/online. Admins need to verify guides without necessarily listing them immediately, or take them offline without revoking certification.
*   **New Logic**:
    *   **Certification (`isGuide`)**: User is a verified guide. Grants access to guide features.
    *   **Visibility (`status`)**: User is listed in the public marketplace (`online` vs `offline`).

## 2. Technical Design

### 2.1 API Changes (Backend Ready)
*   **List API**: `GET /api/v1/admin/guides` returns both `isGuide` (bool) and `status` (enum).
*   **Update API**: `PUT /api/v1/admin/guides/:id` accepts:
    *   `isGuide`: boolean
    *   `status`: 'online' | 'offline'

### 2.2 Frontend Requirements

#### A. Guide List Page (`GuideList.tsx`)
*   **Columns**:
    *   Add **"上架状态" (Visibility)** column.
    *   Rename "状态" to **"认证状态" (Certification)**.
*   **Display**:
    *   Certification: "已认证" (Green) / "待审核" (Yellow) / "未认证" (Gray).
    *   Visibility: "已上架" (Green) / "已下架" (Gray).

#### B. Guide Audit Page (`GuideAudit.tsx`)
*   **Controls**:
    *   Split the single "Certification" switch into two:
        1.  **认证状态 (isGuide)**: "开启代表用户已通过资质审核"
        2.  **上架状态 (Status)**: "开启代表用户在前台可见"
*   **Interaction Logic**:
    *   If `isGuide` is **OFF**: `Status` must be **OFF** and **Disabled**.
    *   If `isGuide` is **ON**: `Status` can be toggled freely.
*   **Validation**:
    *   Prevent saving if `Status=Online` but `isGuide=False` (Backend also enforces this, but Frontend should prevent UI state).

## 3. Implementation Checklist
*   [x] Backend API & Validation (Completed)
*   [ ] Frontend List Component
*   [ ] Frontend Audit Component
