import { expect, test } from '@playwright/test';

test('a direct link loads the analytics dashboard', async ({ page }) => {
  await page.route('**/api/items/analytics', route => route.fulfill({
    json: {
      totalItems: 3,
      totalRecovered: 1,
      totalLost: 2,
      totalFound: 1,
      itemsByCategory: [],
      itemsByProvince: [],
      timelineData: [],
    },
  }));

  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'National Analytics Dashboard' })).toBeVisible();
});

test('a direct link loads the dashboard for a signed-in admin', async ({ page }) => {
  const user = { _id: '000000000000000000000001', username: 'demo-admin', role: 'admin' };
  await page.addInitScript(account => {
    localStorage.setItem('token', 'synthetic-admin-session');
    localStorage.setItem('username', account.username);
    localStorage.setItem('userId', account._id);
  }, user);
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user } }));
  await page.route('**/api/admin/stats', route => route.fulfill({
    json: {
      stats: {
        totalItems: 0, activeItems: 0, claimedItems: 0, lostItems: 0, foundItems: 0,
        smartTags: 0, totalUsers: 1, policeUsers: 0, adminUsers: 1, regularUsers: 0,
      },
    },
  }));

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'System Administration' })).toBeVisible();
});
