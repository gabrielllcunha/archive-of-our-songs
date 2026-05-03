'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', '@sparticuz', 'chromium');
const dest = path.join(root, 'vendor', 'sparticuz-chromium');

if (!fs.existsSync(src)) {
  console.warn('[vendor-sparticuz] skip: not installed at', src);
  process.exit(0);
}

const marker = path.join(src, 'bin', 'chromium.br');
if (!fs.existsSync(marker)) {
  console.warn('[vendor-sparticuz] skip: missing', marker);
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.cpSync(src, dest, { recursive: true });
console.log('[vendor-sparticuz] copied to', dest);
