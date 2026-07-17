// ─── SQLite database ──────────────────────────────────
// Dữ liệu lưu trong file data.db trên ổ đĩa (không mất khi xóa cache trình duyệt).
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL,
    role   TEXT DEFAULT 'Thành viên',
    phone  TEXT DEFAULT '',
    color  TEXT DEFAULT '#888'
  );
  CREATE TABLE IF NOT EXISTS fines (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    memberId INTEGER NOT NULL,
    reason   TEXT NOT NULL,
    amount   INTEGER NOT NULL,
    date     TEXT NOT NULL,
    note     TEXT DEFAULT '',
    status   TEXT DEFAULT 'unpaid'
  );
  CREATE TABLE IF NOT EXISTS spendings (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    descr  TEXT NOT NULL,
    cat    TEXT DEFAULT 'khác',
    amount INTEGER NOT NULL,
    date   TEXT NOT NULL,
    note   TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS settings (
    id        INTEGER PRIMARY KEY CHECK (id = 1),
    groupName TEXT DEFAULT 'Team của tôi',
    bank      TEXT DEFAULT 'VCB',
    account   TEXT DEFAULT '',
    accName   TEXT DEFAULT '',
    content   TEXT DEFAULT 'Dong tien phat nhom',
    treasurer TEXT DEFAULT 'Hải Đăng',
    zalopay   TEXT DEFAULT ''
  );
`);

// Luôn đảm bảo có 1 dòng settings
db.prepare(`INSERT OR IGNORE INTO settings (id) VALUES (1)`).run();

// Migration: thêm cột treasurer/zalopay cho DB tạo từ phiên bản trước
const settingCols = db.prepare('PRAGMA table_info(settings)').all().map(c => c.name);
if (!settingCols.includes('treasurer')) db.exec("ALTER TABLE settings ADD COLUMN treasurer TEXT DEFAULT 'Hải Đăng'");
if (!settingCols.includes('zalopay')) db.exec("ALTER TABLE settings ADD COLUMN zalopay TEXT DEFAULT ''");

// Seed dữ liệu demo lần đầu chạy (khi chưa có thành viên nào)
const memberCount = db.prepare('SELECT COUNT(*) AS n FROM members').get().n;
if (memberCount === 0) {
  const members = [
    ['AnhTVH', '#f0a500'], ['ThinhTH2', '#3b82f6'], ['KhiemVT', '#22c55e'],
    ['NhueDC', '#a855f7'], ['TriNT', '#ef4444'], ['TramLTM', '#06b6d4'],
    ['NamNTH3', '#f97316'], ['MinhLN9', '#ec4899'], ['KietPT2', '#14b8a6'],
    ['HaiLT5', '#8b5cf6'], ['DangPHH', '#84cc16'],
  ];
  const insM = db.prepare(`INSERT INTO members (name, role, phone, color) VALUES (?, 'Thành viên', '', ?)`);
  db.transaction(() => members.forEach(([n, c]) => insM.run(n, c)))();

  // memberId khớp thứ tự chèn ở trên (1..11)
  const fines = [
    [1,  'Đi trễ',                50000,  '2026-04-03'],
    [4,  'không kéo status task', 50000,  '2026-03-12'],
    [11, 'Đi trễ',                100000, '2026-04-17'],
    [6,  'Đi trễ',                150000, '2026-04-20'],
    [10, 'chưa kéo task',         50000,  '2026-03-17'],
    [9,  'Chưa kéo task',         50000,  '2026-04-17'],
    [10, 'chưa kéo task',         50000,  '2026-04-21'],
    [6,  'Đi trễ',                50000,  '2026-04-23'],
    [6,  'Tiền tài trợ',          550000, '2026-04-23'],
  ];
  const insF = db.prepare(`INSERT INTO fines (memberId, reason, amount, date, note, status) VALUES (?, ?, ?, ?, '', 'paid')`);
  db.transaction(() => fines.forEach(([m, r, a, d]) => insF.run(m, r, a, d)))();
}

module.exports = db;
