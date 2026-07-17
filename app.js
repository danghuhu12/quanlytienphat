// ─── STATE ──────────────────────────────────
// Dữ liệu được tải từ API (server + SQLite) và cache trong bộ nhớ để các hàm render dùng.
let state = { members: [], fines: [], spendings: [], settings: {} };

const COLORS = ['#f0a500','#3b82f6','#22c55e','#a855f7','#ef4444','#06b6d4','#f97316','#ec4899','#14b8a6','#8b5cf6'];

// ─── API CLIENT ─────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    let msg = 'Lỗi máy chủ (' + res.status + ')';
    try { const j = await res.json(); if (j.error) msg = j.error; } catch (e) {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

// Tải toàn bộ dữ liệu từ server vào state
async function loadState() {
  const [members, fines, spendings, settings] = await Promise.all([
    api('/members'), api('/fines'), api('/spendings'), api('/settings'),
  ]);
  state.members = members;
  state.fines = fines;
  state.spendings = spendings;
  state.settings = settings || {};
}

// Tải lại dữ liệu rồi vẽ lại dashboard + trang đang mở
async function refresh() {
  await loadState();
  renderDashboard();
  if (currentPage && currentPage !== 'dashboard') renderPage(currentPage);
}

// ─── PAGE NAVIGATION ─────────────────────────
const pageTitles = {
  dashboard: '📊 Tổng quan',
  fines: '💸 Danh sách phạt',
  members: '👥 Thành viên',
  spending: '🛒 Phân chi tiền',
  stats: '📈 Thống kê thu chi',
  export: '📄 Xuất báo cáo',
  settings: '⚙️ Cài đặt'
};

const pageOrder = ['dashboard','fines','members','spending','stats','export','settings'];

let currentPage = 'dashboard';

const pageSubtitles = {
  dashboard: 'Xem nhanh tình hình quỹ phạt của nhóm',
  fines: 'Thêm, tìm, lọc và sắp xếp các khoản vi phạm',
  members: 'Danh sách thành viên và tình trạng đóng phạt',
  spending: 'Ghi nhận các khoản chi tiêu từ quỹ',
  stats: 'Biểu đồ và thống kê thu chi theo tháng',
  export: 'Tạo và tải báo cáo theo tháng hoặc tổng hợp',
  settings: 'Cấu hình nhóm, thủ quỹ Zalopay và sao lưu dữ liệu',
};

function switchPage(name) {
  currentPage = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  const idx = pageOrder.indexOf(name);
  if (idx >= 0) document.querySelectorAll('.nav-item')[idx].classList.add('active');
  document.getElementById('page-title').textContent = pageTitles[name];
  document.getElementById('page-subtitle').textContent = pageSubtitles[name] || '';
  if (window.innerWidth <= 900) toggleSidebar(false);   // đóng menu sau khi chọn trên mobile
  renderPage(name);
}

// Mở/đóng sidebar trên mobile. Truyền true/false để ép trạng thái.
function toggleSidebar(open) {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const willOpen = open === undefined ? !sb.classList.contains('open') : open;
  sb.classList.toggle('open', willOpen);
  ov.classList.toggle('show', willOpen);
}

// Điền nhanh số tiền + xem trước dạng "50.000đ"
function setAmount(id, val) {
  document.getElementById(id).value = val;
  updateAmountPreview(id, id + '-preview');
}
function updateAmountPreview(id, previewId) {
  const v = parseInt(document.getElementById(id).value);
  const p = document.getElementById(previewId);
  if (p) p.textContent = v > 0 ? '= ' + fmt(v) : '';
}

function renderPage(name) {
  if (name === 'dashboard') renderDashboard();
  else if (name === 'fines') renderFines();
  else if (name === 'members') renderMembers();
  else if (name === 'spending') renderSpending();
  else if (name === 'stats') renderStats();
  else if (name === 'export') { populateExportMonths(); renderExport(); }
  else if (name === 'settings') loadSettings();
}

// ─── HELPERS ─────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

function getMember(id) {
  return state.members.find(m => m.id === id) || { name: 'Không rõ', color: '#888' };
}

function getMonths() {
  const months = new Set();
  state.fines.forEach(f => {
    const d = new Date(f.date);
    months.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  });
  return [...months].sort().reverse();
}

function getInitials(name) {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
}

function avatarHtml(member, size=32, radius=8) {
  return `<div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${member.color}20;border:2px solid ${member.color}40;display:flex;align-items:center;justify-content:center;font-size:${size*0.35}px;font-weight:700;color:${member.color};flex-shrink:0">${getInitials(member.name)}</div>`;
}

// ─── DASHBOARD ────────────────────────────────
function renderDashboard() {
  const total = state.fines.reduce((s, f) => s + f.amount, 0);
  const paid = state.fines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
  const unpaid = total - paid;

  document.getElementById('stat-total').textContent = fmt(total);
  document.getElementById('stat-unpaid').textContent = fmt(unpaid);
  document.getElementById('stat-paid').textContent = fmt(paid);
  document.getElementById('stat-members').textContent = state.members.length;
  document.getElementById('sidebar-total').textContent = fmt(unpaid);

  // Thẻ tổng tiền: đã thu / chưa thu / tổng cộng + tỷ lệ đã thu
  const collectRate = total > 0 ? Math.round(paid / total * 100) : 0;
  document.getElementById('sum-paid').textContent = fmt(paid);
  document.getElementById('sum-unpaid').textContent = fmt(unpaid);
  document.getElementById('sum-total').textContent = fmt(total);
  document.getElementById('sum-percent').textContent = collectRate + '%';
  document.getElementById('sum-bar').style.width = collectRate + '%';
  const totalExpense = (state.spendings||[]).reduce((s,x)=>s+x.amount,0);
  const balance = paid - totalExpense;
  const balEl = document.getElementById('sidebar-balance');
  balEl.textContent = fmt(balance);
  balEl.style.color = balance >= 0 ? 'var(--green)' : 'var(--red)';

  const recent = [...state.fines].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,8);
  const tbody = document.getElementById('recent-tbody');
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="icon">📋</div><h3>Chưa có vi phạm nào</h3><p>Nhấn "+ Thêm phạt" để bắt đầu</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(f => {
    const m = getMember(f.memberId);
    return `<tr>
      <td><div class="member-info">${avatarHtml(m)}<div><div class="member-name">${m.name}</div><div style="font-size:11px;color:var(--text2)">${m.role||''}</div></div></div></td>
      <td><span class="reason-tag">${f.reason}</span>${f.note?`<div style="font-size:11px;color:var(--text2);margin-top:3px">${f.note}</div>`:''}</td>
      <td><span class="amount-text" style="color:${f.status==='paid'?'var(--green)':'var(--red)'}">${fmt(f.amount)}</span></td>
      <td style="color:var(--text2);font-size:12.5px">${new Date(f.date).toLocaleDateString('vi-VN')}</td>
      <td><span class="badge badge-${f.status}">${f.status==='paid'?'✅ Đã đóng':'❌ Chưa đóng'}</span></td>
    </tr>`;
  }).join('');
}

