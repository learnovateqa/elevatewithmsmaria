/**
 * Elevate with Ms. Maria · Learner database and private dashboard
 * ----------------------------------------------------------------
 * Paste this file into the "Elevate Learners" Google Sheet:
 *   Extensions > Apps Script > Code.gs
 * and add an HTML file named "Dashboard" with the contents of Dashboard.html.
 * Full step-by-step instructions are in SETUP.md.
 *
 * What it does
 *  - doPost: receives inquiries and quiz results from the student portal
 *    and saves them to the sheet (no login needed, so students can submit).
 *  - doGet:  shows the private dashboard, but only to the owner of this sheet.
 *  - The dashboard functions (getDashboardData, addLearner, updateRecord,
 *    updateLearner, logContact) also check that the owner is signed in.
 */

var SETTINGS = {
  // Email you every time a new inquiry arrives from the portal.
  NOTIFY_NEW_INQUIRIES: true
};

var TAB = {
  ENROLLMENTS: 'Enrollments',
  LOG: 'Contact log',
  QUIZ: 'Quiz results',
  LISTS: 'Lists'
};

// Column order of the Enrollments tab (A..X). Column Y "Last contacted" is a formula.
var ENR_COLS = ['id', 'learnerId', 'date', 'name', 'phone', 'email', 'course', 'category', 'fee',
  'pay', 'mode', 'start', 'time', 'source', 'sourceDetail', 'counsellor', 'status', 'followUp',
  'enrolledDate', 'notes', 'message', 'via', 'updated', 'consent'];
var ENR_READ = ENR_COLS.concat(['lastContact']);
var LOG_COLS = ['date', 'id', 'learnerId', 'name', 'recordId', 'course', 'type', 'note',
  'statusAfter', 'nextFollowUp', 'by'];
var QUIZ_COLS = ['date', 'interest', 'goal', 'cert', 'budget', 'suggested'];
var DATE_FIELDS = { date: 1, followUp: 1, enrolledDate: 1, updated: 1, lastContact: 1, nextFollowUp: 1 };
var CLOSED = { 'Enrolled': 1, 'Not interested': 1 };

/* =====================================================================
   Public endpoint for the student portal
   ===================================================================== */

function doPost(e) {
  var out = { ok: false };
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.website) return json_({ ok: true });           // spam trap field, filled only by bots
    if (body.type === 'quiz') {
      saveQuiz_(body);
      out = { ok: true };
    } else {
      out = saveInquiry_(body);
    }
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return json_(out);
}

function saveInquiry_(b) {
  var name = clean_(b.name, 120), phone = clean_(b.phone, 40), course = clean_(b.course, 200);
  if (!name || !phone || !course) throw new Error('Name, phone and course are required.');
  if (!b.consent) throw new Error('Consent is required.');
  var lists = lists_();
  var source = lists.sources.indexOf(b.source) > -1 ? b.source : 'Direct';
  var result = addRecord_({
    name: name, phone: phone, email: clean_(b.email, 120), course: course,
    category: clean_(b.category, 80), fee: clean_(b.fee, 80), pay: clean_(b.pay, 40),
    mode: clean_(b.mode, 40), start: clean_(b.start, 60), time: clean_(b.time, 40),
    source: source, sourceDetail: clean_(b.sourceDetail, 120), message: clean_(b.message, 1500),
    via: b.via === 'email' ? 'Portal (email)' : 'Portal (WhatsApp)', consent: 'Yes'
  }, { fromPortal: true });
  if (SETTINGS.NOTIFY_NEW_INQUIRIES) notify_(result, name, phone, course, source);
  return result;
}

function saveQuiz_(b) {
  var sh = sheet_(TAB.QUIZ);
  var row = nextRow_(sh);
  sh.getRange(row, 1, 1, QUIZ_COLS.length).setValues([[new Date(), clean_(b.interest, 80),
    clean_(b.goal, 80), clean_(b.cert, 80), clean_(b.budget, 80), clean_(b.suggested, 500)]]);
}

function notify_(result, name, phone, course, source) {
  try {
    var me = Session.getEffectiveUser().getEmail();
    if (!me) return;
    var tag = result.duplicate ? 'Repeat inquiry' : (result.returning ? 'Returning learner' : 'New inquiry');
    MailApp.sendEmail({
      to: me,
      subject: tag + ': ' + name + ' – ' + course,
      htmlBody: '<p><b>' + esc_(tag) + '</b> from the Elevate student portal.</p>' +
        '<p>Name: ' + esc_(name) + '<br>Phone: ' + esc_(phone) + '<br>Course: ' + esc_(course) +
        '<br>Lead source: ' + esc_(source) + '<br>Learner ID: ' + esc_(result.learnerId) + '</p>' +
        '<p>Open your dashboard to follow up.</p>'
    });
  } catch (err) { /* email is optional; never block the inquiry */ }
}

