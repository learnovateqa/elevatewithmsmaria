// Builds the calling card files from card-template.html.
// Run from this folder:  node make-cards.js
// Outputs:
//   calling-card-print.pdf     2 pages (front, back), 85x55 mm + 3 mm bleed, for a print shop
//   calling-card-A4-sheet.pdf  2 A4 pages, 10 cards each with crop marks, for home/office printing
//   calling-card-preview.png   front and back side by side
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;

const { front, back } = require('./make-cards-parts.js');

function sheet(cardFn, label) {
  const L = 20, T = 11, W = 85, H = 55, cols = 2, rows = 5;
  let marks = '';
  for (let c = 0; c <= cols; c++) {
    const x = L + c * W;
    marks += `<div class="mark" style="left:${x - 0.1}mm;top:3mm;width:.2mm;height:6mm"></div>`;
    marks += `<div class="mark" style="left:${x - 0.1}mm;top:${T + rows * H + 2}mm;width:.2mm;height:6mm"></div>`;
  }
  for (let r = 0; r <= rows; r++) {
    const y = T + r * H;
    marks += `<div class="mark" style="top:${y - 0.1}mm;left:11mm;height:.2mm;width:7mm"></div>`;
    marks += `<div class="mark" style="top:${y - 0.1}mm;left:${L + cols * W + 2}mm;height:.2mm;width:7mm"></div>`;
  }
  return `<div class="sheet-page"><div class="grid">${Array(cols * rows).fill(0).map(cardFn).join('')}</div>${marks}
    <div class="sheet-note">${label} · Elevate with Ms. Maria calling cards · cut along the marks (85 × 55 mm)</div></div>`;
}

(async () => {
  const tpl = fs.readFileSync(path.join(DIR, 'card-template.html'), 'utf8');
  const build = (mode, body) => tpl.replace('class="MODE"', 'class="' + mode + '"').replace('<!--CARDS-->', body);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const tmp = path.join(DIR, '.render.html');
  async function load(html) {
    fs.writeFileSync(tmp, html);
    await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const ok = await page.evaluate(() => document.fonts.check('600 10px Poppins'));
    if (!ok) console.warn('WARNING: Poppins font did not load');
  }

  await load(build('print', front() + back()));
  await page.pdf({ path: path.join(DIR, 'calling-card-print.pdf'), width: '91mm', height: '61mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

  await load(build('sheet', sheet(front, 'Page 1 – FRONT') + sheet(back, 'Page 2 – BACK (print double-sided, flip on long edge)')));
  await page.pdf({ path: path.join(DIR, 'calling-card-A4-sheet.pdf'), format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

  await page.setViewportSize({ width: 820, height: 280 });
  await load(build('preview', front() + back()));
  const pv = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 760, height: 260 } });
  await pv.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await pv.evaluate(() => document.fonts.ready);
  const box = await pv.evaluate(() => { const r = document.body.getBoundingClientRect(); const c = [...document.querySelectorAll('.card')].map(e => e.getBoundingClientRect()); return { w: Math.ceil(c[1].right + 30), h: Math.ceil(Math.max(c[0].bottom, c[1].bottom) + 30) }; });
  await pv.screenshot({ path: path.join(DIR, 'calling-card-preview.png'), clip: { x: 0, y: 0, width: box.w, height: box.h } });

  fs.unlinkSync(tmp);
  await browser.close();
  console.log('Done: calling-card-print.pdf, calling-card-A4-sheet.pdf, calling-card-preview.png');
})();
