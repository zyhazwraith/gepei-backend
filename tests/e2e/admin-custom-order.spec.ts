
import { test, expect } from '@playwright/test';
import { registerUser, loginUser, createTestGuide, API_URL } from '../utils/helpers';

test.describe('Admin Custom Order Flow', () => {
  // Increase timeout to 60 seconds for this suite
  test.setTimeout(60000);

  let userPhone: string;
  let guidePhone: string;

  test.beforeAll(async () => {
    try {
      console.log('Setting up test data...');
      // 1. Create a normal user
      const userRes = await registerUser();
      userPhone = userRes.user.phone;
      console.log(`Created test user: ${userPhone}`);

      // 2. Create a guide
      const guideRes = await registerUser();
      guidePhone = guideRes.user.phone;
      const guideToken = await loginUser(guidePhone, guideRes.user.password);
      await createTestGuide(guideToken, { city: 'Beijing', hourlyPrice: 200 });
      console.log(`Created test guide: ${guidePhone}`);
    } catch (e) {
      console.error('Setup failed:', e);
      throw e;
    }
  });

  test('should create a custom order successfully', async ({ page }) => {
    console.log('Starting test execution...');
    
    // 1. Login as Admin
    await page.goto('/admin/login');
    // Login form usually has simple inputs, but we can add test-ids there later if needed.
    // For now, keep using robust locators for login page
    await page.locator('input[type="tel"]').fill('19999999999');
    await page.locator('input[type="password"]').fill('AdminPassword123');
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to admin dashboard or orders
    await expect(page).toHaveURL(/\/admin\/dashboard|\/admin\/orders/, { timeout: 15000 });
    console.log('Admin logged in successfully');
    
    // 2. Navigate to Order List
    await page.goto('/admin/orders');
    console.log('Navigated to Order List. Current URL:', page.url());

    // Debugging: Log page content if button is not found
    try {
      const createBtn = page.getByTestId('create-custom-order-btn');
      await expect(createBtn).toBeVisible({ timeout: 5000 });
      await createBtn.click();
      console.log('Clicked Create Button');
    } catch (e) {
      console.log('Failed to find create button. Dumping page info:');
      console.log('URL:', page.url());
      console.log('Title:', await page.title());
      // Log part of the body to see where we are
      const bodyText = await page.innerText('body');
      console.log('Body Text Snippet:', bodyText.slice(0, 500));
      throw e;
    }

    // 4. Fill Form using test-ids
    await expect(page.getByTestId('create-custom-order-form')).toBeVisible();
    
    await page.getByTestId('input-user-phone').fill(userPhone);
    await page.getByTestId('input-guide-phone').fill(guidePhone);
    await page.getByTestId('input-price-yuan').fill('100');
    await page.getByTestId('input-duration').fill('5');
    
    // Date input
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.getByTestId('input-service-start-time').fill(dateStr);

    await page.getByTestId('input-service-address').fill('Test Address Beijing');
    await page.getByTestId('input-content').fill('This is an automated test order');

    console.log('Form filled');

    // 5. Submit
    await page.getByTestId('submit-create-order-btn').click();
    console.log('Submit clicked');

    // 6. Verify Success
    // Check for success toast
    await expect(page.getByText('定制订单创建成功')).toBeVisible({ timeout: 15000 });
    console.log('Success toast seen');
    
    // Check if dialog closed
    await expect(page.getByTestId('create-custom-order-form')).not.toBeVisible();

    // 7. Verify Order in List
    // Reload to be sure
    await page.reload();
    await expect(page.getByText(userPhone).first()).toBeVisible({ timeout: 10000 });
    console.log('Order verified in list');
  });
});
