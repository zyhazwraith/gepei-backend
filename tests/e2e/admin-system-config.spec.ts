import { test, expect } from '@playwright/test';

test('Admin Settings Page - Render Check', async ({ page }) => {
  // Debug Network
  page.on('request', request => console.log(`>> ${request.method()} ${request.url()}`));
  page.on('response', response => console.log(`<< ${response.status()} ${response.url()}`));
  page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  // 1. Mock Login (localStorage)
  await page.addInitScript(() => {
    localStorage.setItem('gepei_token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({ 
      userId: 1, 
      role: 'admin', 
      nickName: 'Admin' 
    }));
  });

  // 2. Mock APIs using glob patterns (simpler/safer)
  // Catch-all for API to prevent 404s
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    console.log(`[MOCK] Handling ${url}`);
    
    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { userId: 1, role: 'admin', nickName: 'Admin' }
        })
      });
      return;
    }

    if (url.includes('/system-configs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { cs_qrcode_url: 'http://mock.com/qrcode.png' }
        })
      });
      return;
    }

    // Default 200 for others
    await route.fulfill({ status: 200, body: JSON.stringify({ code: 0 }) });
  });

  // 3. Navigate
  await page.goto('/admin/settings');

  // 4. Wait for network idle to ensure requests finished
  await page.waitForLoadState('networkidle');

  // 5. Assert Page Title using data-testid
  await expect(page.getByTestId('system-config-form')).toBeVisible({ timeout: 10000 });
});

test('Admin Settings Page - Upload Interaction', async ({ page }) => {
  // 1. Mock Login (localStorage)
  await page.addInitScript(() => {
    localStorage.setItem('gepei_token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({ 
      userId: 1, 
      role: 'admin', 
      nickName: 'Admin' 
    }));
  });

  // 2. Mock APIs
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          code: 0,
          data: { userId: 1, role: 'admin', nickName: 'Admin' }
        })
      });
      return;
    }
    if (url.includes('/system-configs')) {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          code: 0,
          data: { cs_qrcode_url: '' } // Empty initially
        })
      });
      return;
    }
    await route.fulfill({ status: 200, body: JSON.stringify({ code: 0 }) });
  });

  // Mock Upload
  await page.route('**/attachments/system', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        data: { url: 'http://mock.com/new-image.png' }
      })
    });
  });

  // 3. Navigate
  await page.goto('/admin/settings');
  await page.waitForLoadState('networkidle');

  // 4. Upload File
  // Note: input[type="file"] is hidden, but setInputFiles handles it if we target the locator properly or use the label/wrapper
  // The wrapper has data-testid="image-uploader-wrapper"
  // The input is inside it.
  const fileInput = page.getByTestId('image-uploader-wrapper').locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-image-content')
  });

  // 5. Assert Preview
  const previewImage = page.locator('img[alt="Preview"]');
  await expect(previewImage).toBeVisible();
  await expect(previewImage).toHaveAttribute('src', 'http://mock.com/new-image.png');
});

test('Admin Settings Page - Save Config', async ({ page }) => {
  // 1. Mock Login
  await page.addInitScript(() => {
    localStorage.setItem('gepei_token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({ userId: 1, role: 'admin', nickName: 'Admin' }));
  });

  // 2. Mock APIs
  let updateCalled = false;
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/me')) {
      await route.fulfill({ status: 200, body: JSON.stringify({ code: 0, data: { userId: 1, role: 'admin', nickName: 'Admin' } }) });
      return;
    }
    
    // Initial Config Load
    if (url.includes('/system-configs') && method === 'GET') {
      await route.fulfill({ status: 200, body: JSON.stringify({ code: 0, data: { cs_qrcode_url: 'http://mock.com/old.png' } }) });
      return;
    }

    // Save Config
    if (url.includes('/admin/system-configs') && method === 'PUT') {
      updateCalled = true;
      const data = route.request().postDataJSON();
      // Expect: { configs: [{ key: 'cs_qrcode_url', value: '...' }] }
      if (data.configs && data.configs[0].key === 'cs_qrcode_url' && data.configs[0].value === 'http://mock.com/new-image.png') {
         await route.fulfill({ status: 200, body: JSON.stringify({ code: 0 }) });
      } else {
         console.log('Invalid payload:', JSON.stringify(data));
         await route.fulfill({ status: 400, body: JSON.stringify({ code: 400, message: 'Invalid Payload' }) });
      }
      return;
    }

    await route.fulfill({ status: 200, body: JSON.stringify({ code: 0 }) });
  });

  // Mock Upload
  await page.route('**/attachments/system', async route => {
    await route.fulfill({ status: 200, body: JSON.stringify({ code: 0, data: { url: 'http://mock.com/new-image.png' } }) });
  });

  // 3. Navigate
  await page.goto('/admin/settings');
  await page.waitForLoadState('networkidle');

  // 4. Change Image
  const fileInput = page.getByTestId('image-uploader-wrapper').locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-image-content')
  });

  // Wait for upload to finish (preview update)
  await expect(page.locator('img[alt="Preview"]')).toHaveAttribute('src', 'http://mock.com/new-image.png');

  // 5. Submit
  await page.getByTestId('submit-config-btn').click();

  // 6. Assert
  await expect(page.getByText('配置已保存')).toBeVisible();
  expect(updateCalled).toBe(true);
});
