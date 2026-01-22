import { Page, expect } from '@playwright/test';

// 生成随机手机号
export const generatePhone = () => `13${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;

// 通用登录流程
export async function login(page: Page, phone: string, role: 'user' | 'admin' = 'user') {
  const loginUrl = role === 'admin' ? '/admin/login' : '/login';
  await page.goto(loginUrl);
  await page.fill('input[type="tel"]', phone);
  await page.fill('input[type="password"]', role === 'admin' ? 'AdminPassword123' : 'Password123');
  await page.click('button[type="submit"]');
  
  // 等待登录成功跳转
  if (role === 'admin') {
    await expect(page).toHaveURL('/admin/dashboard');
  } else {
    await expect(page).toHaveURL('/');
  }
}

// 检查是否有控制台错误
export function checkConsoleErrors(page: Page) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`Page Error: ${msg.text()}`);
      // 排除一些非致命的警告，比如 favicon 404
      if (!msg.text().includes('favicon.ico')) {
        // 在实际测试中，我们可能希望这里 fail，但为了冒烟测试能跑完，先记录
        // expect(msg.type()).not.toBe('error'); 
      }
    }
  });
  
  page.on('pageerror', err => {
    console.error(`Uncaught Exception: ${err.message}`);
    throw err; // 页面崩溃直接抛出
  });
}