/* =====================================================================
   Private dashboard (owner only)
   ===================================================================== */

function doGet() {
  if (!isOwner_()) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:Arial,sans-serif;max-width:420px;margin:60px auto;padding:24px;text-align:center;color:#5a3d6e">' +
      '<h2>Private page</h2><p>This dashboard is only available to its owner.</p></div>')
      .setTitle('Elevate');
  }
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('Elevate Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getDashboardData() {
  assertOwner_();
  var tz = ss_().getSpreadsheetTimeZone();
  var records = readTable_(TAB.ENROLLMENTS, ENR_READ).map(function (r) { return out_(r, tz); });
  var logs = readTable_(TAB.LOG, LOG_COLS).map(function (r) { return out_(r, tz); });
  var quiz = readTable_(TAB.QUIZ, QUIZ_COLS).slice(-500).map(function (r) { return out_(r, tz); });
  return {
    records: records, logs: logs, quiz: quiz, lists: lists_(),
    sheetUrl: ss_().getUrl(), today: Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd')
  };
}

/** Add a learner (or another course for an existing learner) from the dashboard. */
function addLearner(d) {
  assertOwner_();
  d = d || {};
  var rec = {};
  ['learnerId', 'name', 'phone', 'email', 'course', 'category', 'fee', 'pay', 'mode', 'start', 'time',
    'source', 'sourceDetail', 'counsellor', 'status', 'notes'].forEach(function (k) {
    rec[k] = clean_(d[k], k === 'notes' ? 1500 : 200);
  });
  rec.followUp = date_(d.followUp);
  rec.enrolledDate = date_(d.enrolledDate);
  rec.via = 'Dashboard';
  rec.consent = d.consent ? 'Yes' : '';
  if (!rec.learnerId && (!rec.name || !rec.phone)) throw new Error('Name and phone are required.');
  if (!rec.course) throw new Error('Course is required.');
  return addRecord_(rec, { fromPortal: false });
}

/** Update one course record (status, counsellor, follow-up, notes and so on). */
function updateRecord(recordId, changes) {
  assertOwner_();
  var editable = ['course', 'category', 'fee', 'pay', 'mode', 'start', 'time', 'source', 'sourceDetail',
    'counsellor', 'status', 'followUp', 'enrolledDate', 'notes'];
  return withLock_(function () {
    var sh = sheet_(TAB.ENROLLMENTS);
    var rec = findRecord_(recordId);
    if (!rec) throw new Error('Record not found: ' + recordId);
    var row = sh.getRange(rec._row, 1, 1, ENR_COLS.length).getValues()[0];
    var oldStatus = row[ENR_COLS.indexOf('status')];
    editable.forEach(function (k) {
      if (!changes || !(k in changes)) return;
      var v = DATE_FIELDS[k] ? date_(changes[k]) : clean_(changes[k], k === 'notes' ? 3000 : 200);
      row[ENR_COLS.indexOf(k)] = v;
    });
    var newStatus = row[ENR_COLS.indexOf('status')];
    if (newStatus === 'Enrolled' && !row[ENR_COLS.indexOf('enrolledDate')]) {
      row[ENR_COLS.indexOf('enrolledDate')] = today_();
    }
    row[ENR_COLS.indexOf('updated')] = new Date();
    sh.getRange(rec._row, 1, 1, ENR_COLS.length).setValues([sanitizeRow_(row)]);
    if (newStatus !== oldStatus) {
      appendLog_({
        learnerId: rec.learnerId, name: rec.name, recordId: rec.id, course: row[ENR_COLS.indexOf('course')],
        type: 'Status change', note: 'Status changed from ' + (oldStatus || 'blank') + ' to ' + newStatus,
        statusAfter: newStatus
      });
    }
    return { ok: true };
  });
}

/** Update a learner's name, phone or email on all of their course records. */
function updateLearner(learnerId, changes) {
  assertOwner_();
  return withLock_(function () {
    var sh = sheet_(TAB.ENROLLMENTS);
    var recs = readTable_(TAB.ENROLLMENTS, ENR_COLS).filter(function (r) { return r.learnerId === learnerId; });
    if (!recs.length) throw new Error('Learner not found: ' + learnerId);
    recs.forEach(function (r) {
      ['name', 'phone', 'email'].forEach(function (k) {
        if (changes && k in changes) {
          sh.getRange(r._row, ENR_COLS.indexOf(k) + 1).setValue(sanitize_(clean_(changes[k], 120)));
        }
      });
      sh.getRange(r._row, ENR_COLS.indexOf('updated') + 1).setValue(new Date());
    });
    return { ok: true, updated: recs.length };
  });
}

