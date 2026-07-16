// ─── Web server + REST API ────────────────────────────
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json({ limit: '5mb' }));

const memberCols = 'id, name, role, phone, color';
const fineCols = 'id, memberId, reason, amount, date, note, status';
const spendCols = 'id, descr AS "desc", cat, amount, date, note';
const settingCols = 'groupName, bank, account, accName, content';

// ─── MEMBERS ───────────────────────────────
app.get('/api/members', (req, res) => {
  res.json(db.prepare(`SELECT ${memberCols} FROM members ORDER BY id`).all());
});
app.post('/api/members', (req, res) => {
  const { name, role = 'Thành viên', phone = '', color = '#888' } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Thiếu tên thành viên' });
  const info = db.prepare('INSERT INTO members (name, role, phone, color) VALUES (?, ?, ?, ?)').run(name, role, phone, color);
  res.status(201).json(db.prepare(`SELECT ${memberCols} FROM members WHERE id = ?`).get(info.lastInsertRowid));
});
app.delete('/api/members/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ─── FINES ─────────────────────────────────
app.get('/api/fines', (req, res) => {
  res.json(db.prepare(`SELECT ${fineCols} FROM fines ORDER BY date DESC, id DESC`).all());
});
app.post('/api/fines', (req, res) => {
  const { memberId, reason, amount, date, note = '', status = 'unpaid' } = req.body || {};
  if (!memberId || !reason || !amount || !date) return res.status(400).json({ error: 'Thiếu thông tin' });
  const info = db.prepare('INSERT INTO fines (memberId, reason, amount, date, note, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(memberId, reason, amount, date, note, status);
  res.status(201).json(db.prepare(`SELECT ${fineCols} FROM fines WHERE id = ?`).get(info.lastInsertRowid));
});
app.patch('/api/fines/:id', (req, res) => {
  const { status } = req.body || {};
  if (status) db.prepare('UPDATE fines SET status = ? WHERE id = ?').run(status, req.params.id);
  res.status(204).end();
});
app.delete('/api/fines/:id', (req, res) => {
  db.prepare('DELETE FROM fines WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ─── SPENDINGS ─────────────────────────────
app.get('/api/spendings', (req, res) => {
  res.json(db.prepare(`SELECT ${spendCols} FROM spendings ORDER BY date DESC, id DESC`).all());
});
app.post('/api/spendings', (req, res) => {
  const { desc, cat = 'khác', amount, date, note = '' } = req.body || {};
  if (!desc || !amount || !date) return res.status(400).json({ error: 'Thiếu thông tin' });
  const info = db.prepare('INSERT INTO spendings (descr, cat, amount, date, note) VALUES (?, ?, ?, ?, ?)')
    .run(desc, cat, amount, date, note);
  res.status(201).json(db.prepare(`SELECT ${spendCols} FROM spendings WHERE id = ?`).get(info.lastInsertRowid));
});
app.delete('/api/spendings/:id', (req, res) => {
  db.prepare('DELETE FROM spendings WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ─── SETTINGS ──────────────────────────────
app.get('/api/settings', (req, res) => {
  res.json(db.prepare(`SELECT ${settingCols} FROM settings WHERE id = 1`).get());
});
app.put('/api/settings', (req, res) => {
  const { groupName = '', bank = 'VCB', account = '', accName = '', content = '' } = req.body || {};
  db.prepare('UPDATE settings SET groupName=?, bank=?, account=?, accName=?, content=? WHERE id=1')
    .run(groupName, bank, account, accName, content);
  res.status(204).end();
});

// ─── BACKUP / RESTORE ──────────────────────
app.get('/api/backup', (req, res) => {
  res.json({
    members: db.prepare(`SELECT ${memberCols} FROM members ORDER BY id`).all(),
    fines: db.prepare(`SELECT ${fineCols} FROM fines ORDER BY id`).all(),
    spendings: db.prepare(`SELECT ${spendCols} FROM spendings ORDER BY id`).all(),
    settings: db.prepare(`SELECT ${settingCols} FROM settings WHERE id = 1`).get(),
  });
});
app.post('/api/restore', (req, res) => {
  const { members = [], fines = [], spendings = [], settings = {} } = req.body || {};
  db.transaction(() => {
    db.prepare('DELETE FROM members').run();
    db.prepare('DELETE FROM fines').run();
    db.prepare('DELETE FROM spendings').run();
    const insM = db.prepare('INSERT INTO members (id, name, role, phone, color) VALUES (?, ?, ?, ?, ?)');
    members.forEach(m => insM.run(m.id, m.name, m.role || 'Thành viên', m.phone || '', m.color || '#888'));
    const insF = db.prepare('INSERT INTO fines (id, memberId, reason, amount, date, note, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    fines.forEach(f => insF.run(f.id, f.memberId, f.reason, f.amount, f.date, f.note || '', f.status || 'unpaid'));
    const insS = db.prepare('INSERT INTO spendings (id, descr, cat, amount, date, note) VALUES (?, ?, ?, ?, ?, ?)');
    spendings.forEach(s => insS.run(s.id, s.desc, s.cat || 'khác', s.amount, s.date, s.note || ''));
    db.prepare('UPDATE settings SET groupName=?, bank=?, account=?, accName=?, content=? WHERE id=1').run(
      settings.groupName || 'Team của tôi', settings.bank || 'VCB', settings.account || '',
      settings.accName || '', settings.content || 'Dong tien phat nhom');
  })();
  res.status(204).end();
});

// ─── STATIC (index.html, styles.css, app.js) ───
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy tại http://localhost:${PORT}`));
