// Minimal in-memory stand-in for the Apps Script services used by Code.gs (tests only).
(function (root) {
  function makeSheet(name, header, rows, cols) {
    const data = [];
    for (let r = 0; r < rows; r++) data.push(new Array(cols).fill(''));
    header.forEach((h, i) => (data[0][i] = h));
    return {
      _name: name, _data: data,
      getName() { return name; },
      getLastRow() { for (let r = data.length - 1; r >= 0; r--) if (data[r].some((v) => v !== '' && v !== null)) return r + 1; return 0; },
      getMaxRows() { return data.length; },
      getMaxColumns() { return data[0].length; },
      insertRowsAfter(after, n) { for (let i = 0; i < n; i++) data.splice(after, 0, new Array(data[0].length).fill('')); },
      getRange(row, col, nr, nc) {
        nr = nr || 1; nc = nc || 1;
        if (row < 1 || col < 1 || row + nr - 1 > data.length || col + nc - 1 > data[0].length) throw new Error('Range out of bounds ' + name + ' ' + [row, col, nr, nc]);
        return {
          getValues() { const out = []; for (let r = 0; r < nr; r++) out.push(data[row - 1 + r].slice(col - 1, col - 1 + nc)); return out; },
          setValues(v) {
            if (v.length !== nr || v[0].length !== nc) throw new Error('setValues size mismatch');
            v.forEach((rv, r) => rv.forEach((x, c) => (data[row - 1 + r][col - 1 + c] = store(x))));
          },
          setValue(x) { data[row - 1][col - 1] = store(x); },
          getValue() { return data[row - 1][col - 1]; }
        };
      }
    };
  }
  // Like Sheets: a leading apostrophe keeps text, other strings beginning with = become "formulas".
  function store(x) {
    if (typeof x === 'string' && x[0] === "'") return x.slice(1);
    if (typeof x === 'string' && x[0] === '=') return { FORMULA: x };
    return x;
  }

  const ENR = ['Record ID', 'Learner ID', 'Date added', 'Full name', 'Phone / WhatsApp', 'Email', 'Course', 'Category', 'Listed fee', 'Payment option', 'Study mode', 'Preferred start', 'Best time to contact', 'Lead source', 'Source details', 'Counsellor', 'Status', 'Follow-up date', 'Enrolled date', 'Notes', "Learner's message", 'Added via', 'Last updated', 'Consent to contact', 'Last contacted', 'Payment method', 'ID documents'];
  const sheets = {
    'Enrollments': makeSheet('Enrollments', ENR, 1000, 27),
    'Contact log': makeSheet('Contact log', ['Date and time', 'Log ID', 'Learner ID', 'Learner name', 'Record ID', 'Course', 'Contact type', 'Note', 'Status after contact', 'Next follow-up', 'Logged by'], 2000, 11),
    'Quiz results': makeSheet('Quiz results', ['Date', 'Interest', 'Goal', 'International certificate', 'Budget', 'Suggested courses'], 1000, 8),
    'Lists': makeSheet('Lists', ['Status', 'Lead source', 'Counsellor', 'Contact type'], 50, 4)
  };
  const L = [['Inquired', 'School-provided', 'Ms. Maria', 'Call'], ['Contacted', 'Social media', '', 'WhatsApp'], ['Visited', 'Direct', '', 'Email'], ['Applied', 'Referral', '', 'Visit'], ['Enrolled', '', '', 'Meeting'], ['Follow-up', '', '', 'Note'], ['Not interested', '', '', '']];
  L.forEach((r, i) => r.forEach((v, j) => (sheets.Lists._data[i + 1][j] = v)));

  const state = { activeUser: 'owner@example.com', owner: 'owner@example.com', mails: [], files: [], folders: [], props: {} };
  root.__mock = { sheets, state };
  root.SpreadsheetApp = {
    getActiveSpreadsheet() {
      return { getSheetByName: (n) => sheets[n] || null, getSpreadsheetTimeZone: () => 'Asia/Qatar', getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST/edit', getName: () => 'Elevate Learners' };
    },
    getUi() { return { createMenu() { return { addItem() { return this; }, addToUi() {} }; }, alert() {} }; }
  };
  root.Session = { getEffectiveUser: () => ({ getEmail: () => state.owner }), getActiveUser: () => ({ getEmail: () => state.activeUser }) };
  root.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  root.MailApp = { sendEmail: (o) => state.mails.push(o), getRemainingDailyQuota: () => 100 };
  root.Logger = { log() {} };
  root.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => state.props[k] || null, setProperty: (k, v) => { state.props[k] = v; } }) };
  function folder(id, name) {
    return { getId: () => id, setDescription() {}, createFile(blob) {
      const f = { id: 'F' + (state.files.length + 1), name: blob.name, type: blob.type, size: blob.bytes.length, folder: id };
      state.files.push(f); return { getUrl: () => 'https://drive.google.com/file/d/' + f.id + '/view' }; } };
  }
  root.DriveApp = {
    createFolder(name) { const id = 'FOLDER' + (state.folders.length + 1); state.folders.push({ id, name }); return folder(id, name); },
    getFolderById(id) { if (!state.folders.some((f) => f.id === id)) throw new Error('not found'); return folder(id); }
  };
  root.Utilities = {
    base64Decode(b64) {
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', out = [];
      let buf = 0, bits = 0;
      for (const ch of b64.replace(/=+$/, '')) { buf = (buf << 6) | A.indexOf(ch); bits += 6; if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); } }
      return out;
    },
    newBlob(bytes, type, name) { return { bytes, type, name }; },
    formatDate(d, tz, fmt) {
      const p = (n) => String(n).padStart(2, '0');
      const s = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
      return fmt === 'yyyy-MM-dd' ? s : s + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }
  };
  root.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType() { return { body: t }; }, body: t }) };
  root.HtmlService = {
    createHtmlOutput: (h) => ({ html: h, setTitle() { return this; } }),
    createHtmlOutputFromFile: (f) => ({ file: f, setTitle() { return this; }, addMetaTag() { return this; } })
  };
})(typeof window !== 'undefined' ? window : globalThis);
