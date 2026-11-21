// Shared calling card markup (front and back), used by make-cards.js and make-social.js.
const path = require('path');
const url = (f) => 'file://' + path.join(__dirname, f);
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
      <p>Course Counsellor &amp; Instructor<span>130+ courses · Healthcare · Teaching · Business · Languages</span><span class="career">CV · Recommendation letter · Mock interview</span></p>
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

module.exports = { front, back };
