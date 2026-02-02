# F-2 Guide Profile Management (V2)

## 1. Overview
*   **PRD Reference**: Flow 8 (Guide Profile Edit) & Flow 10 (Admin Audit).
*   **Goal**: Allow guides to maintain their profile (LBS, Photos, Price) and Admins to manage guide visibility/pricing.
*   **User Stories**:
    *   **Guide**: "I want to update my photos, intro, and location so customers can find me."
    *   **Admin**: "I want to review guide profiles, set their billing price (`real_price`), and enable/disable them (`is_guide`)."

## 2. Technical Specification

### 2.1 Implementation Status (As of 2026-02-02)
*   **Backend API**: ✅ **Completed & Verified**
    *   `listPublicGuides`: Optimized with `GuideService` batch enrichment.
    *   `getPublicGuideDetail`: Returns enriched data (photos/avatar) without redundant `photoIds`.
    *   `getMyProfile`: Fully implemented.
    *   `updateMyProfile`: Implemented with clean input/output.
*   **Database**: ✅ **Migrated**
    *   `guides` table schema updated (`stageName`, `avatarId`, `realPrice`...).
*   **Admin Backend**: ✅ **Completed**
    *   `AdminGuideService` implemented using `GuideService` for enrichment.
    *   Supports `isGuide` filter and `phone` search.
*   **Frontend**: ✅ **Completed**
    *   Guide Side: `GuideEdit.tsx` completed.
    *   Admin Side: `GuideList.tsx` (with phone search & jump pagination) & `GuideAudit.tsx` completed.

### 2.2 API Design

#### A. Public API (C-Side)
*   **List Endpoint**: `GET /api/v1/guides`
    *   **Logic**: Returns list of **Verified** guides (`isGuide=true`).
    *   **Response**:
        ```json
        [
          {
            "userId": 1,
            "stageName": "Anna",
            "city": "Shanghai",
            "intro": "Short intro...",
            "price": 30000, // realPrice (System Price)
            "tags": ["Tag1"],
            "avatarUrl": "http://...",
            "latitude": 31.23,
            "longitude": 121.47,
            "distance": 5.2 // km (if lat/lng provided in query)
          }
        ]
        ```
*   **Detail Endpoint**: `GET /api/v1/guides/:id`
    *   **Response**:
        ```json
        {
          "userId": 1,
          "stageName": "Anna",
          "city": "Shanghai",
          "intro": "Full intro...",
          "price": 30000,
          "expectedPrice": 30000, // Optional
          "tags": ["Tag1"],
          "avatarUrl": "http://...",
          "photos": [
            { "id": 101, "url": "http://..." },
            { "id": 102, "url": "http://..." }
          ],
          "createdAt": "2023-01-01T00:00:00Z",
          "latitude": 31.23,
          "longitude": 121.47
        }
        ```

#### B. User API (Guide Side)
*   **Get Profile**: `GET /api/v1/guides/profile`
    *   **Auth**: Guide Only.
    *   **Response**:
        ```json
        {
          "userId": 1,
          "stageName": "Anna",
          "city": "Shanghai",
          "address": "Detailed Address",
          "intro": "Full intro...",
          "realPrice": 30000,
          "expectedPrice": 30000,
          "idNumber": "310101...",
          "tags": ["Tag1"],
          "avatarUrl": "http://...",
          "avatarId": 100,
          "photos": [
            { "id": 101, "url": "http://..." }
          ],
          "idVerifiedAt": "2023-01-01T00:00:00Z",
          "latitude": 31.23,
          "longitude": 121.47
        }
        ```
*   **Update Profile**: `PUT /api/v1/guides/profile`
    *   **Auth**: Guide Only.
    *   **Payload**:
        ```json
        {
          "stageName": "MyStageName",
          "city": "Hangzhou",
          "intro": "Full intro...",
          "tags": ["tag1"],
          "expectedPrice": 2000, // User's desired price
          "photoIds": [101, 102], // IDs only
          "avatarId": 100,
          "latitude": 30.12,
          "longitude": 120.12,
          "address": "West Lake District"
        }
        ```
    *   **Response**: `{ "code": 0, "message": "更新成功" }` (No data returned).

#### C. Admin API (Management)
*   **List Endpoint**: `GET /api/v1/admin/guides`
    *   **Query**: `page`, `limit`, `is_guide` (boolean), `keyword` (matches stageName/intro/phone), `city`.
    *   **Response** (Standard Pagination):
        ```json
        {
          "code": 0,
          "data": {
            "list": [
              {
                "userId": 101,
                "stageName": "Anna",
                "phone": "13800000000",
                "city": "Shanghai",
                "realPrice": 300,        // System Price
                "expectedPrice": 300,    // User Price
                "isGuide": true,         // Status
                "avatarUrl": "...",
                "photos": [{ "id": 1, "url": "..." }] // Enriched
              }
            ],
            "pagination": {
              "total": 50,
              "page": 1,
              "pageSize": 20,
              "totalPages": 3
            }
          }
        }
        ```
*   **Detail Endpoint**: `GET /api/v1/admin/guides/:userId`
    *   **Returns**: Full profile + `isGuide` status + Sensitive info (phone).
    *   **Response**:
        ```json
        {
          "code": 0,
          "data": {
            "userId": 101,
            "stageName": "Anna",
            "avatarUrl": "...",
            "phone": "13800000000",
            "nickname": "User_123",
            "idNumber": "310101...",
            "city": "Shanghai",
            "address": "Detailed Address",
            "intro": "...",
            "tags": ["Tag1"],
            "photos": [{ "id": 1, "url": "..." }],
            "realPrice": 300,
            "expectedPrice": 300,
            "isGuide": true
          }
        }
        ```
*   **Update Endpoint**: `PUT /api/v1/admin/guides/:userId`
    *   **Payload**:
        ```json
        {
          "isGuide": true,  // Enable/Disable
          "realPrice": 300  // Set Billing Price
        }
        ```

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
*   **Layout**: Standard Table with Pagination (Jump support).
*   **Filters**: Status Tabs (All/Pending/Verified), Keyword (Phone/Name/Intro).
*   **Columns**:
    1.  **ID**
    2.  **Stage Name** (艺名)
    3.  **Phone** (手机号)
    4.  **City** (城市)
    5.  **Price** (System/Expected)
    6.  **Status** (Pending/Verified)
    7.  **Action** (Audit/View Button)

### 4.2 Guide Audit Page (`client/src/pages/admin/GuideAudit.tsx`)
*   **Layout**: Two Columns.
*   **Left Panel (Profile)**:
    *   Avatar, Stage Name, ID Number, Phone.
    *   City, Address (Text only).
    *   Intro, Tags.
    *   Photos Grid.
*   **Right Panel (Action)**:
    *   **Pricing**: Display `Expected Price`, Input `Real Price`.
    *   **Status**: Switch `Enable Guide Identity` (isGuide).
    *   **Save**: Button to commit changes.

## 5. Implementation Checklist

### Phase 1: Backend Implementation
- [x] **Service**: Create `AdminGuideService` with `listGuides`, `getGuideDetail`, `updateGuideStatus`.
- [x] **Optimization**: Create `GuideService` for batch data enrichment (N+1 fix).
- [x] **Model**: Update `findAllGuides` to support `isGuide` filter and `phone` search.
- [x] **Cleanup**: Remove `photoIds` from responses and deprecated methods.

### Phase 2: Frontend Implementation
- [x] **Page**: `GuideList.tsx` (Admin List with Search & Pagination).
- [x] **Page**: `GuideAudit.tsx` (Admin Detail with Actions).
- [x] **Integration**: Connect to Admin API.
