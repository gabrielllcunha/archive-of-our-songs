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
  const songs = [];

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
      const url = `https://www.last.fm/user/${target_account}/library/tracks?from=${year}-${String(month_index).padStart(2, '0')}-01&rangetype=1month&page=1`;
      await page.goto(url, { timeout: 60000 });

      try {
        await page.waitForSelector('tbody[data-chart-date-range]', { timeout: 10000 });
        const song_row = page.locator('tbody[data-chart-date-range] > tr:first-child');
        const song_name = await song_row.locator('.chartlist-name a').getAttribute('title');
        const artist_name = await song_row.locator('.chartlist-artist a').getAttribute('title');
        const scrobbles: any = await song_row.locator('.chartlist-bar .chartlist-count-bar-value').innerText();
        const scrobblesQty = scrobbles ? parseInt(scrobbles.split()[0]) : 0;

        const song_link = await song_row.locator('.chartlist-name a').getAttribute('href');
        const full_song_url = `https://www.last.fm${song_link}`;
        let image_url: any = "";

        if (song_link) {
          await page.goto(full_song_url, { timeout: 60000 });
          try {
            await page.waitForSelector('h4.source-album-name > a.link-block-target[itemprop="url"]', { timeout: 100000 });
            const album_link = await page.locator('h4.source-album-name > a.link-block-target[itemprop="url"]').first().getAttribute('href');
            if (album_link) {
              const full_album_url = `https://www.last.fm${album_link}`;
              await page.goto(full_album_url, { timeout: 60000 });
              try {
                await page.waitForSelector('a.cover-art', { timeout: 10000 });
                const cover_art_link = await page.locator('a.cover-art').getAttribute('href');
                if (cover_art_link) {
                  const cover_art_url = `https://www.last.fm${cover_art_link}`;
                  await page.goto(cover_art_url);
                  await page.waitForTimeout(1000);
                  image_url = await page.locator('meta[property="og:image"]').getAttribute('content');
                }
              } catch (e) {
                console.error(`Failed to fetch album page for ${song_name}:`, e);
              }
            } else {
              console.error('Album link not found.');
            }
          } catch (e) {
            console.error(`Failed to fetch song page for ${song_name}:`, e);
          }
        } else {
          console.error('Song link not found.');
        }

        if (song_name) {
          songs.push({
            month,
            name: song_name,
            artist: artist_name,
            imageUrl: image_url || "",
            scrobbles: scrobblesQty,
          });
        }
      } catch (e) {
        console.error(`Failed to fetch data for ${month}:`, e);
        songs.push({
          month,
          name: "",
          artist: "",
          imageUrl: "",
          scrobbles: 0,
        });
      }
    }

    res.status(200).json(songs);
  } catch (e) {
    console.error('Failed during login or scraping:', e);
    res.status(500).json({ error: 'Failed to fetch songs' });
  } finally {
    await browser.close();
  }
}