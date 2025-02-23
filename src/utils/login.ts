import { Page } from 'playwright';

export async function login(page: Page, username: string, password: string) {
  await page.goto('https://www.last.fm/login');
  await page.fill('input[name="username_or_email"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[name="submit"]');
  await page.waitForURL(`https://www.last.fm/user/${username}`, { timeout: 60000 });
}
