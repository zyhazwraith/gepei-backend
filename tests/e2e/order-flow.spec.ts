import { test, expect } from '@playwright/test';
import { generatePhone, checkConsoleErrors } from '../utils/e2e-helpers';
import { createTestUserViaApi } from '../utils/api-helpers';

test.describe('Order Flow (Custom & Normal)', () => {
  let userPhone: string;
  const password = 'Password123';

  test.beforeEach(async ({ page, request }) => {
    checkConsoleErrors(page);

    // Mock WebService API (JSONP)
    await page.route(/.*apis\.map\.qq\.com\/ws\/.*/, async (route) => {
      const url = route.request().url();
      const callbackParam = new URL(url).searchParams.get('callback');
      const callbackName = callbackParam || 'callback';

      let body = {};
      if (url.includes('/search')) {
        // Mock Search Response
        const keyword = new URL(url).searchParams.get('keyword');
        body = {
          status: 0,
          data: [{
            title: keyword || 'Mock POI',
            address: 'Mock Address',
            location: { lat: 39.9, lng: 116.4 },
            ad_info: { city: 'Beijing' }
          }]
        };
      } else if (url.includes('/ip')) {
        // Mock IP Location
        body = {
            status: 0,
            result: {
                location: { lat: 39.9, lng: 116.4 },
                ad_info: { city: 'Beijing' }
            }
        };
      } else if (url.includes('/geocoder')) {
        // Mock Geocoder Response
        body = {
          status: 0,
          result: {
            address: 'Mock Geo Address',
            address_component: {
              city: 'Beijing',
              district: 'Dongcheng'
            }
          }
        };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `${callbackName}(${JSON.stringify(body)})`
      });
    });

    // Mock Map SDK (GL)
    await page.route('https://map.qq.com/api/gljs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.TMap = {
            Map: function() { 
                this.setCenter = () => {}; 
                this.destroy = () => {}; // Mock destroy
                this.resize = () => {}; // Mock resize
                this.on = (evt, cb) => {
                    this._clickCb = cb;
                };
            },
            LatLng: function(lat, lng) { 
              this.lat = lat; this.lng = lng; 
            },
            MultiMarker: function() { 
                this.setGeometries = () => {}; 
            }
          };
          if (window.initQQMap) window.initQQMap();
        `
      });
    });

    // 1. Create User via API (Skip UI Registration)
    userPhone = generatePhone();
    await createTestUserViaApi(request, userPhone, password);
  });

  test('should create a CUSTOM order via full flow', async ({ page }) => {
    // 2. Login (UI Login is fast enough and tests the login flow)
    await page.goto('/login');
    await page.fill('input[type="tel"]', userPhone);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/');

    // 3. Go to Create Page
    await page.goto('/orders/create');

    // 4. Fill Form
    // Note: City input is removed, derived from LocationPicker
    // await page.fill('input[placeholder="例如：北京、上海"]', 'Beijing'); 
    
    // Map Interaction (Tiananmen is in Beijing)
    await page.click('input[placeholder="请选择服务地点"]');
    await page.fill('input[placeholder="搜索地点..."]', 'Tiananmen');
    await page.click('button:has-text("搜索")');
    // Mock POI result to include city
    // We updated api-helpers to return generic POI, we need to ensure test reflects city capture if needed
    // For now, let's assume the mock SDK returns city in ad_info or we just skip city check in form fill
    await page.locator('text=Tiananmen').first().click();
    await page.click('button:has-text("确认选择")');

    // Fill other fields
    await page.fill('input[placeholder="请输入您的预算"]', '1000');
    await page.fill('textarea[placeholder*="想去故宫"]', 'Visit Great Wall');

    // 5. Submit
    await page.click('button:has-text("发布需求")');

    // 6. Verify Redirect & Content
    await page.waitForURL(/\/orders\/\d+/);
    await expect(page.locator('text=Beijing')).toBeVisible();
    await expect(page.locator('text=Visit Great Wall')).toBeVisible();
  });

  test('should create a NORMAL order via mocked flow', async ({ page }) => {
    // Mock Guide Data
    await page.route('**/api/v1/guides/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            guideId: 9999,
            userId: 999,
            nickName: 'Mock Guide Alice',
            hourlyPrice: 200,
            photos: [],
            city: 'Mock City',
            avatarUrl: 'https://example.com/avatar.png'
          }
        })
      });
    });

    // Mock Order Submission (to bypass "Guide Not Found" error from real backend)
    await page.route(/.*\/api\/v1\/orders/, async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              orderId: 7777,
              amount: 800
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Login first
    await page.goto('/login');
    await page.fill('input[type="tel"]', userPhone);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/');

    // Go to Normal Order Page (with fake guide ID)
    await page.goto('/orders/create?guide_id=9999');

    // Verify Guide Info is shown (Frontend Logic)
    await expect(page.locator('text=Mock Guide Alice')).toBeVisible();
    await expect(page.locator('text=¥200/小时')).toBeVisible();

    // Fill Form
    await page.fill('input[type="number"]', '4'); // 4 hours
    
    // Map Interaction
    await page.click('input[placeholder="请选择服务地点"]');
    await page.fill('input[placeholder="搜索地点..."]', 'Bund');
    await page.click('button:has-text("搜索")');
    await page.locator('text=Bund').first().click();
    await page.click('button:has-text("确认选择")');

    // Submit
    await page.click('button:has-text("提交订单")');

    // Verify Redirect (to mocked order ID)
    await page.waitForURL(/\/orders\/7777/);
  });
});