/** Add an entry to the contact history, and optionally update the course status and follow-up date. */
function logContact(d) {
  assertOwner_();
  d = d || {};
  if (!d.learnerId) throw new Error('Learner is required.');
  if (!d.note && !d.statusAfter) throw new Error('Add a note or choose a status.');
  return withLock_(function () {
    var recs = readTable_(TAB.ENROLLMENTS, ENR_COLS).filter(function (r) { return r.learnerId === d.learnerId; });
    if (!recs.length) throw new Error('Learner not found: ' + d.learnerId);
    var rec = d.recordId ? recs.filter(function (r) { return r.id === d.recordId; })[0] : null;
    var sh = sheet_(TAB.ENROLLMENTS);
    var oldStatus = rec ? rec.status : '';
    appendLog_({
      learnerId: d.learnerId, name: recs[0].name, recordId: rec ? rec.id : '', course: rec ? rec.course : '',
      type: clean_(d.type, 40) || 'Note', note: clean_(d.note, 3000), statusAfter: clean_(d.statusAfter, 40),
      nextFollowUp: date_(d.nextFollowUp), by: clean_(d.by, 80)
    });
    if (rec) {
      if (d.statusAfter && d.statusAfter !== oldStatus) {
        sh.getRange(rec._row, ENR_COLS.indexOf('status') + 1).setValue(clean_(d.statusAfter, 40));
        if (d.statusAfter === 'Enrolled' && !rec.enrolledDate) {
          sh.getRange(rec._row, ENR_COLS.indexOf('enrolledDate') + 1).setValue(today_());
        }
      }
      if (d.nextFollowUp) sh.getRange(rec._row, ENR_COLS.indexOf('followUp') + 1).setValue(date_(d.nextFollowUp));
      sh.getRange(rec._row, ENR_COLS.indexOf('updated') + 1).setValue(new Date());
    }
    return { ok: true };
  });
}

/* =====================================================================
   Shared logic
   ===================================================================== */

function addRecord_(d, opts) {
  return withLock_(function () {
    var sh = sheet_(TAB.ENROLLMENTS);
    var records = readTable_(TAB.ENROLLMENTS, ENR_COLS);
    var lists = lists_();
    var learner = null;
    if (d.learnerId) {
      learner = records.filter(function (r) { return r.learnerId === d.learnerId; })[0] || null;
      if (!learner) throw new Error('Learner not found: ' + d.learnerId);
    } else {
      learner = findLearner_(records, d.phone, d.email);
    }
    var learnerId = learner ? learner.learnerId : nextId_(records.map(function (r) { return r.learnerId; }), 'L');

    // The same person asking again about a course that is still open: keep one record, log the new inquiry.
    if (learner && opts.fromPortal) {
      var open = records.filter(function (r) {
        return r.learnerId === learnerId && norm_(r.course) === norm_(d.course) && !CLOSED[r.status];
      })[0];
      if (open) {
        appendLog_({
          learnerId: learnerId, name: open.name, recordId: open.id, course: open.course, type: 'Note',
          note: 'Asked about this course again through the portal.' + (d.message ? ' Message: ' + d.message : '')
        });
        sh.getRange(open._row, ENR_COLS.indexOf('updated') + 1).setValue(new Date());
        return { ok: true, duplicate: true, returning: true, learnerId: learnerId, recordId: open.id };
      }
    }

    var rec = {
      id: nextId_(records.map(function (r) { return r.id; }), 'R'),
      learnerId: learnerId,
      date: new Date(),
      name: learner ? learner.name : d.name,
      phone: learner ? (learner.phone || d.phone) : d.phone,
      email: (learner && learner.email) || d.email || '',
      course: d.course, category: d.category || '', fee: d.fee || '', pay: d.pay || '', mode: d.mode || '',
      start: d.start || '', time: d.time || '', source: d.source || (learner ? learner.source : '') || 'Direct',
      sourceDetail: d.sourceDetail || '', counsellor: d.counsellor || lists.counsellors[0] || '',
      status: d.status || 'Inquired', followUp: d.followUp || '', enrolledDate: d.enrolledDate || '',
      notes: d.notes || '', message: d.message || '', via: d.via || '', updated: new Date(),
      consent: d.consent || ''
    };
    if (rec.status === 'Enrolled' && !rec.enrolledDate) rec.enrolledDate = today_();
    var row = nextRow_(sh);
    sh.getRange(row, 1, 1, ENR_COLS.length).setValues([sanitizeRow_(ENR_COLS.map(function (k) { return rec[k]; }))]);
    return { ok: true, returning: !!learner, learnerId: learnerId, recordId: rec.id };
  });
}

