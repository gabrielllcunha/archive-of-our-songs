import type { Browser } from 'playwright-core';
import { chromium as playwrightChromium } from 'playwright-core';
import sparticuzChromium from '@sparticuz/chromium';

const SPARTICUZ_RELEASE_TAG = 'v137.0.0';

function chromiumPackTarUrl(): string {
  if (process.env.SPARTICUZ_CHROMIUM_PACK_URL) {
    return process.env.SPARTICUZ_CHROMIUM_PACK_URL;
  }
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  return `https://github.com/Sparticuz/chromium/releases/download/${SPARTICUZ_RELEASE_TAG}/chromium-${SPARTICUZ_RELEASE_TAG}-pack.${arch}.tar`;
}

export async function launchChromiumForScraping(): Promise<Browser> {
  if (process.env.VERCEL === '1') {
    const executablePath = await sparticuzChromium.executablePath(chromiumPackTarUrl());
    return playwrightChromium.launch({
      args: sparticuzChromium.args,
      executablePath,
      headless: true,
    });
  }

  return playwrightChromium.launch({ headless: true });
}
