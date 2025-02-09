import { NextApiRequest, NextApiResponse } from 'next';
import { chromium } from 'playwright';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, year, target_account } = req.body;

  if (!username || !password || !target_account) {
    return res.status(400).json({ error: 'Required authentication details are missing' });
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const artists = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.last.fm/login');
    await page.fill('input[name="username_or_email"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[name="submit"]');
    await page.waitForURL(`https://www.last.fm/user/${username}`, { timeout: 60000 });

    for (let month_index = 1; month_index <= 12; month_index++) {
      const month = months[month_index - 1];
      const url = `https://www.last.fm/user/${target_account}/library/artists?from=${year}-${String(month_index).padStart(2, '0')}-01&rangetype=1month&page=1`;
      await page.goto(url, { timeout: 60000 });

      try {
        await page.waitForSelector('tbody[data-chart-date-range]', { timeout: 10000 });
        const artist_row = page.locator('tbody[data-chart-date-range] > tr:first-child');
        const artist_name = await artist_row.locator('.chartlist-name a').getAttribute('title');
        const scrobbles: any = await artist_row.locator('.chartlist-bar .chartlist-count-bar-value').innerText();
        const scrobblesQty = scrobbles ? parseInt(scrobbles.split()[0]) : 0;

        const artist_page_path = await artist_row.locator('.chartlist-name a').getAttribute('href');
        let image_url: any = "";

        if (artist_page_path) {
          const artist_page_url = `https://www.last.fm${artist_page_path}`;
          await page.goto(artist_page_url, { timeout: 60000 });
          try {
            await page.waitForSelector('div.header-new-gallery-outer', { timeout: 10000 });
            const first_image_link = await page.locator('div.header-new-gallery-outer a.header-new-gallery').getAttribute('href');
            if (first_image_link) {
              const high_res_image_url = `https://www.last.fm${first_image_link}`;
              await page.goto(high_res_image_url, { timeout: 60000 });
              try {
                await page.waitForSelector('div.gallery-slides', { timeout: 10000 });
                const first_gallery_link = page.locator('div.gallery-slides a.gallery-image').first();
                image_url = await first_gallery_link.locator('img.js-gallery-image').getAttribute('src');
              } catch (e) {
                console.error(`Failed to fetch high-res image for ${artist_name}:`, e);
              }
            }
          } catch (e) {
            console.error(`Failed to fetch artist page for ${artist_name}:`, e);
          }
        }

        if (artist_name) {
          artists.push({
            month,
            name: artist_name,
            imageUrl: image_url || "",
            scrobbles: scrobblesQty,
          });
        }
      } catch (e) {
        console.error(`Failed to fetch data for ${month}:`, e);
        artists.push({
          month,
          name: "",
          imageUrl: "",
          scrobbles: 0,
        });
      }
    }

    res.status(200).json(artists);
  } catch (e) {
    console.error('Failed during login or scraping:', e);
    res.status(500).json({ error: 'Failed to fetch artists' });
  } finally {
    await browser.close();
  }
}