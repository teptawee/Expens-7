let CATS = [];
let PAYS = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindToggles();
  bindForms();
  await loadAll();
  document.getElementById('loading').style.display = 'none';
}

async function loadAll() {
  try {
    const data = await API.getDashboard();
    CATS = data.categories;
    PAYS = data.payments;
    document.getElementById('monthlyBudget').value = data.monthlyBudget || '';
    renderCats();
    renderPays();
  } catch (err) { showErr(err.message); }
}

function bindToggles() {
  document.getElementById('toggleAddCat').addEventListener('click', () => {
    document.getElementById('addCatForm').classList.toggle('hidden');
  });
  document.getElementById('toggleAddPay').addEventListener('click', () => {
    document.getElementById('addPayForm').classList.toggle('hidden');
  });
}

function bindForms() {
  document.getElementById('saveMonthly').addEventListener('click', async () => {
    const amt = Number(document.getElementById('monthlyBudget').value);
    const st = document.getElementById('budgetStatus');
    try {
      await API.setMonthlyBudget({ amount: amt });
      st.textContent = '✅ บันทึกแล้ว';
      st.className = 'status-msg ok';
    } catch (err) {
      st.textContent = '❌ ' + err.message;
      st.className = 'status-msg err';
    }
  });

  document.getElementById('addCatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p = {
      name: document.getElementById('catName').value.trim(),
      icon: document.getElementById('catIcon').value.trim() || '📌',
      budget: Number(document.getElementById('catBudget').value) || 0,
      color: document.getElementById('catColor').value,
      type: document.getElementById('catType').value
    };
    try {
      await API.addCategory(p);
      e.target.reset();
      document.getElementById('catIcon').value = '📌';
      document.getElementById('catColor').value = '#F8B195';
      e.target.classList.add('hidden');
      await loadAll();
    } catch (err) { alert(err.message); }
  });

  document.getElementById('addPayForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p = {
      name: document.getElementById('payName').value.trim(),
      icon: document.getElementById('payIcon').value.trim() || '💳'
    };
    try {
      await API.addPayment(p);
      e.target.reset();
      document.getElementById('payIcon').value = '💳';
      e.target.classList.add('hidden');
      await loadAll();
    } catch (err) { alert(err.message); }
  });
}

function renderCats() {
  const wrap = document.getElementById('catList');
  wrap.innerHTML = '';
  CATS.forEach(c => {
    const isInc = (c.type || 'expense') === 'income';
    const badge = isInc
      ? '<span class="type-badge income">💰 รายรับ</span>'
      : '<span class="type-badge expense">💸 รายจ่าย</span>';
    const meta = isInc
      ? 'หมวดรายรับ'
      : `วงเงิน ${formatMoney(c.budget)} / เดือน`;
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="item-icon">${c.icon}</div>
      <div class="item-info">
        <div class="item-name">${c.name} ${badge}</div>
        <div class="item-meta">${meta}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-edit" data-act="edit">แก้ไข</button>
        <button class="btn btn-danger" data-act="del">ลบ</button>
      </div>
    `;
    div.querySelector('[data-act="edit"]').onclick = () => editCategory(c);
    div.querySelector('[data-act="del"]').onclick = () => deleteCategory(c);
    wrap.appendChild(div);
  });
}

function renderPays() {
  const wrap = document.getElementById('payList');
  wrap.innerHTML = '';
  PAYS.forEach(p => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="item-icon">${p.icon}</div>
      <div class="item-info"><div class="item-name">${p.name}</div></div>
      <div class="item-actions">
        <button class="btn btn-edit" data-act="edit">แก้ไข</button>
        <button class="btn btn-danger" data-act="del">ลบ</button>
      </div>
    `;
    div.querySelector('[data-act="edit"]').onclick = () => editPayment(p);
    div.querySelector('[data-act="del"]').onclick = () => deletePayment(p);
    wrap.appendChild(div);
  });
}

async function editCategory(c) {
  const name = prompt('ชื่อหมวด', c.name);
  if (name === null) return;
  const icon = prompt('Icon (Emoji)', c.icon);
  if (icon === null) return;
  const budget = prompt('วงเงินต่อเดือน (0 ถ้าเป็นหมวดรายรับ)', c.budget);
  if (budget === null) return;
  const color = prompt('สี (Hex)', c.color);
  if (color === null) return;
  try {
    await API.updateCategory({
      originalName: c.name,
      name: name.trim() || c.name,
      icon: icon.trim() || c.icon,
      budget: Number(budget) || 0,
      color: color.trim() || c.color,
      type: c.type || 'expense'
    });
    await loadAll();
  } catch (err) { alert(err.message); }
}

async function deleteCategory(c) {
  if (!confirm(`ลบหมวด "${c.name}" ?`)) return;
  try {
    await API.deleteCategory({ name: c.name });
    await loadAll();
  } catch (err) { alert(err.message); }
}

async function editPayment(p) {
  const name = prompt('ชื่อประเภท', p.name);
  if (name === null) return;
  const icon = prompt('Icon (Emoji)', p.icon);
  if (icon === null) return;
  try {
    await API.updatePayment({
      originalName: p.name,
      name: name.trim() || p.name,
      icon: icon.trim() || p.icon
    });
    await loadAll();
  } catch (err) { alert(err.message); }
}

async function deletePayment(p) {
  if (!confirm(`ลบประเภท "${p.name}" ?`)) return;
  try {
    await API.deletePayment({ name: p.name });
    await loadAll();
  } catch (err) { alert(err.message); }
}

function showErr(msg) {
  const el = document.getElementById('errorMsg');
  el.style.display = 'block';
  el.textContent = '⚠️ ' + msg;
  document.getElementById('loading').style.display = 'none';
}
