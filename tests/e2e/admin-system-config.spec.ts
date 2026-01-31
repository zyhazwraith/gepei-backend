import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Admin System Config', () => {
  const MOCK_QR_URL = '/uploads/system/qrcode.png?t=mock';

  test.beforeEach(async ({ page }) => {
    // === DEBUG: Capture Browser Logs ===
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err}`));
    
    // 1. Mock Login & User Info (Prevent Redirect)
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { userId: 1, role: 'admin', nickName: 'Admin', phone: '13800000000' }
        })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-admin-token');
      localStorage.setItem('user', JSON.stringify({ role: 'admin', nickName: 'Admin' }));
    });

    // 2. Mock API: Get Configs (Initial)
    await page.route('**/api/v1/system-configs', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: { cs_qrcode_url: '' }
          })
        });
      } else {
        await route.continue();
      }
    });

    // 3. Navigate to Settings Page
    await page.goto('/admin/settings');
    
    // 4. Ensure we are on the page
    await expect(page).toHaveURL('/admin/settings');
  });

  test('should upload qr code and save config', async ({ page }) => {
    // 1. Check Initial State using data-testid
    await expect(page.getByTestId('system-config-form')).toBeVisible();
    await expect(page.getByTestId('image-uploader-wrapper')).toBeVisible();

    // 2. Mock API: Upload
    await page.route('**/api/v1/attachments/system', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { url: MOCK_QR_URL }
        })
      });
    });

    // 3. Mock API: Update Config
    let updatePayload: any = null;
    await page.route('**/api/v1/admin/system-configs', async route => {
      if (route.request().method() === 'PUT') {
        updatePayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 0, message: 'Success' })
        });
      }
    });

    // 4. Perform Upload
    // Note: ImageUploader input might be hidden, so we target the file input inside
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/qrcode.png'));

    // Wait for preview image to appear
    // Using a more robust selector if data-testid is not on the img tag itself
    // Assuming ImageUploader renders an img tag when value is present
    await expect(page.locator('[data-testid="image-uploader-wrapper"] img')).toHaveAttribute('src', MOCK_QR_URL);

    // 5. Click Save
    await page.getByTestId('submit-config-btn').click();

    // 6. Verify Request
    expect(updatePayload).toBeTruthy();
    expect(updatePayload.configs).toContainEqual({
      key: 'cs_qrcode_url',
      value: MOCK_QR_URL
    });

    // 7. Verify Success Message
    await expect(page.getByText('配置已保存')).toBeVisible();
  });

  test('should display existing config', async ({ page }) => {
    // Override Initial Mock to return existing data
    await page.route('**/api/v1/system-configs', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: { cs_qrcode_url: MOCK_QR_URL }
          })
        });
    });

    // Explicitly navigate instead of reload to ensure mocks are applied
    await page.goto('/admin/settings');
    
    // Verify Image is loaded
    await expect(page.locator('[data-testid="image-uploader-wrapper"] img')).toHaveAttribute('src', MOCK_QR_URL);
  });
});
