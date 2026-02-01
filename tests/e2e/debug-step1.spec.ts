
import { test, expect } from '@playwright/test';
import { registerUser, loginUser, createTestGuide } from '../utils/helpers';

test.describe('Admin Custom Order Flow - Interactive Debug', () => {
  // Use a longer timeout for debugging
  test.setTimeout(120000);

  let userPhone: string;
  let guidePhone: string;

  test.beforeAll(async () => {
    try {
      console.log('--- SETUP START ---');
      const userRes = await registerUser();
      userPhone = userRes.user.phone;
      console.log(`User created: ${userPhone}`);

      const guideRes = await registerUser();
      guidePhone = guideRes.user.phone;
      const guideToken = await loginUser(guidePhone, guideRes.user.password);
      await createTestGuide(guideToken, { city: 'Beijing', hourlyPrice: 200 });
      console.log(`Guide created: ${guidePhone}`);
      console.log('--- SETUP END ---');
    } catch (e) {
      console.error('Setup failed:', e);
      throw e;
    }
  });

  // Step 1: Login only
  test('Step 1: Admin Login and Navigate to Dashboard', async ({ page }) => {
    console.log('--- TEST START: Login ---');
    await page.goto('/login');
    console.log('On Login Page');

    // Fill login form
    await page.locator('input[type="tel"]').fill('19999999999');
    await page.locator('input[type="password"]').fill('AdminPassword123');
    await page.locator('button[type="submit"]').click();
    console.log('Clicked Login');

    // Debugging: Log current URL after click
    console.log('URL after click:', page.url());

    // Wait for ANY navigation or URL change
    await page.waitForLoadState('networkidle');
    console.log('Network idle, URL:', page.url());

    // Check if we are redirected to /admin/dashboard or /admin/orders or just /admin/*
    // Adjusting expectation to be very flexible for debugging
    await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });
    console.log('Successfully navigated to Admin area:', page.url());
  });
});
