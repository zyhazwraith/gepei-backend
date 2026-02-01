# Feature Spec: [F-2] Guide Profile Update

## 1. Context & User Story
*   **PRD Reference**: Flow 8 (Guide Profile Edit) & Flow 10 (Admin Audit).
*   **Goal**: Allow guides to maintain their profile (LBS, Photos, Price) and Admins to manage guide visibility/pricing.
*   **User Stories**:
    *   **Guide**: "I want to update my photos, intro, and location so customers can find me."
    *   **Admin**: "I want to review guide profiles, set their billing price (`real_price`), and enable/disable them (`is_guide`)."

## 2. Technical Design

### 2.1 Database Design
*   **Target Table**: `guides` & `users`
*   **Key Fields**:
    *   `users.is_guide` (Boolean): **Primary Switch**. `true` = Active/Verified, `false` = Inactive/Pending.
    *   `guides.stage_name` (Varchar): **New**. Display name for guides (Renamed from `name`). Decoupled from `users.nickname`.
    *   `guides.expected_price` (Int): Set by Guide (Request).
    *   `guides.real_price` (Int): Set by Admin (Actual).
    *   `guides.id_verified_at` (Timestamp): **Verification Record**. Records the time when `is_guide` flips to true. Used to display "Verified since...".
    *   `guides.latitude` / `longitude` / `city` / `address`: LBS info (Stored as flat columns).

### 2.2 API Design

#### A. Client Side (Guide)
*   **Endpoint**: `PUT /api/v1/guides/me`
*   **Auth**: `Role: user` (Authenticated)
*   **Payload** (Flattened LBS for simplicity):
    ```json
    {
      "stage_name": "MyStageName", // New
      "avatar_id": 123, 
      "photo_ids": [1, 2, 3],
      "intro": "String",
      "expected_price": 2000, // Cents
      "tags": ["tag1"],
      "latitude": 30.123456,
      "longitude": 120.123456,
      "city": "Hangzhou",
      "address": "West Lake"
    }
    ```
*   **Logic**: 
    *   Updates `guides` table. 
    *   **Removed**: `name` (Real Name), `idNumber` (Not required in V2 Guide Edit, handled in separate ID Verification flow if needed, or Admin Only).
    *   **Renamed**: `name` -> `stageName` in Schema.
    *   **Validation**: Frontend-only check for age.

#### B. Admin Side (Management)
*   **List Endpoint**: `GET /api/v1/admin/guides` (New)
    *   **Query**: `page`, `page_size`, `status` (all, pending, verified), `keyword`.
    *   **Returns**: List of guides including `isGuide` status.
*   **Detail Endpoint**: `GET /api/v1/admin/guides/:userId` (New)
    *   **Returns**: Full profile + `isGuide` status + Sensitive info (Real Name/ID if available).
*   **Update Endpoint**: `PUT /api/v1/admin/guides/:userId`
    *   **Payload**:
        ```json
        {
          "is_guide": true,  // Enable/Disable (Updates `users` table)
          "real_price": 2500 // Set Billing Price (Updates `guides` table)
        }
        ```
*   **Logic**:
    1.  **Transaction Required**: Update both `users` and `guides` tables.
    2.  If `is_guide` becomes `true`, update `guides.id_verified_at = NOW()` (if currently null).

## 3. Frontend Design (Guide Side)

### 3.1 Page Structure (`GuideEdit.tsx`)
The page will maintain its current layout but with updated components:

1.  **Avatar Section (Updated)**:
    *   **Component**: `ImageUploader` (Unified component).
    *   **Action**: Click to upload/replace avatar.

2.  **Basic Info Section**:
    *   **Stage Name**: New input for `stageName`.
    *   **Removed**: Real Name, ID Number inputs.
    *   **City Selector** (Existing).

3.  **LBS / Residence Section (Updated)**:
    *   **Label**: "常住地 (用于推荐)"
    *   **Component**: `LocationPicker` (Existing `client/src/components/common/LocationPicker.tsx`).
    *   **Interaction**: Open Map -> Select Residence.
    *   **Display**: Show selected address text below the input.

4.  **Photos Section (Updated)**:
    *   **Component**: `ImageUploader` (Unified component, supports multi-upload).

5.  **Price Section (Updated)**:
    *   **Input Label**: "期望时薪 (¥/小时)"
    *   **Helper Text**: "最终展示价格由平台审核决定"
    *   **Read-only Display**: If `realPrice` exists and differs from `expectedPrice`, show: "当前展示价格: ¥{realPrice}" (with a lock icon).

6.  **Age Confirmation (New)**:
    *   **Checkbox**: "我确认已年满 18 周岁" (Mandatory).

## 4. Frontend Design (Admin Side)

### 4.1 Guide List Page (`client/src/pages/admin/GuideList.tsx`)
*   **Entry**: From Admin Dashboard -> "地陪管理".
*   **Features**:
    *   Table listing all guide applications.
    *   Columns: Avatar, Stage Name, City, Status (`isGuide`), Created At, Actions.
    *   **Filters**: Status (All/Pending/Verified), City.
    *   **Action**: "Audit" button -> Navigates to Audit Page.

### 4.2 Guide Audit Page (`client/src/pages/admin/GuideAudit.tsx`)
*   **Entry**: From Guide List -> Click "Audit".
*   **Layout**:
    *   **Left Panel (Profile)**:
        *   Avatar, Stage Name (`stageName`), Real Name (if any).
        *   Photos Carousel.
        *   Intro Text.
        *   **Map Preview**: Show `latitude/longitude` on a static map.
        *   **Residence**: Show `address`.
    *   **Right Panel (Action)**:
        *   **Status Toggle**: Switch `Is Guide` (Active/Inactive).
        *   **Price Input**: `Real Price` (¥/Hour).
        *   **Save Button**: Calls `PUT /api/v1/admin/guides/:userId`.

## 5. Implementation Checklist

### Phase 1: Backend Implementation (Update)
- [x] **Schema**: Rename `name` to `stage_name`.
- [ ] **Model**: Update `findAllGuides` to support `onlyVerified` filter (default true).
- [ ] **Controller**: Add `AdminGuideController.list` and `AdminGuideController.detail`.
- [ ] **Controller**: Fix `AdminGuideController.updateStatus` to use `stageName`.

### Phase 2: Frontend Implementation
- [x] **Component**: `ImageUploader` refactor.
- [x] **Page**: `GuideEdit.tsx` update (StageName, ImageUploader).
- [ ] **Page**: Create `src/pages/admin/GuideList.tsx`.
- [ ] **Page**: Update `src/pages/admin/GuideAudit.tsx` to use Admin API.
- [ ] **Verification**: Manual test (Guide Update -> Admin List -> Admin Audit).
