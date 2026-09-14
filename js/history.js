/***********************
 * History Page
 * - Filter 7 วัน / 30 วัน / ทั้งหมด / custom range / หมวดหมู่
 * - Group by วัน
 * - แก้ไข / ลบ รายการ
 ***********************/

let ALL_TX = [];
let CATS = [];
let PAYS = [];
let currentFilter = { quick: 'all', from: '', to: '', category: '' };
let editingId = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindEvents();
  await loadData();
  document.getElementById('loading').style.display = 'none';
}

function bindEvents() {
  // Quick filter
  document.querySelectorAll('.h-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.h-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter.quick = btn.dataset.quick;
      applyQuickFilter();
      render();
    });
  });

  // ปุ่มค้นหา
  document.getElementById('btnSearch').addEventListener('click', () => {
    currentFilter.quick = 'custom';
    document.querySelectorAll('.h-chip').forEach(b => b.classList.remove('active'));
    currentFilter.from = document.getElementById('filterFrom').value;
    currentFilter.to = document.getElementById('filterTo').value;
    currentFilter.category = document.getElementById('filterCategory').value;
    render();
  });

  // Modal
  document.getElementById('closeEdit').addEventListener('click', closeEditModal);
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target.id === 'editModal') closeEditModal();
  });
  document.getElementById('editForm').addEventListener('submit', onEditSubmit);
}

async function loadData() {
  try {
    const data = await API.getDashboard();
    ALL_TX = data.transactions || [];
    CATS = data.categories || [];
    PAYS = data.payments || [];

    // populate หมวดหมู่ dropdown
    const catSel = document.getElementById('filterCategory');
    CATS.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.icon} ${c.name}`;
      catSel.appendChild(opt);
    });

    // populate dropdown ใน modal
    const editCat = document.getElementById('editCategory');
    CATS.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.icon} ${c.name}`;
      editCat.appendChild(opt);
    });
    const editPay = document.getElementById('editPayment');
    PAYS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = `${p.icon} ${p.name}`;
      editPay.appendChild(opt);
    });

    // default: 7 วันล่าสุด? หรือทั้งหมด
    // จากภาพ เลือก "ทั้งหมด" เป็น default
    applyQuickFilter();
    render();
  } catch (err) {
    showErr(err.message);
  }
}

function applyQuickFilter() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (currentFilter.quick === '7') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6); // รวมวันนี้ = 7 วัน
    currentFilter.from = toISO(from);
    currentFilter.to = toISO(today);
  } else if (currentFilter.quick === '30') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    currentFilter.from = toISO(from);
    currentFilter.to = toISO(today);
  } else if (currentFilter.quick === 'all') {
    currentFilter.from = '';
    currentFilter.to = '';
    currentFilter.category = '';
  }

  // sync กับ input
  document.getElementById('filterFrom').value = currentFilter.from || '';
  document.getElementById('filterTo').value = currentFilter.to || '';
  if (currentFilter.quick === 'all') {
    document.getElementById('filterCategory').value = '';
  }
}

function getFiltered() {
  let list = [...ALL_TX];

  if (currentFilter.from) {
    list = list.filter(t => t.date >= currentFilter.from);
  }
  if (currentFilter.to) {
    list = list.filter(t => t.date <= currentFilter.to);
  }
  if (currentFilter.category) {
    list = list.filter(t => t.category === currentFilter.category);
  }

  // เรียงจากใหม่ไปเก่า
  list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return 0;
  });

  return list;
}

