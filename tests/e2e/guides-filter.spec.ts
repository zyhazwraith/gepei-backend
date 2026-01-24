import { test, expect } from '@playwright/test';

test.describe('Guides List Filtering', () => {
  test('should filter by city AND keyword combined', async ({ page }) => {
    // 1. Mock API response or use real backend (assuming integration env)
    // We'll just listen for the request to verify the query params are correct.
    
    // Go to guides page
    await page.goto('/guides');

    // Setup request listener for combined filter
    const filterRequestPromise = page.waitForRequest(req => {
      const url = new URL(req.url());
      const hasCity = url.searchParams.get('city') === '上海';
      const hasKeyword = url.searchParams.get('keyword') === '老街';
      return url.pathname.includes('/api/v1/guides') && hasCity && hasKeyword;
    });

    // 2. Select City: Shanghai
    // Click trigger to open dialog
    await page.click('[data-testid="city-selector-trigger"]');
    
    // Wait for dialog content
    await page.waitForSelector('[data-testid="city-selector-dialog"]');
    
    // Click "上海" button (assuming it's in the hot cities list or search results)
    // We use a flexible locator that looks for a button with exact text "上海" inside the dialog
    await page.click('role=dialog >> button:has-text("上海")');

    // 3. Search Keyword: "老街"
    await page.fill('[data-testid="search-input"]', '老街');
    await page.press('[data-testid="search-input"]', 'Enter');

    // 4. Verify Request
    // This will throw if the request is not made within timeout
    const request = await filterRequestPromise;
    expect(request).toBeTruthy();
    
    console.log('✅ Combined filter request (City: Shanghai, Keyword: 老街) verified successfully');
  });
});
