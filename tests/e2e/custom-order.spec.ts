import { test, expect } from '@playwright/test';
import { generatePhone, checkConsoleErrors } from '../utils/e2e-helpers';

test.describe('Custom Order Flow (Custom -> Admin Assign -> User Select -> In Progress)', () => {
  let userPhone: string;
  const password = 'Password123';
  let orderId: string;

  test.beforeAll(async () => {
    userPhone = generatePhone();
  });

  test.beforeEach(async ({ page }) => {
    checkConsoleErrors(page);
  });

  test('should register user first', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[placeholder="请输入手机号"]', userPhone);
    await page.fill('input[placeholder="请输入昵称"]', 'CustomUser');
    await page.fill('input[placeholder="请设置8-20位密码，包含字母和数字"]', password);
    await page.fill('input[placeholder="请再次输入密码"]', password);
    await page.click('button[role="checkbox"]');
    await page.click('button:has-text("注册")');
    await page.waitForURL('**/');
  });

  test('should create a custom order', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="tel"]', userPhone);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/');

    // 2. Navigate to Custom Order Page
    // Assuming there is a link or button on home page or nav
    // If not, go directly
    await page.goto('/custom');
    
    // 3. Fill Form
    // Using IDs from Custom.tsx
    await page.fill('input[id="date"]', '2026-12-01');
    await page.fill('input[id="city"]', '大理');
    await page.fill('textarea[id="content"]', 'Need a photographer guide for 2 days.');
    await page.fill('input[id="budget"]', '2000'); // Budget
    await page.fill('textarea[id="requirements"]', 'Must drive.');

    // 4. Submit
    await page.getByTestId('submit-custom-order-btn').click();

    // 5. Confirm Page
    // Verify confirmation details
    await expect(page.locator('text=需付订金')).toBeVisible();
    // Use .first() to avoid strict mode violation (text exists in span and button)
    await expect(page.locator('text=¥150.00').first()).toBeVisible();

    // 6. Pay
    await page.getByTestId('pay-deposit-btn').click();
    // Note: Custom.tsx mocks payment directly in handlePayment, showing toast "支付成功！"
    // It does NOT open the PaymentSheet component like OrderDetail.tsx does.
    // It then moves to step 3 (Success Page).
    
    // 7. Verify Success Page
    // Use .first() to avoid strict mode violation (toast and heading both say "支付成功")
    await expect(page.locator('text=支付成功').first()).toBeVisible();
    await expect(page.locator('text=查看订单')).toBeVisible();

    // 8. Go to Order Detail to get ID
    await page.click('button:has-text("查看订单")');
    await page.waitForURL(/\/orders\/\d+/);
    
    // Get Order ID from URL
    const url = page.url();
    const match = url.match(/\/orders\/(\d+)/);
    if (match) {
        orderId = match[1];
    }

    // Verify status in Order Detail
    // Status should be 'paid' -> "等待地陪接单"
    await expect(page.locator('text=等待地陪接单')).toBeVisible();
  });

  // Note: The Admin Assignment part involves Admin UI, which might be complex to test in the same user session.
  // We can either:
  // 1. Logout user, Login admin, Assign, Logout admin, Login user.
  // 2. Use a separate test file or just skip E2E for admin part here and assume backend works (Integration test covers it).
  // Let's try to do it all-in-one for a complete flow if possible.

  test('admin should assign candidates', async ({ page }) => {
     // Skip if no orderId
     if (!orderId) test.skip();

     // 1. Admin Login
     await page.goto('/admin/login');
     await page.fill('input[id="phone"]', '19999999999');
     await page.fill('input[id="password"]', 'AdminPassword123');
     await page.click('button[type="submit"]');
     await page.waitForURL('/admin/dashboard');

     // 2. Go to Orders
     await page.goto('/admin/orders');
     
     // 3. Find the order (Assuming it's at the top or we can filter)
     // This is tricky without unique ID in UI. 
     // Let's just visit the order detail page in admin directly if possible, or use API.
     // For E2E, UI interaction is preferred. 
     // Let's assume the new order is first in list.
     
     // Note: OrderList.tsx handles assignment directly in the list, not in a separate detail page.
     // We need to find the row for our order and click "指派".
     // Since we just created it, it should be at the top.
     // Wait for the table to load
     await page.waitForSelector('table');
     
     // Find the row that contains our order ID (if displayed) or just the first row with "定制单"
     // The order number is displayed. But we don't have the order number, only ID.
     // Let's rely on the fact that it's the most recent one.
     // Click the first "指派" button found.
     // Use data-testid if possible, but since we don't know the exact order ID (it's generated), 
     // we can look for the first button that has data-testid starting with "assign-btn-"
     await page.locator('[data-testid^="assign-btn-"]').first().click();
     
     // 4. Assign Guide
     // Wait for dialog
     await expect(page.locator('text=指派地陪')).toBeVisible();
     
     // Select a guide from dialog/list
     // The list items are divs with onClick.
     // Wait for guide list to load (Avatar fallback or name)
     // Just click the first guide item in the scroll area.
     // Using data-testid
     await page.locator('[data-testid^="guide-item-"]').first().click();
     
     // Confirm assignment
     // Button text is "确认指派 (1)"
     await page.getByTestId('confirm-assign-btn').click();
     
     // Verify status change in Admin
     // Should change to "待确认" (waiting_for_user)
     await expect(page.locator('text=待确认').first()).toBeVisible();
  });

  test('user should select a guide', async ({ page }) => {
    if (!orderId) test.skip();

    // 1. User Login
    await page.goto('/login');
    await page.fill('input[type="tel"]', userPhone);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/');

    // 2. Go to Order Detail
    await page.goto(`/orders/${orderId}`);

    // 3. Check status "请选择地陪"
    await expect(page.locator('text=请选择地陪')).toBeVisible();

    // 4. See Candidates
    await expect(page.locator('text=候选地陪')).toBeVisible();
    await expect(page.locator('text=选择TA')).toBeVisible();

    // 5. Select Guide
    await page.click('button:has-text("选择TA")'); // Select the first one

    // 6. Verify Status "进行中" / "订单进行中"
    await expect(page.locator('text=订单进行中')).toBeVisible();
  });

});
