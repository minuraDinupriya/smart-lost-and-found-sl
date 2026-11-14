import { expect, test } from '@playwright/test';

const itemId = '000000000000000000000101';
const ownerId = '000000000000000000000001';
const finderId = '000000000000000000000002';
const demoPassword = 'LearnWithDemo2027!';

async function allowLocalRequests(page) {
  await page.route('**/*', route => {
    const { hostname } = new URL(route.request().url());
    return hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
}

async function signIn(page, username, otherUserId) {
  const chatPath = `/chat/${itemId}/${otherUserId}`;
  await page.goto(chatPath);
  await page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(demoPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(chatPath);
  await expect(page.getByRole('heading', { name: 'Return progress' })).toBeVisible();
}

async function expectKarma(page, points) {
  const account = page.getByRole('button', { name: 'Account and tools' });
  await account.click();
  const menu = page.getByRole('navigation', { name: 'Account and tools' });
  await expect(menu.getByText(`${points} Karma points`, { exact: true })).toBeVisible();
  await menu.getByRole('button', { name: 'Close menu' }).click();
}

test('the finder and owner verify and return an item with one karma award', async ({
  browser, page: finder, baseURL,
}) => {
  const owner = await browser.newPage({ baseURL, serviceWorkers: 'block' });
  try {
    await Promise.all([allowLocalRequests(finder), allowLocalRequests(owner)]);
    await signIn(finder, 'demo_finder', ownerId);
    await expectKarma(finder, 100);

    await finder.getByRole('button', { name: 'Verify item details' }).click();
    const proofDialog = finder.getByRole('dialog', { name: 'Verify ownership' });
    const serialNumber = proofDialog.getByLabel('Serial number');
    const receiptCode = proofDialog.getByLabel('Receipt code');
    await expect(serialNumber).toBeEmpty();
    await expect(receiptCode).toBeEmpty();
    await serialNumber.fill('DEMO-4829');
    await receiptCode.fill('DEMO-RECEIPT-42');
    await proofDialog.getByRole('button', { name: 'Submit Proof' }).click();
    const verification = finder.getByRole('dialog', { name: 'Verification Successful!' });
    await expect(verification.getByText('Match score: 100% (2 of 2 fields matched).')).toBeVisible();
    await verification.getByRole('button', { name: 'OK', exact: true }).click();
    await finder.getByRole('button', { name: 'I found this item' }).click();
    await expect(finder.getByText('Finder confirmed · Waiting for owner', { exact: true })).toBeVisible();

    await signIn(owner, 'demo_owner', finderId);
    await owner.getByRole('button', { name: 'This is my item' }).click();
    await owner.getByRole('button', { name: 'I received my item' }).click();
    const receiptResponse = owner.waitForResponse(response =>
      response.request().method() === 'POST' && response.url().endsWith('/confirm-receipt')
    );
    await owner.getByRole('button', { name: 'Yes, I Received It' }).click();
    const receipt = await receiptResponse;
    const completedReturn = await receipt.json();
    await expect(owner.getByText('Item marked as successfully returned!')).toBeVisible();
    await owner.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(owner.getByText('Item returned', { exact: true })).toBeVisible();
    await finder.reload();
    await expect(finder.getByText('Item returned', { exact: true })).toBeVisible();
    await expectKarma(finder, 150);

    // The UI hides the receipt action on completion. Replay that request to simulate a retry.
    const retry = await owner.request.post(receipt.url(), {
      headers: { Authorization: await receipt.request().headerValue('authorization') },
    });
    expect(retry.ok()).toBe(true);
    expect(await retry.json()).toMatchObject({ _id: completedReturn._id, status: 'RETURN_COMPLETED' });

    await finder.reload();
    await expect(finder.getByRole('heading', { name: 'Return progress' })).toBeVisible();
    await expectKarma(finder, 150);
  } finally {
    await owner.close();
  }
});
