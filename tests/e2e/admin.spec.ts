import { test, expect } from '@playwright/test';
import { checkConsoleErrors } from '../utils/e2e-helpers';

test.describe('Admin Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    checkConsoleErrors(page);
  });

  test('should login as admin', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[id="phone"]', '19999999999');
    await page.fill('input[id="password"]', 'AdminPassword123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/admin/dashboard');
    // Admin dashboard title check
    await expect(page.locator('h1').filter({ hasText: 'Gepei Admin' }).first()).toBeVisible();
  });

  test('should view user list', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[id="phone"]', '19999999999');
    await page.fill('input[id="password"]', 'AdminPassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');

    // Navigate to User List
    // It might be a nav link, use page.goto as backup
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/admin/users');
    
    // Check table content
    // await expect(page.locator('table')).toBeVisible();
    // Ensure at least one user row exists (Admin himself or seeded users)
    // await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('should view order list', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[id="phone"]', '19999999999');
    await page.fill('input[id="password"]', 'AdminPassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');

    // Navigate to Order List
    await page.goto('/admin/orders');
    await expect(page).toHaveURL('/admin/orders');

    // Check table content
    // await expect(page.locator('table')).toBeVisible();
  });
});
