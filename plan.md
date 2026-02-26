# Remaining C-Side Pages V3 Style Plan

## 1. Objective
Complete the V3 "Rose/Orange" visual overhaul by updating the remaining Consumer-facing pages (`Register`, `ResetPassword`, `GuideDetail`, `OrderDetail`, `OrderCreate`) to match the new design language established in the Home and Tab pages.

## 2. Page-Specific Changes

### 2.1 Auth Flow (`Register.tsx`, `ResetPassword.tsx`)
*   **Goal**: Match `Login.tsx`.
*   **Header**: Replace solid primary color with `bg-gradient-to-br from-orange-400 to-rose-500`.
*   **Navigation**: Add "Close/Back" button (X icon) similar to Login.
*   **Form Container**: Use `bg-white`, `rounded-2xl`, and `shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)]`.
*   **Buttons**: `rounded-full`, `shadow-orange-200`, bold text.
*   **Inputs**: `rounded-xl`.

### 2.2 Guide Detail (`GuideDetail.tsx`)
*   **Goal**: Create a premium profile view.
*   **Header**:
    *   Transparent header over a large cover image (or avatar blur).
    *   "Back" and "Share" buttons with glassmorphism (`bg-white/20`).
*   **Content**:
    *   Pull up content card (negative margin) over the header.
    *   `rounded-t-3xl` for the content container.
    *   Tags/Badges: `rounded-full` pills.
*   **Bottom Action Bar**:
    *   "Chat" and "Book Now" buttons.
    *   "Book Now": Large gradient button (`from-orange-500 to-rose-500`).

### 2.3 Order Detail (`OrderDetail.tsx`)
*   **Goal**: Clean, card-based status view.
*   **Header**: Standard white header with blur (`bg-white/80`).
*   **Status Card**:
    *   Gradient background for status (e.g., Orange for Pending, Green for Completed) OR
    *   Clean white card with colorful large Icon/Status text.
*   **Info Cards**: `rounded-2xl`, `border-none`, `shadow-sm`.
*   **Buttons**: `rounded-full` (e.g., "Pay Now", "Cancel").

### 2.4 Order Create (`OrderCreate.tsx`)
*   **Goal**: Simplified booking form.
*   **Header**: Standard white header.
*   **Form Elements**:
    *   Date/Time pickers: `rounded-xl`.
    *   Price Summary: Clear, large font (`text-2xl` for total).
*   **Submit Button**: Fixed bottom bar with large gradient "Pay" button.

## 3. Implementation Steps
1.  **Auth Pages**: Copy-paste header/layout logic from `Login.tsx` to `Register` and `ResetPassword`.
2.  **GuideDetail**: Refactor main layout to use the "Cover + Sheet" pattern.
3.  **Order Pages**: Update container backgrounds (`bg-slate-50/50`) and card styles.

## 4. Verification
*   Build check (`npm run build:client`).
*   Visual check of flows (Login -> Register, Home -> GuideDetail -> OrderCreate).
