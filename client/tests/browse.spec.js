import { expect, test } from '@playwright/test';

const reports = Array.from({ length: 13 }, (_, index) => ({
  _id: String(index + 1).padStart(24, '0'),
  title: `Lost phone ${index + 1}`,
  description: 'Synthetic phone report',
  type: 'LOST', category: 'Electronics', status: 'Available', city: 'Colombo', district: 'Colombo',
}));
const target = reports[12];

test.beforeEach(async ({ context, baseURL }) => {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === baseURL && !url.pathname.startsWith('/socket.io/') && !url.pathname.startsWith('/api/')
      ? route.continue() : route.abort();
  });
});

test('next page, Tamil search and lazy map keep the selected report filters', async ({ page }) => {
  const browseRequests = [];
  const mapRequests = [];
  await page.route(/\/api\/items\/browse\?/, (route) => {
    const filters = new URL(route.request().url()).searchParams;
    browseRequests.push(filters);
    const pageNumber = Number(filters.get('page'));
    const isFiltered = filters.has('q');
    return route.fulfill({ json: isFiltered
      ? { items: [target], total: 1, page: 1, totalPages: 1 }
      : { items: pageNumber === 1 ? reports.slice(0, 12) : [target], total: 13, page: pageNumber, totalPages: 2 },
    });
  });
  await page.route(/\/api\/items\/locations\?/, (route) => {
    mapRequests.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: {
      locations: [{ _id: target._id, title: target.title, type: target.type, city: target.city, district: target.district, latitude: 7.9, longitude: 80.8 }],
      truncated: false,
    } });
  });

  await page.goto('/');
  await expect(page.getByRole('article')).toHaveCount(12);
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: target.title, exact: true })).toHaveCount(0);
  expect(mapRequests).toHaveLength(0);

  await page.getByRole('button', { name: 'Next page' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: target.title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeFocused();
  expect(browseRequests.at(-1).get('page')).toBe('2');

  const search = page.getByRole('searchbox');
  await search.fill('தொலைபேசி');
  await search.press('Enter');
  await expect(page.getByText('1 report', { exact: true })).toBeVisible();
  expect(browseRequests.at(-1).get('page')).toBe('1');
  expect(browseRequests.at(-1).get('q')).toBe('தொலைபேசி');

  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('Electronics');
  await page.getByText('Show report locations', { exact: true }).click();
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
  expect(mapRequests.at(-1).get('q')).toBe('தொலைபேசி');
  expect(mapRequests.at(-1).get('category')).toBe('Electronics');
  expect(mapRequests.at(-1).has('page')).toBe(false);
  await page.locator('.leaflet-marker-icon').click();
  await expect(page.locator('.leaflet-popup').getByRole('link', { name: target.title })).toHaveAttribute('href', `/items/${target._id}`);
});

test('a highlighted report opens on its server-selected page and can be left with pagination', async ({ page }) => {
  const requestedHighlights = [];
  await page.route(/\/api\/items\/browse\?/, route => {
    const highlight = new URL(route.request().url()).searchParams.get('highlight');
    requestedHighlights.push(highlight);
    return route.fulfill({ json: { items: highlight ? [target] : reports.slice(0, 12), total: 13, page: highlight ? 2 : 1, totalPages: 2 } });
  });
  await page.goto(`/?highlight=${target._id}`);
  const highlighted = page.getByRole('heading', { name: target.title, exact: true });
  await expect(highlighted).toBeInViewport();
  await expect(page.locator(`#item-${target._id}`)).toHaveClass(/ring-2/);
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  expect(requestedHighlights).toEqual([target._id]);

  await page.getByRole('button', { name: 'Previous page' }).click();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(highlighted).toHaveCount(0);
  expect(requestedHighlights.at(-1)).toBeNull();
});
