import type { BrowserContext, Page } from 'playwright-core';
import { login } from '@/utils/login';
import { launchChromiumForScraping } from '@/utils/server/launchChromiumForScraping';
import {
  clearScraperStorageState,
  getScraperStorageState,
  saveScraperStorageState,
} from '@/utils/server/lastfmScraperSessionStore';

async function isLastfmSessionValid(page: Page): Promise<boolean> {
  try {
    await page.goto('https://www.last.fm/settings', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
    return !page.url().includes('/login');
  } catch {
    return false;
  }
}

async function ensureLastfmLoggedIn(
  page: Page,
  context: BrowserContext,
  accountUsername: string,
  password: string
): Promise<void> {
  if (await isLastfmSessionValid(page)) {
    return;
  }

  await clearScraperStorageState(accountUsername);
  await login(page, accountUsername, password);
  await saveScraperStorageState(accountUsername, await context.storageState());
}

export async function withLastfmScraperPage<T>(
  accountUsername: string,
  password: string,
  scrape: (page: Page) => Promise<T>
): Promise<T> {
  const browser = await launchChromiumForScraping();
  let context: BrowserContext | null = null;

  try {
    const storedState = await getScraperStorageState(accountUsername);
    context = await browser.newContext(storedState ? { storageState: storedState } : {});
    const page = await context.newPage();

    await ensureLastfmLoggedIn(page, context, accountUsername, password);

    const result = await scrape(page);
    await saveScraperStorageState(accountUsername, await context.storageState());
    return result;
  } finally {
    await context?.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}
