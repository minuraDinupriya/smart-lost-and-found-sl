import { expect, test } from '@playwright/test';

const finder = { _id: '000000000000000000000002', username: 'test-finder', role: 'user' };
const owner = { _id: '000000000000000000000001', username: 'test-owner', role: 'user' };
const itemId = '000000000000000000000101';

const labels = {
  en: {
    skip: 'Skip to content', details: 'Step 2 of 4: Item details', title: 'Title',
    description: 'Description', date: 'Date', next: 'Next step', location: 'Step 3 of 4: Location',
    province: 'Province', district: 'District', city: 'City', phone: 'Contact Number',
    publish: 'Publish report', openVerification: 'Verify item details', dialog: 'Verify ownership',
    close: 'Close verification',
  },
  si: {
    skip: 'අන්තර්ගතයට යන්න', details: 'පියවර 2 / 4: භාණ්ඩයේ විස්තර', title: 'මාතෘකාව',
    description: 'විස්තරය', date: 'දිනය', next: 'ඊළඟ පියවර', location: 'පියවර 3 / 4: ස්ථානය',
    province: 'පළාත', district: 'දිස්ත්‍රික්කය', city: 'නගරය', phone: 'දුරකථන අංකය',
    publish: 'වාර්තාව පළ කරන්න', openVerification: 'භාණ්ඩයේ විස්තර තහවුරු කරන්න',
    dialog: 'හිමිකම තහවුරු කරන්න', close: 'තහවුරු කිරීම වසන්න',
  },
  ta: {
    skip: 'உள்ளடக்கத்திற்குச் செல்லவும்', details: 'படி 2 / 4: பொருளின் விவரங்கள்', title: 'தலைப்பு',
    description: 'விவரம்', date: 'தேதி', next: 'அடுத்த படி', location: 'படி 3 / 4: இடம்',
    province: 'மாகாணம்', district: 'மாவட்டம்', city: 'நகரம்', phone: 'தொலைபேசி எண்',
    publish: 'பதிவை வெளியிடவும்', openVerification: 'பொருளின் விவரங்களைச் சரிபார்க்கவும்',
    dialog: 'உரிமையைச் சரிபார்க்கவும்', close: 'சரிபார்ப்பை மூடவும்',
  },
};

test.use({ viewport: { width: 320, height: 720 }, colorScheme: 'dark', reducedMotion: 'reduce' });

async function mockSession(page, baseURL, language, user = finder) {
  await page.addInitScript(({ language, user }) => {
    localStorage.setItem('app_language', language);
    localStorage.setItem('token', 'synthetic-session');
    localStorage.setItem('username', user.username);
    localStorage.setItem('userId', user._id);
  }, { language, user });
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === baseURL && !url.pathname.startsWith('/socket.io/')
      ? route.continue()
      : route.abort();
  });
  await page.route('**/api/**', (route) => route.abort());
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user } }));
  await page.route('**/api/messages/unread-count', (route) => route.fulfill({ json: { count: 0 } }));
}

async function mockConversation(page, user = finder) {
  const other = user === owner ? finder : owner;
  await page.route(`**/api/items/${itemId}`, (route) => route.fulfill({ json: {
    _id: itemId,
    createdBy: owner,
    ownershipProofs: [
      { _id: 'serial', proofType: 'serialNumber' },
      { _id: 'receipt', proofType: 'custom', customLabel: 'Receipt code' },
    ],
  } }));
  await page.route(`**/api/messages/${itemId}/${other._id}`, (route) => route.fulfill({ json: [] }));
  await page.route(`**/api/handovers/${itemId}/${other._id}`, (route) => route.fulfill({ json: {
    isOwner: user === owner,
    isFinder: user === finder,
    record: user === owner ? { status: 'OWNER_FINDER_VERIFIED' } : null,
  } }));
  await page.goto(`/chat/${itemId}/${other._id}`);
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
}

for (const [language, names] of Object.entries(labels)) {
  test(`the ${language} report wizard shows errors and moves keyboard focus at 320 px`, async ({ page, baseURL }) => {
    await mockSession(page, baseURL, language);
    await page.goto('/post?type=FOUND');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: names.details, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: names.skip })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(main).toBeFocused();

    const next = main.getByRole('button', { name: names.next });
    const title = main.getByLabel(names.title, { exact: true });
    await next.press('Enter');
    await expect(main.getByRole('alert')).toBeVisible();
    await expect(title).toBeFocused();
    await title.fill('Synthetic wallet');
    await main.getByLabel(names.description, { exact: true }).fill('A test-only blue wallet.');
    await main.getByLabel(names.date, { exact: true }).fill('2026-01-02');
    await next.press('Enter');
    await expect(main.getByRole('heading', { name: names.location })).toBeFocused();
    await expectNoHorizontalOverflow(page);

    const province = main.getByLabel(names.province, { exact: true });
    const district = main.getByLabel(names.district, { exact: true });
    const city = main.getByLabel(names.city, { exact: true });
    await next.press('Enter');
    await expect(main.getByRole('alert')).toBeVisible();
    await expect(province).toBeFocused();
    await province.selectOption('Western');
    await district.selectOption('Colombo');
    await city.selectOption('Colombo 1');
    await next.press('Enter');
    await expect(main.getByRole('alert')).toHaveCount(0);
    await main.getByRole('button', { name: names.publish }).press('Enter');
    await expect(main.getByLabel(names.phone, { exact: true })).toBeFocused();
    await expect(main.getByRole('alert')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test(`the ${language} proof dialog moves focus inside and restores the trigger on Escape`, async ({ page, baseURL }) => {
    await mockSession(page, baseURL, language);
    await mockConversation(page);
    const trigger = page.getByRole('button', { name: names.openVerification });
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: names.dialog });
    await expect(dialog).toHaveAccessibleDescription(/\S/u);
    const serial = dialog.getByLabel('Serial number');
    await expect(serial).toBeFocused();
    await expect(serial).toBeEmpty();
    await page.keyboard.press('Tab');
    await expect(dialog.getByLabel('Receipt code')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(serial).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: names.close })).toBeFocused();
    expect(await dialog.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(288);
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test('changing the language updates the page language and labels without reloading', async ({ page, baseURL }) => {
  await mockSession(page, baseURL, 'en');
  await page.goto('/post?type=FOUND');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('ta');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ta');
  await expect(page.getByRole('link', { name: labels.ta.skip })).toBeAttached();
  await expect(page.getByRole('heading', { name: labels.ta.details })).toBeVisible();
});

test('the receipt dialog defaults to Cancel and returns focus without confirming', async ({ page, baseURL }) => {
  await mockSession(page, baseURL, 'en', owner);
  await mockConversation(page, owner);
  const trigger = page.getByRole('button', { name: 'I received my item' });
  let confirmations = 0;
  await page.route('**/confirm-receipt', (route) => {
    confirmations += 1;
    return route.abort();
  });
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Confirm Item Received' });
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(confirmations).toBe(0);
});
