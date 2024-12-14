import { chromium } from 'playwright';
// import dotenv from 'dotenv';

// dotenv.config();

const ACCOUNT_LOGIN = process.env.ACCOUNT_LOGIN || '';
const ACCOUNT_PASSWORD = process.env.ACCOUNT_PASSWORD || '';
const TARGET_ACCOUNT_USER = process.env.TARGET_ACCOUNT_USER || '';

async function login(page: any) {
  await page.goto('https://www.last.fm/login');
  await page.fill('input[name="username_or_email"]', ACCOUNT_LOGIN);
  await page.fill('input[name="password"]', ACCOUNT_PASSWORD);
  await page.click('button[name="submit"]');
  await page.waitForURL(`https://www.last.fm/user/${ACCOUNT_LOGIN}`, { timeout: 30000 });
}

export async function fetchYearAlbums(year: number) {
  const baseUrl = "https://www.last.fm/user/{}/library/albums?from={}-{:02d}-01&rangetype=1month&page=1";
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const albums = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await login(page);

    for (let monthIndex = 0; monthIndex < months.length; monthIndex++) {
      const url = baseUrl
        .replace("{}", TARGET_ACCOUNT_USER)
        .replace("{}", year.toString())
        .replace("{:02d}", (monthIndex + 1).toString().padStart(2, '0'));

      await page.goto(url);
      await page.waitForSelector('tbody[data-chart-date-range]', { timeout: 10000 });

      const albumRow = page.locator('tbody[data-chart-date-range] > tr:first-child');
      const albumName = await albumRow.locator('.chartlist-name a').getAttribute('title');
      const artistName = await albumRow.locator('.chartlist-artist a').getAttribute('title');
      const scrobbles = await albumRow.locator('.chartlist-bar .chartlist-count-bar-value').innerText();
      const imageUrl = await albumRow.locator('.chartlist-image img').getAttribute('src');

      if (albumName) {
        albums.push({
          month: months[monthIndex],
          albumName: albumName || '',
          artist: artistName || '',
          imageUrl: imageUrl || '',
          scrobbles: scrobbles || '0',
        });
      }
    }
  } catch (error) {
    console.error('Error fetching albums:', error);
  } finally {
    await browser.close();
  }

  return albums;
}
