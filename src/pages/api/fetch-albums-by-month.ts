import { NextApiRequest, NextApiResponse } from 'next';
import { chromium } from 'playwright';
import { login } from '@/utils/login';
import { supabaseService } from '@/services/supabaseService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, year, target_account, months } = req.body;

  if (!username || !password || !target_account) {
    return res.status(400).json({ error: 'Required authentication details are missing' });
  }

  try {
    const storedData = await supabaseService.getYearlyData(
      target_account,
      Number(year),
      'albums'
    );

    if (storedData && !months) {
      return res.status(200).json(storedData);
    }

    if (storedData && months) {
      const incompleteMonths = months.filter((month: string) => {
        const monthData = storedData.find(data => data.month === month);
        return !monthData || !monthData.name || !monthData.artist || monthData.scrobbles === 0 || !monthData.imageUrl;
      });

      if (incompleteMonths.length === 0) {
        return res.status(200).json(storedData);
      }
    }

    const allMonths = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthsToFetch = months || allMonths;
    const albums = [];

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await login(page, username, password);

      for (const month of monthsToFetch) {
        const month_index = allMonths.indexOf(month) + 1;
        if (month_index === 0) continue;
        const url = `https://www.last.fm/user/${target_account}/library/albums?from=${year}-${String(month_index).padStart(2, '0')}-01&rangetype=1month&page=1`;
        await page.goto(url, { timeout: 60000 });

        try {
          await page.waitForSelector('tbody[data-chart-date-range]', { timeout: 10000 });
          const album_row = page.locator('tbody[data-chart-date-range] > tr:first-child');
          const album_name = await album_row.locator('.chartlist-name a').getAttribute('title');
          const artist_name = await album_row.locator('.chartlist-artist a').getAttribute('title');
          const scrobbles: any = await album_row.locator('.chartlist-bar .chartlist-count-bar-value').innerText();
          const scrobblesQty = scrobbles ? parseInt(scrobbles.split()[0]) : 0;

          const album_link = await album_row.locator('.chartlist-name a').getAttribute('href');
          const full_album_url = `https://www.last.fm${album_link}`;
          let image_url: any = "";

          if (album_link) {
            await page.goto(full_album_url);
            try {
              const cover_art_link = await page.locator('a.cover-art').getAttribute('href');
              if (cover_art_link) {
                const cover_art_url = `https://www.last.fm${cover_art_link}`;
                await page.goto(cover_art_url);
                await page.waitForTimeout(1000);
                image_url = await page.locator('meta[property="og:image"]').getAttribute('content');
              }
            } catch (e) {
              console.error(`Failed to fetch high-res image for ${month}:`, e);
            }
          }

          if (album_name) {
            albums.push({
              month,
              name: album_name,
              artist: artist_name || "",
              imageUrl: image_url || "",
              scrobbles: scrobblesQty,
            });
          }
        } catch (e) {
          console.error(`Failed to fetch data for ${month}:`, e);
          albums.push({
            month,
            name: "",
            artist: "",
            imageUrl: "",
            scrobbles: 0,
          });
        }
      }

      await supabaseService.storeYearlyData(
        target_account,
        Number(year),
        'albums',
        albums
      );

      res.status(200).json(albums);
    } catch (e) {
      console.error('Failed during login or scraping:', e);
      res.status(500).json({ error: 'Failed to fetch albums' });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error in fetch-albums-by-month:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}