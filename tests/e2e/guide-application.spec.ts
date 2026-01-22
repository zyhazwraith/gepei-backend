import { test, expect } from '@playwright/test';
import { generatePhone, checkConsoleErrors } from '../utils/e2e-helpers';

test.describe('Guide Application Flow', () => {
  let userPhone: string;
  const password = 'Password123';
  // Use a random ID number to avoid conflict on repeated runs
  const randomIdSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const idNumber = `11010119900101${randomIdSuffix}`;

  test.beforeAll(async () => {
    userPhone = generatePhone();
  });

  test.beforeEach(async ({ page }) => {
    checkConsoleErrors(page);
  });

  test('should apply to become a guide', async ({ page }) => {
    // 1. Register User
    await page.goto('/register');
    await page.fill('input[placeholder="请输入手机号"]', userPhone);
    await page.fill('input[placeholder="请输入昵称"]', 'GuideApplicant');
    await page.fill('input[placeholder="请设置8-20位密码，包含字母和数字"]', password);
    await page.fill('input[placeholder="请再次输入密码"]', password);
    await page.click('button[role="checkbox"]');
    await page.click('button:has-text("注册")');
    await page.waitForURL('**/');

    // 2. Login
    await page.goto('/login');
    await page.fill('input[type="tel"]', userPhone);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/');

    // 3. Go to Profile
    await page.goto('/profile');
    
    // 4. Click Become Guide
    // Since we don't have a test id on the profile button yet, we rely on text for now or add it.
    // Ideally we should add it to Profile.tsx too, but let's stick to the plan scope first.
    // The button text is "认证为地陪" for new users.
    await page.click('text=认证为地陪');
    
    // Verify we are on guide profile edit page
    await expect(page).toHaveURL('/guides/profile');
    
    // 5. Fill Guide Form using data-testid
    await page.getByTestId('guide-id-number').fill(idNumber);
    await page.getByTestId('guide-real-name').fill('张三');
    
    // City Selection
    await page.getByTestId('city-selector').click();
    await expect(page.getByTestId('city-selector-dialog')).toBeVisible();
    await page.getByTestId('city-search-input').fill('北京');
    await page.getByTestId('city-option-北京').click();
    
    await page.getByTestId('guide-price').fill('200');
    await page.getByTestId('guide-intro').fill('我是北京本地人，熟悉各种胡同文化。');
    
    // 6. Submit
    await page.getByTestId('save-guide-profile-btn').click();
    
    // 7. Verify Success Redirect
    // Should redirect back to profile
    await page.waitForURL('/profile');
    
    // 8. Verify Status Change
    // Button text should change to "管理地陪资料"
    await expect(page.locator('text=管理地陪资料')).toBeVisible();
  });
});
