// Builds the WhatsApp images from social-template.html and the card images.
// Run from this folder:  node make-social.js
// Outputs:
//   whatsapp-square.png   1080x1080 for chats and groups
//   whatsapp-status.png   1080x1920 for WhatsApp Status / stories
//   card-front.png, card-back.png   the calling card as separate images
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const fileUrl = (f) => 'file://' + path.join(DIR, f);

(async () => {
  const browser = await chromium.launch();
  const tpl = fs.readFileSync(path.join(DIR, 'social-template.html'), 'utf8')
    .replace('src="PHOTO"', 'src="' + fileUrl('../maria.jpg') + '"')
    .replace('src="QR"', 'src="' + fileUrl('qr-portal.png') + '"');
  const tmp = path.join(DIR, '.social.html');

  for (const [layout, w, h] of [['square', 1080, 1080], ['status', 1080, 1920]]) {
    fs.writeFileSync(tmp, tpl.replace('class="LAYOUT"', 'class="' + layout + '"'));
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(DIR, 'whatsapp-' + layout + '.png') });
    await page.close();
  }
  fs.unlinkSync(tmp);

  // Card front/back as images (from the calling card template, no bleed)
  const card = fs.readFileSync(path.join(DIR, 'card-template.html'), 'utf8');
  const mk = require('./make-cards-parts.js');
  fs.writeFileSync(tmp, card.replace('class="MODE"', 'class="preview"').replace('<!--CARDS-->', mk.front() + mk.back()));
  const p = await browser.newPage({ deviceScaleFactor: 4, viewport: { width: 900, height: 400 } });
  await p.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: 'body.preview .card{border-radius:0;box-shadow:none}' });
  const cards = await p.$$('.card');
  await cards[0].screenshot({ path: path.join(DIR, 'card-front.png') });
  await cards[1].screenshot({ path: path.join(DIR, 'card-back.png') });
  fs.unlinkSync(tmp);

  await browser.close();
  console.log('Done: whatsapp-square.png, whatsapp-status.png, card-front.png, card-back.png');
})();
