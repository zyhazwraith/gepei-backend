import { test, expect } from '@playwright/test';

test.describe('Admin Login Interaction', () => {
  test('should send login request when clicking login button', async ({ page }) => {
    // 1. 监听网络请求
    const loginRequestPromise = page.waitForRequest(request => 
      request.url().includes('/api/v1/auth/login') && request.method() === 'POST'
    );

    // 2. 访问登录页
    await page.goto('/admin/login');

    // 3. 填写表单
    await page.fill('input[type="tel"]', '19999999999');
    await page.fill('input[type="password"]', 'AdminPassword123');

    // 4. 点击登录按钮
    console.log('Clicking login button...');
    await page.click('button[type="submit"]');

    // 5. 验证是否发起了请求
    // 如果没有发起请求，这里会超时报错，从而复现问题
    const request = await loginRequestPromise;
    
    // 6. 验证请求参数
    const postData = request.postDataJSON();
    expect(postData.phone).toBe('19999999999');
    expect(postData.password).toBe('AdminPassword123');

    console.log('✅ Login request was sent successfully!');
  });
});