function appendLog_(d) {
  var sh = sheet_(TAB.LOG);
  var ids = readTable_(TAB.LOG, LOG_COLS).map(function (r) { return r.id; });
  var by = d.by || lists_().counsellors[0] || '';
  var row = nextRow_(sh);
  sh.getRange(row, 1, 1, LOG_COLS.length).setValues([sanitizeRow_([new Date(), nextId_(ids, 'C'), d.learnerId,
    d.name || '', d.recordId || '', d.course || '', d.type || 'Note', d.note || '', d.statusAfter || '',
    d.nextFollowUp || '', by])]);
}

function findRecord_(recordId) {
  return readTable_(TAB.ENROLLMENTS, ENR_COLS).filter(function (r) { return r.id === recordId; })[0] || null;
}

function findLearner_(records, phone, email) {
  var p = normPhone_(phone), m = String(email || '').trim().toLowerCase();
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    if (p && normPhone_(r.phone) === p) return r;
    if (m && String(r.email || '').trim().toLowerCase() === m) return r;
  }
  return null;
}

function lists_() {
  var v = sheet_(TAB.LISTS).getRange(2, 1, 30, 4).getValues();
  function col(i) { return v.map(function (r) { return String(r[i]).trim(); }).filter(String); }
  return { statuses: col(0), sources: col(1), counsellors: col(2), contactTypes: col(3) };
}

/* =====================================================================
   Helpers
   ===================================================================== */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) throw new Error('The "' + name + '" tab is missing from the sheet.');
  return s;
}

/** Last row that has something in column A (formulas in other columns are ignored). */
function lastDataRow_(sh) {
  var n = sh.getLastRow();
  if (n < 2) return 1;
  var vals = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]).trim() !== '') return i + 2;
  return 1;
}

function nextRow_(sh) {
  var row = lastDataRow_(sh) + 1;
  if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  return row;
}

function readTable_(name, cols) {
  var sh = sheet_(name);
  var last = lastDataRow_(sh);
  if (last < 2) return [];
  var width = Math.min(cols.length, sh.getMaxColumns());
  return sh.getRange(2, 1, last - 1, width).getValues().reduce(function (out, r, i) {
    if (String(r[0]).trim() === '') return out;
    var o = { _row: i + 2 };
    cols.forEach(function (c, j) { o[c] = j < r.length ? r[j] : ''; });
    out.push(o);
    return out;
  }, []);
}

/** Convert a row for the browser: dates become text, internal fields are removed. */
function out_(r, tz) {
  var o = {};
  Object.keys(r).forEach(function (k) {
    if (k === '_row') return;
    var v = r[k];
    if (v instanceof Date) {
      o[k] = Utilities.formatDate(v, tz, DATE_FIELDS[k] && k !== 'date' && k !== 'updated' && k !== 'lastContact'
        ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss");
    } else {
      o[k] = v === null || v === undefined ? '' : String(v);
    }
  });
  return o;
}

function nextId_(existing, prefix) {
  var max = 0, re = new RegExp('^' + prefix + '-(\\d+)$');
  existing.forEach(function (id) {
    var m = String(id || '').match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return prefix + '-' + ('000' + (max + 1)).slice(-Math.max(4, String(max + 1).length));
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function isOwner_() {
  var me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  var user = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  return !!me && user === me;
}

function assertOwner_() {
  if (!isOwner_()) throw new Error('Not authorised. Sign in with the account that owns this sheet.');
}

function clean_(v, max) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max || 200);
}

/** Text that starts with = + - @ is stored as plain text, never as a formula. */
function sanitize_(v) {
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}

function sanitizeRow_(row) { return row.map(sanitize_); }

function date_(s) {
  if (!s) return '';
  if (s instanceof Date) return s;
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : '';
}

function today_() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }

function normPhone_(p) {
  var digits = String(p || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-8) : '';
}

function norm_(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

function esc_(s) {
  return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* =====================================================================
   Setup helpers (run from the Apps Script editor)
   ===================================================================== */

/** Run this once from the editor: it asks for permissions and checks the sheet. */
function setup() {
  [TAB.ENROLLMENTS, TAB.LOG, TAB.QUIZ, TAB.LISTS].forEach(sheet_);
  MailApp.getRemainingDailyQuota();
  Logger.log('Setup OK. Sheet: %s. Owner: %s', ss_().getName(), Session.getEffectiveUser().getEmail());
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Elevate')
    .addItem('Check setup', 'menuCheck_')
    .addToUi();
}

function menuCheck_() {
  setup();
  SpreadsheetApp.getUi().alert('Everything is set up. Open your dashboard with the "Dashboard" web app link.');
}
