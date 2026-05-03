import type { Browser } from 'playwright-core';
import { chromium as playwrightChromium } from 'playwright-core';

export async function launchChromiumForScraping(): Promise<Browser> {
  if (process.env.VERCEL === '1') {
    const sparticuz = (await import('@sparticuz/chromium')).default;

    return playwrightChromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
    });
  }

  return playwrightChromium.launch({ headless: true });
}
