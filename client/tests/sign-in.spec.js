import { expect, test } from '@playwright/test';

const savedUser = { _id: '000000000000000000000001', username: 'saved-reporter' };
const newUser = { _id: '000000000000000000000002', username: 'new-reporter', role: 'user' };
const savedToken = 'synthetic-saved-session';
const newToken = 'synthetic-new-session';

test.beforeEach(async ({ context, baseURL }) => {
  // Keep tests isolated from external services, including Socket.IO and Google sign-in.
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === baseURL && !url.pathname.startsWith('/socket.io/')
      ? route.continue()
      : route.abort();
  });
  await context.route('**/api/**', (route) => route.abort());
  await context.route('**/api/items', (route) => route.fulfill({ json: [] }));
});

async function restoreSavedSession(page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('username', user.username);
      localStorage.setItem('userId', user._id);
    },
    { token: savedToken, user: savedUser }
  );
}

async function holdProfile(page, token, response) {
  const requested = Promise.withResolvers();
  const release = Promise.withResolvers();
  await page.route('**/api/auth/me', async (route) => {
    const request = route.request();
    if ((await request.headerValue('authorization')) !== `Bearer ${token}`) {
      await route.fallback();
      return;
    }
    requested.resolve(request);
    await release.promise;
    await route.fulfill(response);
  });
  return { requested: requested.promise, release: release.resolve };
}

function waitForRequestEnd(page, request) {
  const predicate = (ended) => ended === request;
  return Promise.race([
    page.waitForEvent('requestfinished', { predicate }),
    page.waitForEvent('requestfailed', { predicate }),
  ]);
}

async function mockLogin(page) {
  await page.route('**/api/auth/login', (route) => {
    const { username, password } = route.request().postDataJSON();
    if (username !== newUser.username || password !== 'valid-test-password') {
      return route.fulfill({ status: 400, json: { message: 'Invalid credentials.' } });
    }
    return route.fulfill({
      json: { token: newToken, username, userId: newUser._id, role: newUser.role },
    });
  });
}

test('a late profile response cannot sign a reporter back in after logout', async ({ page }) => {
  await restoreSavedSession(page);
  const profile = await holdProfile(page, savedToken, { json: { user: savedUser } });
  await page.goto('/');
  const requestEnded = waitForRequestEnd(page, await profile.requested);

  await page.getByRole('button', { name: 'Account and tools' }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  profile.release();
  await requestEnded;

  await page.getByRole('link', { name: 'Report lost item' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to report an item' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account and tools' })).toHaveCount(0);
});

test('an expired profile response for the previous session cannot sign out a new login', async ({ page }) => {
  await restoreSavedSession(page);
  await mockLogin(page);
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user: newUser } }));
  const profile = await holdProfile(page, savedToken, {
    status: 401,
    json: { message: 'Session expired.' },
  });
  await page.goto('/login');
  const requestEnded = waitForRequestEnd(page, await profile.requested);

  await page.getByLabel('Username').fill(newUser.username);
  await page.getByLabel('Password', { exact: true }).fill('valid-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
  profile.release();
  await requestEnded;

  await page.getByRole('link', { name: 'Report lost item' }).click();
  await expect(page.getByRole('heading', { name: 'Report an item', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(newToken);
});

test('an expired saved session clears its credentials and shows the report sign-in prompt', async ({ page }) => {
  await restoreSavedSession(page);
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 403, json: {} }));
  await page.goto('/post?type=FOUND');

  await expect(page.getByRole('heading', { name: 'Sign in to report an item' })).toBeVisible();
  const credentials = await page.evaluate(() =>
    ['token', 'username', 'userId'].map((key) => localStorage.getItem(key))
  );
  expect(credentials).toEqual([null, null, null]);
});

test('a temporary profile error preserves a saved session', async ({ page }) => {
  await restoreSavedSession(page);
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto('/post?type=FOUND');

  await expect(page.getByRole('heading', { name: 'Report an item', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(savedToken);
});

test('a mobile reporter can correct sign-in and resume the lost report while the profile loads', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockLogin(page);
  const profile = await holdProfile(page, newToken, { json: { user: newUser } });
  await page.goto('/');
  await page.getByRole('link', { name: 'Report lost item' }).click();
  const main = page.getByRole('main');
  await main.getByRole('link', { name: 'Sign in', exact: true }).click();

  const submit = main.getByRole('button', { name: 'Sign in', exact: true });
  const username = main.getByLabel('Username');
  const password = main.getByLabel('Password', { exact: true });
  await submit.click();
  await expect(username).toBeFocused();
  await expect(username).toHaveAttribute('aria-invalid', 'true');
  await username.fill(newUser.username);
  await password.fill('incorrect-test-password');
  await submit.click();
  await expect(main.getByRole('alert')).toHaveText('Invalid credentials.');

  await password.fill('valid-test-password');
  await submit.click();
  try {
    await profile.requested;
    await expect(page).toHaveURL('/post?type=LOST');
    await expect(main.getByRole('heading', { name: 'Step 2 of 4: Item details' })).toBeVisible();
  } finally {
    profile.release();
  }
});
