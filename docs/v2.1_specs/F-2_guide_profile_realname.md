# F-2 Guide Profile Real Name & Privacy (V2.1)

## 1. Context
*   **Version**: V2.1
*   **Requirement**: Add "Real Name" support for guides.
*   **Constraint**: Privacy protection. `realName` and `idNumber` must NOT be exposed to public users.

## 2. Database Schema
*   **Table**: `guides`
*   **New Field**:
    *   `realName` (varchar(50), nullable): Stores the guide's real name.
*   **Existing Field**:
    *   `idNumber` (varchar(18), not null): Stores ID card number.

## 3. Privacy Strategy (Code-Level)
*   **Policy**: "Single Table, Strict Projection".
*   **Implementation**:
    *   Define `PublicGuideSelect` in Model layer excluding sensitive fields (`realName`, `idNumber`).
    *   **Public API** (`listPublicGuides`): MUST use `PublicGuideSelect`.
    *   **Private API** (`getMyProfile`, `Admin`): Can select full columns.

## 4. API Specification

### 4.1 Update Profile (Guide Side)
*   **Endpoint**: `PUT /api/v1/guides/profile`
*   **Payload**:
    ```json
    {
      "stageName": "Anna",
      "realName": "张三", // New
      "idNumber": "3101...", // Existing
      ...
    }
    ```

### 4.2 Get Profile (Guide Side)
*   **Endpoint**: `GET /api/v1/guides/profile`
*   **Response**: Includes `realName` and `idNumber`.

### 4.3 List Guides (Public Side)
*   **Endpoint**: `GET /api/v1/guides`
*   **Response Item**:
    ```json
    {
      "userId": 1,
      "stageName": "Anna",
      "city": "Shanghai",
      // realName: REMOVED
      // idNumber: REMOVED
      ...
    }
    ```

### 4.4 Admin Detail (Admin Side)
*   **Endpoint**: `GET /api/v1/admin/guides/:id`
*   **Response**: Includes `realName` and `idNumber`.

## 5. UI Changes
*   **Guide Edit**: Add "Real Name" input field.
*   **Admin Audit**: Display "Real Name" field.
