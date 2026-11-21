// Builds Dashboard.html from Dashboard.src.html, filling in the course catalogue
// from the student portal (../index.html) so both always list the same courses.
// Run from this folder:  node build.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const portal = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = portal.indexOf('var CATALOG = [');
const end = portal.indexOf('\n  ];', start);
if (start < 0 || end < 0) throw new Error('Could not find the CATALOG list in index.html');
const ctx = {};
vm.runInNewContext(portal.slice(start, end + 5).replace('var CATALOG', 'this.CATALOG'), ctx);

const list = [];
ctx.CATALOG.forEach((cat) => cat.courses.forEach((c) => list.push([cat.name, c[0], c[1], c[2]])));

const src = fs.readFileSync(path.join(__dirname, 'Dashboard.src.html'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'Dashboard.html'), src.replace('__CATALOG__', JSON.stringify(list)));
console.log('Dashboard.html built with ' + list.length + ' courses');
