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
const url = (f) => 'file://' + path.join(DIR, f);
const PHOTO = url('../maria.jpg');
const QR = url('qr-portal.png');

const icon = {
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 21 12h-5v9H8v-9H3z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12.04.56C5.77.56.66 5.66.66 11.94c0 2 .52 3.96 1.52 5.69L.56 23.5l6.03-1.58a11.4 11.4 0 0 0 5.45 1.39c6.27 0 11.38-5.1 11.38-11.38S18.31.56 12.04.56zm5.43 13.82c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49 2.48 1.07 2.98.86 3.52.8.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  web: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-6.5-8-13a8 8 0 0 1 16 0c0 6.5-8 13-8 13z"/><circle cx="12" cy="9" r="3"/></svg>'
};

const front = () => `
<div class="card front">
  <div class="blob bl1"></div><div class="blob bl2"></div><div class="blob bl3"></div>
  <span class="spark" style="left:48mm;top:34mm">✦</span><span class="spark" style="left:44mm;top:12mm;font-size:5pt">✦</span>
  <div class="safe">
    <div class="brand">
      <div class="logo">${icon.logo}</div>
      <div><b>Elevate with Ms. Maria</b><small>Learnovate Qatar</small></div>
    </div>
    <div class="who">
      <h1>Ms. Maria</h1>
      <div class="line"></div>
      <p>Course Counsellor &amp; Instructor<span>130+ courses · Healthcare · Teaching · Business · Languages</span></p>
    </div>
    <div class="photo"><img src="${PHOTO}" alt=""></div>
  </div>
</div>`;

const back = () => `
<div class="card back">
  <div class="blob bl4"></div>
  <div class="safe">
    <div class="qrbox">
      <div class="qr"><img src="${QR}" alt=""></div>
      <b>Scan for the Student Portal</b>
      <small>Browse courses &amp; enroll</small>
    </div>
    <div class="info">
      <h2>Let’s elevate your future</h2>
      <p class="tag">Personal course counselling &amp; enrollment</p>
      <div class="row"><div class="ic" style="background:#3ccf7f">${icon.wa}</div><span><small>WhatsApp</small>+974 7077 1337</span></div>
      <div class="row"><div class="ic" style="background:#9b7fd9">${icon.mail}</div><span><small>Email</small>maria@me.learnovateqa.com</span></div>
      <div class="row"><div class="ic" style="background:#4a8bd0">${icon.web}</div><span><small>Our school</small>learnovateqa.com</span></div>
      <div class="row" style="margin-bottom:0"><div class="ic" style="background:#e57fa5">${icon.pin}</div><span><small>Location</small>Doha, Qatar</span></div>
    </div>
  </div>
  <div class="strip"></div>
</div>`;

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
