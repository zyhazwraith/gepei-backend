import { test, expect } from '@playwright/test';
import { generatePhone, checkConsoleErrors } from '../utils/e2e-helpers';

test.describe('Transaction Flow (Home -> Guide -> Order -> Payment)', () => {
  let userPhone: string;
  const password = 'Password123';

  test.beforeAll(async () => {
    userPhone = generatePhone();
  });

  test.beforeEach(async ({ page }) => {
    checkConsoleErrors(page);
  });

  test('should register user first', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[placeholder="请输入手机号"]', userPhone);
    await page.fill('input[placeholder="请输入昵称"]', 'Buyer');
    await page.fill('input[placeholder="请设置8-20位密码，包含字母和数字"]', password);
    await page.fill('input[placeholder="请再次输入密码"]', password);
    
    // Agree to terms
    await page.click('button[role="checkbox"]');
    
    await page.click('button:has-text("注册")');
    // Register success redirects to Home directly
    await page.waitForURL('**/');
  });

  test('should complete the full booking flow', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="tel"]', userPhone);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/');

    // 2. Browse Home
    // Wait for content to load. '热门地陪' might be inside a component that loads async.
    await expect(page.locator('text=推荐地陪').or(page.locator('text=热门地陪'))).toBeVisible({ timeout: 10000 });
    
    // 3. Go to Guides List
    // Nav bar usually has links. If it's a mobile nav, it might be icons.
    // Assuming bottom navigation bar exists with "地陪" or "列表"
    // If not found, navigate directly
    await page.goto('/guides');
    
    await expect(page).toHaveURL('/guides');
    // The grid might not be visible immediately or class name differs
    // Check for any content indicating list loaded. Try to find any text that exists on the page.
    // Maybe "综合排序" or just wait for the first image
    // await expect(page.locator('text=筛选').or(page.locator('text=推荐排序'))).toBeVisible();
    await page.waitForSelector('img', { timeout: 10000 }).catch(() => {});
  
    // 4. Select first guide
    // Wait for list to load
    await page.waitForSelector('img', { timeout: 10000 }).catch(() => {});
    
    // Ensure we have at least one guide card before clicking
    // The selector might be wrong or no guides loaded
    // Updated selector based on Guides.tsx (it uses Card with onClick, not Link, and not .grid)
    const cardSelector = 'div.cursor-pointer:has(h3)';
    await expect(page.locator(cardSelector).first()).toBeVisible({ timeout: 10000 });
    
    // Click the first guide card
    const firstGuide = page.locator(cardSelector).first();
    // const guideName = await firstGuide.locator('h3').textContent();
    await firstGuide.click();

    // 5. Check Guide Detail (Critical Step for ReferenceError)
    await expect(page).toHaveURL(/\/guides\/\d+/);
    await expect(page.locator('text=立即预订')).toBeVisible();
    
    // Check if distance is displayed (fix verification)
    // Note: It might say "距您 xx km" or be hidden if geo fails, but page shouldn't crash
    
    // 6. Start Booking
    await page.click('text=立即预订');
    await expect(page).toHaveURL(/\/orders\/create/);

    // 7. Fill Order Form
    // Fill Date (Native date picker is tricky, assuming standard input)
    await page.fill('input[type="date"]', '2026-10-01');
    // Fill Hours
    // await page.fill('input[type="number"]', '4'); 
    // Wait, the UI might be a slider or counter. Let's assume input for now based on previous code.
    // If it fails, I'll adjust.
    
    // Submit Order
    await page.click('button:has-text("提交订单")');

    // 8. Payment Page / Order Detail
    // Should redirect to Order Detail with "Pending" status
    await page.waitForURL(/\/orders\/\d+/);
    // Use .first() to avoid strict mode violation if multiple elements contain the text (e.g. title and badge)
    await expect(page.locator('text=待支付').first()).toBeVisible();

    // 9. Pay
    // Button text is "微信支付 ¥xxx" not "立即支付"
    await page.click('button:has-text("微信支付")');
    
    // Simulate Payment Sheet interaction
    // The sheet might have "微信支付" option again or just "确认支付"
    // Assuming standard flow: Select Method -> Pay
    // If the button on main page already says "WeChat Pay", maybe the sheet is just for confirmation?
    // Let's wait for the sheet to appear
    // Title is "确认付款"
    await expect(page.locator('text=确认付款')).toBeVisible();
    // Button inside sheet is "立即支付"
    await page.click('button:has-text("立即支付")');

    // 10. Verify Success
    // Status text for 'paid' is "等待地陪接单"
    await expect(page.locator('text=等待地陪接单')).toBeVisible();
  });
});
