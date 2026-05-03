import type { Browser } from 'playwright-core';
import { chromium as playwrightChromium } from 'playwright-core';
import sparticuzChromium from '@sparticuz/chromium';

export async function launchChromiumForScraping(): Promise<Browser> {
  if (process.env.VERCEL === '1') {
    return playwrightChromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
      headless: true,
    });
  }

  return playwrightChromium.launch({ headless: true });
}