// ─── FINES ────────────────────────────────────
let finesSort = { key: 'date', dir: 'desc' };

function sortFines(key) {
  if (finesSort.key === key) finesSort.dir = finesSort.dir === 'asc' ? 'desc' : 'asc';
  else finesSort = { key, dir: 'desc' };
  renderFines();
}

function updateSortHeaders() {
  [['amount','th-amount'], ['date','th-date']].forEach(([key, id]) => {
    const th = document.getElementById(id);
    if (!th) return;
    const active = finesSort.key === key;
    th.classList.toggle('sorted', active);
    const arrow = th.querySelector('.arrow');
    if (arrow) arrow.textContent = active ? (finesSort.dir === 'asc' ? '↑' : '↓') : '↕';
  });
}

function renderFines() {
  // populate member filter (giữ nguyên lựa chọn hiện tại khi rebuild)
  const fm = document.getElementById('filter-member');
  const prevMember = fm.value;
  fm.innerHTML = '<option value="">👤 Tất cả thành viên</option>' +
    state.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  if ([...fm.options].some(o => o.value === prevMember)) fm.value = prevMember;

  // populate month filter (giữ nguyên lựa chọn)
  const fmth = document.getElementById('filter-month');
  const prevMonth = fmth.value;
  const months = getMonths();
  fmth.innerHTML = '<option value="">📅 Tất cả tháng</option>' +
    months.map(m => { const [y,mo] = m.split('-'); return `<option value="${m}">Tháng ${mo}/${y}</option>`; }).join('');
  if ([...fmth.options].some(o => o.value === prevMonth)) fmth.value = prevMonth;

  // filter
  let fines = [...state.fines];
  const memberF = fm.value;
  const statusF = document.getElementById('filter-status').value;
  const monthF = fmth.value;
  const searchF = (document.getElementById('filter-search').value || '').trim().toLowerCase();

  if (memberF) fines = fines.filter(f => f.memberId == memberF);
  if (statusF) fines = fines.filter(f => f.status === statusF);
  if (monthF) fines = fines.filter(f => f.date.startsWith(monthF));
  if (searchF) fines = fines.filter(f => {
    const m = getMember(f.memberId);
    return `${m.name} ${f.reason} ${f.note || ''}`.toLowerCase().includes(searchF);
  });

  // sort theo cột đang chọn
  const dir = finesSort.dir === 'asc' ? 1 : -1;
  fines.sort((a, b) => {
    const r = finesSort.key === 'amount' ? a.amount - b.amount : new Date(a.date) - new Date(b.date);
    return r * dir;
  });
  updateSortHeaders();

  // fine member select
  const fms = document.getElementById('fine-member');
  fms.innerHTML = '<option value="">-- Chọn thành viên --</option>' +
    state.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

  const tbody = document.getElementById('fines-tbody');
  if (fines.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">💸</div><h3>Không có vi phạm</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = fines.map(f => {
    const m = getMember(f.memberId);
    return `<tr>
      <td><div class="member-info">${avatarHtml(m)}<div class="member-name">${m.name}</div></div></td>
      <td><span class="reason-tag">${f.reason}</span>${f.note?`<div style="font-size:11px;color:var(--text2);margin-top:3px">${f.note}</div>`:''}</td>
      <td><span class="amount-text">${fmt(f.amount)}</span></td>
      <td style="color:var(--text2);font-size:12.5px">${new Date(f.date).toLocaleDateString('vi-VN')}</td>
      <td><span class="badge badge-${f.status}">${f.status==='paid'?'✅ Đã đóng':'❌ Chưa đóng'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          ${f.status==='unpaid'?`<button class="btn btn-green btn-sm" onclick="togglePaid(${f.id})">✓ Đã đóng</button>`:`<button class="btn btn-secondary btn-sm" onclick="togglePaid(${f.id})">↩ Hoàn lại</button>`}
          <button class="btn btn-danger btn-sm" onclick="deleteFine(${f.id})">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function togglePaid(id) {
  const f = state.fines.find(x => x.id === id);
  if (!f) return;
  const status = f.status === 'paid' ? 'unpaid' : 'paid';
  try {
    await api('/fines/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
    await refresh();
    toast('Cập nhật trạng thái thành công!', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteFine(id) {
  if (!confirm('Xoá vi phạm này?')) return;
  try {
    await api('/fines/' + id, { method: 'DELETE' });
    await refresh();
    toast('Đã xoá vi phạm', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ─── MEMBERS ─────────────────────────────────
function renderMembers() {
  const grid = document.getElementById('members-grid');
  if (state.members.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">👥</div><h3>Chưa có thành viên</h3><p>Nhấn "+ Thêm thành viên" để bắt đầu</p></div>`;
    return;
  }
  grid.innerHTML = state.members.map(m => {
    const mFines = state.fines.filter(f => f.memberId === m.id);
    const total = mFines.reduce((s,f) => s+f.amount, 0);
    const unpaid = mFines.filter(f => f.status==='unpaid').reduce((s,f) => s+f.amount, 0);
    const count = mFines.length;
    return `<div class="member-card">
      <div class="member-card-top">
        ${avatarHtml(m, 48, 12)}
        <div>
          <div class="member-card-name">${m.name}</div>
          <div class="member-card-role">${m.role||'Thành viên'}</div>
          ${m.phone?`<div style="font-size:11px;color:var(--text3);margin-top:2px">📞 ${m.phone}</div>`:''}
        </div>
      </div>
      <div class="member-stats">
        <div class="member-stat"><div class="v" style="color:var(--accent)">${count}</div><div class="l">Vi phạm</div></div>
        <div class="member-stat"><div class="v" style="color:var(--red)">${fmt(unpaid)}</div><div class="l">Chưa đóng</div></div>
      </div>
      <div class="member-card-actions">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="filterByMember(${m.id})">📋 Xem phạt</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMember(${m.id})">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function filterByMember(id) {
  switchPage('fines');
  setTimeout(() => {
    document.getElementById('filter-member').value = id;
    renderFines();
  }, 100);
}

async function deleteMember(id) {
  if (!confirm('Xoá thành viên này? Các vi phạm liên quan vẫn được giữ lại.')) return;
  try {
    await api('/members/' + id, { method: 'DELETE' });
    await refresh();
    toast('Đã xoá thành viên', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ─── SPENDING ────────────────────────────────
const CAT_ICONS = { 'ăn uống':'🍔','đi lại':'🚗','mua sắm':'🛍️','quà tặng':'🎁','sự kiện':'🎉','khác':'📦' };
const CAT_COLORS = { 'ăn uống':'#f97316','đi lại':'#3b82f6','mua sắm':'#ec4899','quà tặng':'#a855f7','sự kiện':'#f0a500','khác':'#8892b0' };

function getSpendMonths() {
  const months = new Set();
  (state.spendings||[]).forEach(s => {
    const d = new Date(s.date);
    months.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  });
  return [...months].sort().reverse();
}

function renderSpending() {
  if (!state.spendings) state.spendings = [];
  // populate months
  const fmth = document.getElementById('filter-spending-month');
  const months = getSpendMonths();
  fmth.innerHTML = '<option value="">📅 Tất cả tháng</option>' +
    months.map(m => { const [y,mo] = m.split('-'); return `<option value="${m}">Tháng ${mo}/${y}</option>`; }).join('');

  let items = [...state.spendings];
  const monthF = fmth.value;
  const catF = document.getElementById('filter-spending-cat').value;
  if (monthF) items = items.filter(s => s.date.startsWith(monthF));
  if (catF) items = items.filter(s => s.cat === catF);
  items.sort((a,b) => new Date(b.date)-new Date(a.date));

  const tbody = document.getElementById('spending-tbody');
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">🛒</div><h3>Chưa có khoản chi nào</h3><p>Nhấn "+ Thêm chi" để ghi nhận chi tiêu từ quỹ</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(s => {
    const icon = CAT_ICONS[s.cat] || '📦';
    const color = CAT_COLORS[s.cat] || '#888';
    return `<tr>
      <td><span style="font-weight:600">${s.desc}</span></td>
      <td><span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:11.5px;font-weight:600;background:${color}20;color:${color}">${icon} ${s.cat}</span></td>
      <td><span class="amount-text" style="color:var(--red)">-${fmt(s.amount)}</span></td>
      <td style="color:var(--text2);font-size:12.5px">${new Date(s.date).toLocaleDateString('vi-VN')}</td>
      <td style="color:var(--text2);font-size:12px">${s.note||'—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteSpending(${s.id})">🗑</button></td>
    </tr>`;
  }).join('');
}

async function addSpending() {
  const desc = document.getElementById('spend-desc').value.trim();
  const cat = document.getElementById('spend-cat').value;
  const amount = parseInt(document.getElementById('spend-amount').value);
  const date = document.getElementById('spend-date').value;
  const note = document.getElementById('spend-note').value.trim();
  if (!desc) return toast('Vui lòng nhập nội dung chi!', 'error');
  if (!amount || amount <= 0) return toast('Vui lòng nhập số tiền hợp lệ!', 'error');
  if (!date) return toast('Vui lòng chọn ngày!', 'error');
  try {
    await api('/spendings', { method: 'POST', body: JSON.stringify({ desc, cat, amount, date, note }) });
    closeModal('spending-modal');
    document.getElementById('spend-desc').value = '';
    document.getElementById('spend-amount').value = '';
    document.getElementById('spend-note').value = '';
    await refresh();
    toast('Đã thêm khoản chi!', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteSpending(id) {
  if (!confirm('Xoá khoản chi này?')) return;
  try {
    await api('/spendings/' + id, { method: 'DELETE' });
    await refresh();
    toast('Đã xoá khoản chi', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ─── STATS ───────────────────────────────────
function renderStats() {
  if (!state.spendings) state.spendings = [];

  // populate months (union of fine months + spend months)
  const allMonths = new Set();
  state.fines.forEach(f => { const d=new Date(f.date); allMonths.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); });
  state.spendings.forEach(s => { const d=new Date(s.date); allMonths.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); });
  const months = [...allMonths].sort().reverse();
  const fmth = document.getElementById('filter-stats-month');
  fmth.innerHTML = '<option value="">📅 Tất cả (tổng hợp)</option>' +
    months.map(m => { const [y,mo] = m.split('-'); return `<option value="${m}">Tháng ${mo}/${y}</option>`; }).join('');

  const filterMonth = fmth.value;
  const fines = filterMonth ? state.fines.filter(f => f.date.startsWith(filterMonth)) : state.fines;
  const spendings = filterMonth ? state.spendings.filter(s => s.date.startsWith(filterMonth)) : state.spendings;

  const totalIncome = fines.filter(f => f.status==='paid').reduce((s,f)=>s+f.amount,0);
  const totalPending = fines.filter(f => f.status==='unpaid').reduce((s,f)=>s+f.amount,0);
  const totalAll = totalIncome + totalPending;
  const totalExpense = spendings.reduce((s,x)=>s+x.amount,0);
  const balance = totalIncome - totalExpense;

  document.getElementById('stats-total').textContent = fmt(totalAll);
  document.getElementById('stats-income').textContent = fmt(totalIncome);
  document.getElementById('stats-pending').textContent = fmt(totalPending);
  document.getElementById('stats-expense').textContent = fmt(totalExpense);
  document.getElementById('stats-balance').textContent = fmt(balance);
  document.getElementById('stats-balance').style.color = balance >= 0 ? 'var(--accent)' : 'var(--red)';

  // Bar chart: thu vs chi by month
  renderBarChart(months);
  renderCatChart(spendings);

  // Income detail table
  const incByMonth = {};
  fines.filter(f=>f.status==='paid').forEach(f => {
    const d=new Date(f.date); const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!incByMonth[m]) incByMonth[m]={count:0,total:0};
    incByMonth[m].count++; incByMonth[m].total+=f.amount;
  });
  const incMonths = Object.keys(incByMonth).sort().reverse();
  document.getElementById('stats-income-tbody').innerHTML = incMonths.length === 0
    ? `<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text2)">Chưa có dữ liệu</td></tr>`
    : incMonths.map(m => {
        const [y,mo]=m.split('-');
        return `<tr><td style="color:var(--text2)">Tháng ${mo}/${y}</td><td>${incByMonth[m].count} lần</td><td class="amount-text" style="color:var(--green)">${fmt(incByMonth[m].total)}</td></tr>`;
      }).join('');

  // Expense detail table
  const expByMonth = {};
  spendings.forEach(s => {
    const d=new Date(s.date); const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!expByMonth[m]) expByMonth[m]={count:0,total:0};
    expByMonth[m].count++; expByMonth[m].total+=s.amount;
  });
  const expMonths = Object.keys(expByMonth).sort().reverse();
  document.getElementById('stats-expense-tbody').innerHTML = expMonths.length === 0
    ? `<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text2)">Chưa có khoản chi</td></tr>`
    : expMonths.map(m => {
        const [y,mo]=m.split('-');
        return `<tr><td style="color:var(--text2)">Tháng ${mo}/${y}</td><td>${expByMonth[m].count} khoản</td><td class="amount-text" style="color:var(--red)">-${fmt(expByMonth[m].total)}</td></tr>`;
      }).join('');
}

function renderBarChart(months) {
  const container = document.getElementById('bar-chart-container');
  if (months.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📊</div><h3>Chưa có dữ liệu</h3></div>`;
    return;
  }
  const display = months.slice(0, 6).reverse();
  const data = display.map(m => {
    const inc = state.fines.filter(f => f.status==='paid' && f.date.startsWith(m)).reduce((s,f)=>s+f.amount,0);
    const exp = (state.spendings||[]).filter(s => s.date.startsWith(m)).reduce((s,x)=>s+x.amount,0);
    return { m, inc, exp };
  });
  const maxVal = Math.max(...data.map(d => Math.max(d.inc, d.exp)), 1);

  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:8px;height:180px;padding-bottom:28px;position:relative;">
      ${data.map(d => {
        const incH = Math.round((d.inc/maxVal)*150);
        const expH = Math.round((d.exp/maxVal)*150);
        const [y,mo] = d.m.split('-');
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end;">
          <div style="display:flex;gap:2px;align-items:flex-end;width:100%;justify-content:center">
            <div title="Thu: ${fmt(d.inc)}" style="flex:1;max-width:22px;height:${incH}px;background:var(--green);border-radius:3px 3px 0 0;opacity:0.85;min-height:${d.inc>0?2:0}px;cursor:pointer"></div>
            <div title="Chi: ${fmt(d.exp)}" style="flex:1;max-width:22px;height:${expH}px;background:var(--red);border-radius:3px 3px 0 0;opacity:0.85;min-height:${d.exp>0?2:0}px;cursor:pointer"></div>
          </div>
          <div style="font-size:10px;color:var(--text2);margin-top:4px;white-space:nowrap">T${mo}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:16px;margin-top:4px;justify-content:center">
      <span style="font-size:11.5px;color:var(--text2);display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:var(--green);border-radius:2px;display:inline-block"></span>Thu</span>
      <span style="font-size:11.5px;color:var(--text2);display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:var(--red);border-radius:2px;display:inline-block"></span>Chi</span>
    </div>`;
}

function renderCatChart(spendings) {
  const container = document.getElementById('cat-chart-container');
  if (spendings.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:24px"><div class="icon">🏷️</div><h3>Chưa có khoản chi</h3></div>`;
    return;
  }
  const bycat = {};
  spendings.forEach(s => { bycat[s.cat] = (bycat[s.cat]||0) + s.amount; });
  const total = Object.values(bycat).reduce((a,b)=>a+b,0);
  const cats = Object.entries(bycat).sort((a,b)=>b[1]-a[1]);
  container.innerHTML = cats.map(([cat, amt]) => {
    const pct = Math.round(amt/total*100);
    const color = CAT_COLORS[cat]||'#888';
    const icon = CAT_ICONS[cat]||'📦';
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12.5px;font-weight:600">${icon} ${cat}</span>
        <span style="font-size:12px;font-family:var(--mono);color:${color}">${fmt(amt)} <span style="color:var(--text2);font-size:11px">(${pct}%)</span></span>
      </div>
      <div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.5s"></div>
      </div>
    </div>`;
  }).join('');
}

// ─── EXPORT ──────────────────────────────────
function populateExportMonths() {
  const sel = document.getElementById('export-month-select');
  const prev = sel.value;
  const months = getMonths();
  sel.innerHTML =
    '<option value="all">📊 Tổng hợp (tất cả các tháng)</option>' +
    months.map(m => { const [y,mo] = m.split('-'); return `<option value="${m}">Tháng ${mo}/${y}</option>`; }).join('');
  // giữ lựa chọn cũ nếu còn hợp lệ
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
}

function renderExport() {
  const sel = document.getElementById('export-month-select');
  const period = sel.value || 'all';          // 'all' hoặc 'YYYY-MM'
  const isAll = period === 'all';
  const [y, mo] = isAll ? ['', ''] : period.split('-');
  const periodLabel = isAll ? 'Tổng hợp (tất cả)' : `Tháng ${mo}/${y}`;
  const s = state.settings;

  document.getElementById('exp-group-name').textContent = s.groupName || 'Nhóm của bạn';
  document.getElementById('exp-month-tag').textContent = periodLabel;
  document.getElementById('exp-date').textContent = new Date().toLocaleDateString('vi-VN');

  const fines = isAll ? [...state.fines] : state.fines.filter(f => f.date.startsWith(period));
  const total = fines.reduce((s,f) => s+f.amount, 0);
  const paid = fines.filter(f => f.status==='paid').reduce((s,f) => s+f.amount, 0);
  const unpaid = total - paid;

  document.getElementById('exp-total').textContent = fmt(total);
  document.getElementById('exp-paid').textContent = fmt(paid);
  document.getElementById('exp-unpaid').textContent = fmt(unpaid);

  const tbody = document.getElementById('exp-tbody');
  if (fines.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#888">Không có vi phạm nào</td></tr>`;
  } else {
    tbody.innerHTML = fines.sort((a,b)=>new Date(a.date)-new Date(b.date)).map((f,i) => {
      const m = getMember(f.memberId);
      return `<tr>
        <td>${i+1}</td>
        <td>${m.name}</td>
        <td>${f.reason}</td>
        <td style="font-family:monospace;font-weight:700">${fmt(f.amount)}</td>
        <td>${new Date(f.date).toLocaleDateString('vi-VN')}</td>
        <td style="color:${f.status==='paid'?'#22c55e':'#ef4444'};font-weight:600">${f.status==='paid'?'✅ Đã đóng':'❌ Chưa đóng'}</td>
      </tr>`;
    }).join('');
  }

  // Chuyển tiền qua Zalopay (dạng chữ)
  const contentSuffix = isAll ? '' : ` T${mo}/${y}`;
  document.getElementById('bi-treasurer').textContent = s.treasurer || 'Hải Đăng';
  document.getElementById('bi-zalopay').textContent = s.zalopay || '⚠️ Chưa cài đặt (vào Cài đặt để thêm)';
  document.getElementById('bi-content').textContent = `${s.content || 'Dong tien phat'}${contentSuffix}`;
  document.getElementById('bi-total').textContent = fmt(unpaid);
}

function downloadExport() {
  const el = document.getElementById('export-preview');
  html2canvas(el, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
    const link = document.createElement('a');
    const sel = document.getElementById('export-month-select');
    link.download = `bao-cao-phat-${sel.value === 'all' ? 'tong-hop' : sel.value}.png`;
    link.href = canvas.toDataURL();
    link.click();
    toast('Đã tải xuống báo cáo!', 'success');
  }).catch(() => toast('Lỗi khi tải xuống, thử lại!', 'error'));
}

// ─── SETTINGS ────────────────────────────────
function loadSettings() {
  const s = state.settings;
  document.getElementById('setting-group').value = s.groupName || '';
  document.getElementById('setting-treasurer').value = s.treasurer || 'Hải Đăng';
  document.getElementById('setting-zalopay').value = s.zalopay || '';
  document.getElementById('setting-content').value = s.content || '';
}

async function saveSettings() {
  const body = {
    groupName: document.getElementById('setting-group').value,
    treasurer: document.getElementById('setting-treasurer').value,
    zalopay: document.getElementById('setting-zalopay').value,
    content: document.getElementById('setting-content').value,
  };
  try {
    await api('/settings', { method: 'PUT', body: JSON.stringify(body) });
    state.settings = body;
    toast('Đã lưu cài đặt!', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ─── QUẢN LÝ DỮ LIỆU (SAO LƯU / KHÔI PHỤC / XÓA) ───
async function exportData() {
  try {
    const data = await api('/backup');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    link.download = `quan-ly-phat-backup-${stamp}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    toast('Đã tải file sao lưu!', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || !Array.isArray(data.members) || !Array.isArray(data.fines)) {
        throw new Error('invalid');
      }
      if (!confirm('Khôi phục sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại. Bạn chắc chắn chứ?')) {
        event.target.value = '';
        return;
      }
      await api('/restore', { method: 'POST', body: JSON.stringify({
        members: data.members, fines: data.fines,
        spendings: data.spendings || [], settings: data.settings || {},
      }) });
      alert('Khôi phục dữ liệu thành công! Trang sẽ tải lại.');
      location.reload();
    } catch (err) {
      toast(err.message === 'invalid' ? 'File không hợp lệ, không thể khôi phục!' : err.message, 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

async function resetAllData() {
  if (!confirm('Xóa TOÀN BỘ thành viên, khoản phạt, chi tiêu và cài đặt? Hành động này KHÔNG THỂ hoàn tác.')) return;
  if (!confirm('Xác nhận lần cuối: xóa sạch mọi dữ liệu?')) return;
  try {
    await api('/restore', { method: 'POST', body: JSON.stringify({ members: [], fines: [], spendings: [], settings: {} }) });
    location.reload();
  } catch (e) { toast(e.message, 'error'); }
}

// Nhập dữ liệu từ localStorage của bản cũ (nếu trước đây bạn đã nhập liệu)
async function importFromLocalStorage() {
  const raw = localStorage.getItem('fineManagerState');
  if (!raw) return toast('Không tìm thấy dữ liệu localStorage cũ trên trình duyệt này.', 'error');
  let data;
  try { data = JSON.parse(raw); } catch (e) { return toast('Dữ liệu localStorage cũ bị hỏng.', 'error'); }
  if (!Array.isArray(data.members) || !Array.isArray(data.fines)) return toast('Dữ liệu localStorage cũ không hợp lệ.', 'error');
  if (!confirm('Nhập dữ liệu từ localStorage cũ sẽ GHI ĐÈ dữ liệu trong DB hiện tại. Tiếp tục?')) return;
  try {
    await api('/restore', { method: 'POST', body: JSON.stringify({
      members: data.members, fines: data.fines,
      spendings: data.spendings || [], settings: data.settings || {},
    }) });
    alert('Đã nhập dữ liệu từ localStorage vào DB! Trang sẽ tải lại.');
    location.reload();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── MODALS ───────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('open');
  if (id === 'fine-modal') {
    document.getElementById('fine-date').value = new Date().toISOString().split('T')[0];
    const sel = document.getElementById('fine-member');
    sel.innerHTML = '<option value="">-- Chọn thành viên --</option>' +
      state.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    document.getElementById('fine-amount-preview').textContent = '';
  }
  if (id === 'spending-modal') {
    document.getElementById('spend-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('spend-amount-preview').textContent = '';
  }
  // Tự động focus ô nhập đầu tiên
  setTimeout(() => {
    const first = modal.querySelector('.modal-body .form-control');
    if (first) first.focus();
  }, 60);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

// Phím tắt: Esc để đóng, Enter để lưu (khi đang mở modal)
document.addEventListener('keydown', e => {
  const openEl = document.querySelector('.modal-overlay.open');
  if (!openEl) return;
  if (e.key === 'Escape') {
    openEl.classList.remove('open');
  } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
    const submit = openEl.querySelector('.modal-footer .btn-primary');
    if (submit) { e.preventDefault(); submit.click(); }
  }
});

// ─── ADD FINE ─────────────────────────────────
async function addFine() {
  const memberId = parseInt(document.getElementById('fine-member').value);
  const reason = document.getElementById('fine-reason').value.trim();
  const amount = parseInt(document.getElementById('fine-amount').value);
  const date = document.getElementById('fine-date').value;
  const note = document.getElementById('fine-note').value.trim();
  const status = document.getElementById('fine-status').value;

  if (!memberId) return toast('Vui lòng chọn thành viên!', 'error');
  if (!reason) return toast('Vui lòng nhập lý do!', 'error');
  if (!amount || amount <= 0) return toast('Vui lòng nhập số tiền hợp lệ!', 'error');
  if (!date) return toast('Vui lòng chọn ngày!', 'error');

  try {
    await api('/fines', { method: 'POST', body: JSON.stringify({ memberId, reason, amount, date, note, status }) });
    closeModal('fine-modal');
    document.getElementById('fine-reason').value = '';
    document.getElementById('fine-amount').value = '';
    document.getElementById('fine-note').value = '';
    await refresh();
    toast('Đã thêm vi phạm!', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ─── ADD MEMBER ───────────────────────────────
async function addMember() {
  const name = document.getElementById('member-name').value.trim();
  const role = document.getElementById('member-role').value.trim();
  const phone = document.getElementById('member-phone').value.trim();

  if (!name) return toast('Vui lòng nhập tên thành viên!', 'error');

  const color = COLORS[state.members.length % COLORS.length];
  try {
    await api('/members', { method: 'POST', body: JSON.stringify({ name, role: role || 'Thành viên', phone, color }) });
    closeModal('member-modal');
    document.getElementById('member-name').value = '';
    document.getElementById('member-role').value = '';
    document.getElementById('member-phone').value = '';
    await refresh();
    toast(`Đã thêm ${name}!`, 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ─── TOAST ────────────────────────────────────
function toast(msg, type='success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type==='success'?'✅':'❌'}</span> ${msg}`;
  const c = document.getElementById('toast-container');
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── INIT ─────────────────────────────────────
loadState()
  .then(() => renderDashboard())
  .catch(err => {
    document.querySelector('.content').innerHTML =
      `<div class="empty-state" style="padding:64px 24px">
         <div class="icon">🔌</div>
         <h3>Không kết nối được máy chủ</h3>
         <p>Hãy chạy <b>node server.js</b> rồi mở lại <b>http://localhost:3000</b>.<br>Chi tiết: ${err.message}</p>
       </div>`;
  });
