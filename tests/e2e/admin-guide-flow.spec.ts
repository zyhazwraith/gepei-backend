import { test, expect } from '@playwright/test';

test.describe('Admin Guide Management Flow', () => {
  
  // 1. Admin Login
  test.beforeEach(async ({ page }) => {
    // Assuming we have a way to bypass login or login as admin
    // For now, let's assume we can login via UI
    await page.goto('/admin/login');
    await page.fill('input[placeholder="请输入手机号"]', '19999999999');
    await page.fill('input[placeholder="请输入密码"]', 'AdminPassword123');
    await page.click('button:has-text("登录")');
    await expect(page).toHaveURL('/admin/dashboard');
  });

  // 2. Create Guide Flow
  test('Create a new guide profile', async ({ page }) => {
    // Go to Guide List
    await page.click('text=向导管理');
    await expect(page).toHaveURL('/admin/guides');

    // Click "New Guide"
    await page.click('button:has-text("新建地陪")');
    await expect(page).toHaveURL('/admin/guides/create');

    // Step 1: Find User
    await page.fill('[data-testid="input-search-phone"]', '13812345678'); // Assuming this user exists
    await page.click('[data-testid="btn-search-user"]');
    
    // Wait for form to appear
    await expect(page.locator('[data-testid="guide-form"]')).toBeVisible();

    // Step 2: Fill Form
    await page.fill('[data-testid="input-stage-name"]', 'E2E Test Guide');
    await page.fill('[data-testid="input-real-name"]', 'Test Real Name');
    
    // Toggle Status (isGuide)
    await page.click('[data-testid="switch-is-guide"]');
    
    // Toggle Status (online)
    await page.click('[data-testid="switch-status"]');

    // Save
    await page.click('[data-testid="btn-save-guide"]');

    // Expect success and redirect
    await expect(page).toHaveURL('/admin/guides');
    await expect(page.locator('text=E2E Test Guide')).toBeVisible();
  });

  // 3. Edit Guide Flow
  test('Edit existing guide profile', async ({ page }) => {
    // Go to Guide List
    await page.click('text=向导管理');
    
    // Find the guide we created (or any guide) and click Edit
    // This assumes the list has at least one guide
    await page.click('text=审核/查看 >> nth=0');
    
    // Verify Edit Page
    await expect(page.locator('[data-testid="guide-form"]')).toBeVisible();
    
    // Change Stage Name
    await page.fill('[data-testid="input-stage-name"]', 'Updated Guide Name');
    
    // Save
    await page.click('[data-testid="btn-save-guide"]');
    
    // Verify Toast or UI update
    await expect(page.locator('text=保存成功')).toBeVisible();
  });

});
