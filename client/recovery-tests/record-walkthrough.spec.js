import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const out = path.resolve('test-results/walkthrough');
const item = '000000000000000000000101';
const ownerId = '000000000000000000000001';
const finderId = '000000000000000000000002';
const recording = { width: 1280, height: 820 };
const title = 'Blue smartphone near Fort station';
const chapters = [];

async function start(page, name) {
  const chapter = { name, captions: [] };
  chapters.push(chapter);
  await page.screencast.start({ path: path.join(out, `${name}.webm`), size: recording });
  const startTime = Date.now();
  await page.screencast.showActions({ duration: 550, style: { title: 'display: none' } });
  return caption => chapter.captions.push({ offset: (Date.now() - startTime) / 1000, caption });
}

async function localOnly(page) {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
    ? route.continue() : route.abort());
}

async function authenticate(page, username, otherUserId, dashboard = false) {
  const chatPath = `/chat/${item}/${otherUserId}`;
  if (dashboard) {
    const report = page.getByRole('article').filter({ hasText: title });
    await report.getByRole('button', { name: /contact/i }).click();
  } else {
    await page.goto(chatPath);
    await page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }).click();
  }
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill('LearnWithDemo2027!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(chatPath);
  await expect(page.getByRole('heading', { name: 'Return progress' })).toBeVisible();
}

async function openKarma(page, points) {
  await page.getByRole('button', { name: 'Account and tools' }).click();
  const menu = page.getByRole('navigation', { name: 'Account and tools' });
  await expect(menu.getByText(`${points} Karma points`, { exact: true })).toBeVisible();
  return menu;
}

test('record the current recovery walkthrough', async ({ browser, baseURL }) => {
  test.setTimeout(150_000);
  await mkdir(out, { recursive: true });
  const settings = { baseURL, viewport: recording, serviceWorkers: 'block', reducedMotion: 'reduce' };
  const finder = await browser.newPage(settings);
  const owner = await browser.newPage(settings);
  finder.setDefaultTimeout(10_000);
  owner.setDefaultTimeout(10_000);
  await Promise.all([localOnly(finder), localOnly(owner)]);

  await finder.goto('/');
  await expect(finder.getByRole('link', { name: title, exact: true })).toBeVisible();
  let caption = await start(finder, '01-finder');
  caption('Sri Lanka Smart Lost & Found · Isolated demo with synthetic reports');
  await finder.waitForTimeout(4000);
  caption('Finder: open a private conversation from a lost phone report.');
  await authenticate(finder, 'demo_finder', ownerId, true);
  await finder.waitForTimeout(4500);

  caption('The finder starts with 100 karma points.');
  const menu = await openKarma(finder, 100);
  await finder.waitForTimeout(4200);
  await menu.getByRole('button', { name: 'Close menu' }).click();

  const openProof = finder.getByRole('button', { name: 'Verify item details' });
  await openProof.click();
  const proof = finder.getByRole('dialog', { name: 'Verify ownership' });
  const serial = proof.getByLabel('Serial number');
  const receiptCode = proof.getByLabel('Receipt code');
  await expect(serial).toBeEmpty();
  await expect(receiptCode).toBeEmpty();
  caption('Verification shows the field labels. Saved proof values stay private.');
  await finder.waitForTimeout(4500);
  await serial.fill('DEMO-4828');
  await receiptCode.fill('DEMO-RECEIPT-41');
  await proof.getByRole('button', { name: 'Submit Proof' }).click();
  const failed = finder.getByRole('dialog', { name: 'Verification Failed' });
  await expect(failed.getByText(/0 of 2 fields matched/)).toBeVisible();
  caption('A one-character difference in each identifier fails verification.');
  await finder.waitForTimeout(4800);
  await failed.getByRole('button', { name: 'OK', exact: true }).click();
  await openProof.click();
  await serial.fill('DEMO-4829');
  await receiptCode.fill('DEMO-RECEIPT-42');
  await proof.getByRole('button', { name: 'Submit Proof' }).click();
  const verified = finder.getByRole('dialog', { name: 'Verification Successful!' });
  await expect(verified.getByText(/2 of 2 fields matched/)).toBeVisible();
  caption('The exact demo serial number and receipt code match.');
  await finder.waitForTimeout(4800);
  await verified.getByRole('button', { name: 'OK', exact: true }).click();
  await finder.getByRole('button', { name: 'I found this item' }).click();
  await expect(finder.getByText('Finder confirmed · Waiting for owner')).toBeVisible();
  caption('The finder confirms the phone was found. The return still needs the owner.');
  await finder.waitForTimeout(5200);
  await finder.screencast.stop();

  await authenticate(owner, 'demo_owner', finderId);
  caption = await start(owner, '02-owner');
  caption('Owner: open the same conversation in a separate browser session.');
  await owner.waitForTimeout(4300);
  await owner.getByRole('button', { name: 'This is my item' }).click();
  await expect(owner.getByRole('button', { name: 'I received my item' })).toBeVisible();
  caption('Both people have confirmed. The owner can now acknowledge receipt.');
  await owner.waitForTimeout(5100);
  await owner.getByRole('button', { name: 'I received my item' }).click();
  caption('The owner confirms the physical handover.');
  await owner.waitForTimeout(3600);
  const response = owner.waitForResponse(response =>
    response.request().method() === 'POST' && response.url().endsWith('/confirm-receipt'));
  await owner.getByRole('button', { name: 'Yes, I Received It' }).click();
  const receipt = await response;
  expect(receipt.ok()).toBe(true);
  const completed = await receipt.json();
  await expect(owner.getByText('Item marked as successfully returned!')).toBeVisible();
  caption('One MongoDB transaction marks the item returned and awards 50 points.');
  await owner.waitForTimeout(7300);
  await owner.screencast.stop();

  await finder.reload();
  await expect(finder.getByText('Item returned', { exact: true })).toBeVisible();
  await openKarma(finder, 150);
  caption = await start(finder, '03-retry');
  caption('Back in the finder session: the score went from 100 to 150.');
  await finder.waitForTimeout(5400);
  const retry = await owner.request.post(receipt.url(), {
    headers: { Authorization: await receipt.request().headerValue('authorization') },
  });
  expect(retry.ok()).toBe(true);
  expect(await retry.json()).toMatchObject({ _id: completed._id, status: 'RETURN_COMPLETED' });
  caption('Replay the same authorized receipt request: no second return or award.');
  await finder.reload();
  await expect(finder.getByText('Item returned', { exact: true })).toBeVisible();
  await openKarma(finder, 150);
  await finder.waitForTimeout(5700);
  caption('150 → 150. Retrying returns the existing result without extra points.');
  await finder.waitForTimeout(5700);
  await finder.screencast.stop();
  await writeFile(path.join(out, 'captions.json'), JSON.stringify(chapters));
  await Promise.all([finder.close(), owner.close()]);
});