function render() {
  const list = getFiltered();
  const wrap = document.getElementById('historyList');
  const emptyEl = document.getElementById('emptyMsg');
  const summaryEl = document.getElementById('historySummary');

  wrap.innerHTML = '';

  if (!list.length) {
    emptyEl.classList.remove('hidden');
    summaryEl.classList.add('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  summaryEl.classList.remove('hidden');

  // สรุป
  const income = sumIncome(list);
  const expense = sumExpense(list);
  const net = income - expense;
  document.getElementById('hsIncome').textContent = formatMoney(income);
  document.getElementById('hsExpense').textContent = formatMoney(expense);
  document.getElementById('hsNet').textContent = formatMoney(net);
  document.getElementById('hsNet').style.color = net < 0 ? '#A64B4B' : '#4B7A5B';
  document.getElementById('hsCount').textContent = list.length + ' รายการ';

  // Group by วัน
  const groups = {};
  list.forEach(t => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });

  const sortedDates = Object.keys(groups).sort().reverse();

  sortedDates.forEach(date => {
    const items = groups[date];
    const dayExpense = sumExpense(items);
    const dayIncome = sumIncome(items);

    const dayBlock = document.createElement('div');
    dayBlock.className = 'day-block';

    // Header ของวัน
    const header = document.createElement('div');
    header.className = 'day-header';
    header.innerHTML = `
      <div class="day-title">
        <span class="day-icon">📅</span>
        <span>${formatThaiDate(date)}</span>
      </div>
      <div class="day-total">
        ${dayIncome > 0 ? `<span class="day-total-income">+${formatMoney(dayIncome)}</span>` : ''}
        ${dayExpense > 0 ? `<span class="day-total-expense">${formatMoney(dayExpense)}</span>` : ''}
      </div>
    `;
    dayBlock.appendChild(header);

    // รายการในวันนั้น
    const listWrap = document.createElement('div');
    listWrap.className = 'day-items';

    items.forEach(t => {
      const cat = CATS.find(c => c.name === t.category);
      const pay = PAYS.find(p => p.name === t.payment_method);
      const icon = cat ? cat.icon : '📌';
      const color = cat ? cat.color : '#B8B8D1';
      const isInc = isIncome(t);

      const row = document.createElement('div');
      row.className = 'tx-row' + (isInc ? ' tx-income' : '');
      row.style.setProperty('--row-color', color);

      row.innerHTML = `
        <div class="tx-bar"></div>
        <div class="tx-icon">${icon}</div>
        <div class="tx-body">
          <div class="tx-line-1">
            <span class="tx-category">${t.category}</span>
            <span class="tx-payment">
              <span class="tx-payment-icon">${pay ? pay.icon : '💳'}</span>
              ${t.payment_method}
            </span>
          </div>
          <div class="tx-line-2">
            <span class="tx-note">${t.note || '-'}</span>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${isInc ? 'income' : 'expense'}">
            ${isInc ? '+' : ''}${formatMoney(t.amount)}
          </div>
          <div class="tx-actions">
            <button class="tx-btn tx-edit" title="แก้ไข">✏️</button>
            <button class="tx-btn tx-del" title="ลบ">🗑️</button>
          </div>
        </div>
      `;

      row.querySelector('.tx-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(t);
      });
      row.querySelector('.tx-del').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTx(t);
      });

      listWrap.appendChild(row);
    });

    dayBlock.appendChild(listWrap);
    wrap.appendChild(dayBlock);
  });
}

/* ========== Edit / Delete ========== */
function openEditModal(t) {
  editingId = t.id;
  document.getElementById('editDate').value = t.date;
  document.getElementById('editAmount').value = t.amount;
  document.getElementById('editCategory').value = t.category;
  document.getElementById('editPayment').value = t.payment_method;
  document.getElementById('editNote').value = t.note || '';
  document.getElementById('editStatus').textContent = '';
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  editingId = null;
}

async function onEditSubmit(e) {
  e.preventDefault();
  if (!editingId) return;

  const orig = ALL_TX.find(t => t.id === editingId);
  if (!orig) return;

  const payload = {
    id: editingId,
    date: document.getElementById('editDate').value,
    type: orig.type || 'expense',
    category: document.getElementById('editCategory').value,
    amount: Number(document.getElementById('editAmount').value),
    payment_method: document.getElementById('editPayment').value,
    note: document.getElementById('editNote').value.trim()
  };

  try {
    // ลบของเก่า + เพิ่มใหม่ (เพราะ backend ยังไม่มี update endpoint)
    await API.deleteTransaction({ id: editingId });
    await API.addTransaction(payload);

    closeEditModal();
    await loadData();
  } catch (err) {
    const st = document.getElementById('editStatus');
    st.textContent = '❌ ' + err.message;
    st.className = 'status-msg err';
  }
}

async function deleteTx(t) {
  if (!confirm(`ลบรายการ "${t.category} ${formatMoney(t.amount)}" ?`)) return;
  try {
    await API.deleteTransaction({ id: t.id });
    await loadData();
  } catch (err) {
    alert('ลบไม่สำเร็จ: ' + err.message);
  }
}

/* ========== Utils ========== */
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatThaiDate(iso) {
  // 2026-09-13 → วันอาทิตย์ที่ 13 กันยายน 2569
  const TH_DAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  const TH_MONTHS_FULL = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
  ];
  const d = new Date(iso + 'T00:00:00');
  const day = TH_DAYS[d.getDay()];
  const date = d.getDate();
  const month = TH_MONTHS_FULL[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `วัน${day}ที่ ${date} ${month} ${year}`;
}

function showErr(msg) {
  document.getElementById('loading').style.display = 'none';
  const el = document.getElementById('errorMsg');
  el.style.display = 'block';
  el.textContent = '⚠️ ' + msg;
}
