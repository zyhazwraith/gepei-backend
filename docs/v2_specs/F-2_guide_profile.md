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
    *   `listPublicGuides`: Optimized with batch avatar resolution.
    *   `getPublicGuideDetail`: Fully implemented with photos/avatar.
    *   `getMyProfile`: Fully implemented.
    *   `updateMyProfile`: Implemented with clean input/output.
*   **Database**: ✅ **Migrated**
    *   `guides` table schema updated (`stageName`, `avatarId`, `realPrice`...).
*   **Admin Backend**: 🔄 **In Progress**
    *   `AdminGuideService` & `AdminGuideController` refactor.
*   **Frontend**: 🔄 **In Progress**
    *   Guide Side: `GuideEdit.tsx` completed.
    *   Admin Side: Pending implementation.

### 2.2 API Design

#### A. Public API (C-Side)
*   **List Endpoint**: `GET /api/v1/guides`
    *   **Logic**: Returns list of **Verified** guides (`isGuide=true` & `realPrice>0`).
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
          "latitude": 30.12,
          "longitude": 120.12,
          "address": "West Lake District"
        }
        ```
    *   **Response**: `{ "code": 0, "message": "更新成功" }` (No data returned).

#### C. Admin API (Management)
*   **List Endpoint**: `GET /api/v1/admin/guides`
    *   **Query**: `page`, `limit`, `status` ('pending' | 'verified' | 'all'), `keyword`, `city`.
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
                "updatedAt": "2023-10-01T12:00:00Z"
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
    *   **Returns**: Full profile + `isGuide` status + Sensitive info.
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
*   **Page**: `GuideEdit.tsx` (Completed).
*   **Features**: StageName, City, Photos (5 Slots), Price, Intro.

## 4. Frontend Design (Admin Side)

### 4.1 Guide List Page (`client/src/pages/admin/GuideList.tsx`)
*   **Layout**: Standard Table.
*   **Filters**: Status (All/Pending/Verified), City, Keyword.
*   **Columns**:
    1.  **Stage Name** (艺名)
    2.  **Phone** (手机号)
    3.  **City** (城市)
    4.  **Price** (System/Expected)
    5.  **Status** (Pending/Verified)
    6.  **Action** (Audit Button)

### 4.2 Guide Audit Page (`client/src/pages/admin/GuideAudit.tsx`)
*   **Layout**: Two Columns.
*   **Left Panel (Profile)**:
    *   Avatar, Stage Name, ID Number.
    *   City, Address (Text only, no map).
    *   Intro, Tags.
    *   Photos Grid (5 slots).
*   **Right Panel (Action)**:
    *   **Pricing**: Display `Expected Price`, Input `Real Price`.
    *   **Status**: Switch `Enable Guide Identity` (isGuide).
    *   **Save**: Button to commit changes.

## 5. Implementation Checklist

### Phase 1: Backend Implementation
- [ ] **Service**: Create `AdminGuideService` with `listGuides`, `getGuideDetail`, `updateGuideStatus`.
- [ ] **Model**: Update `findAllGuides` to support `status` enum filter.
- [ ] **Controller**: Refactor `AdminGuideController` to use Service.
- [ ] **Verification**: Script `scripts/verify-admin-guides.ts`.

### Phase 2: Frontend Implementation
- [ ] **Page**: `GuideList.tsx` (Admin List).
- [ ] **Page**: `GuideAudit.tsx` (Admin Detail).
- [ ] **Integration**: Connect to Admin API.
