import fs from 'fs';
import path from 'path';
import type { Browser } from 'playwright-core';
import { chromium as playwrightChromium } from 'playwright-core';
import sparticuzChromium from '@sparticuz/chromium';

function resolveSparticuzPackRoot(): string | undefined {
  const vendored = path.join(process.cwd(), 'vendor', 'sparticuz-chromium');
  if (fs.existsSync(path.join(vendored, 'bin', 'chromium.br'))) {
    return vendored;
  }
  const fromNodeModules = path.join(process.cwd(), 'node_modules', '@sparticuz', 'chromium');
  if (fs.existsSync(path.join(fromNodeModules, 'bin', 'chromium.br'))) {
    return fromNodeModules;
  }
  return undefined;
}

export async function launchChromiumForScraping(): Promise<Browser> {
  if (process.env.VERCEL === '1') {
    const packRoot = resolveSparticuzPackRoot();
    if (!packRoot) {
      throw new Error(
        'Sparticuz Chromium pack not found (expected vendor/sparticuz-chromium from postinstall, or node_modules copy with bin/chromium.br).'
      );
    }
    return playwrightChromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(packRoot),
      headless: true,
    });
  }

  return playwrightChromium.launch({ headless: true });
}
