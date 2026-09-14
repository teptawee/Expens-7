let GOALS = [];
let currentGoalId = null;
let depositMode = 'deposit';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindEvents();
  await loadGoals();
  document.getElementById('loading').style.display = 'none';
}

function bindEvents() {
  document.getElementById('toggleAddGoal').addEventListener('click', () => {
    document.getElementById('addGoalCard').classList.toggle('hidden');
  });
  document.getElementById('cancelAddGoal').addEventListener('click', () => {
    document.getElementById('addGoalCard').classList.add('hidden');
  });
  document.getElementById('addGoalForm').addEventListener('submit', onAddGoal);

  document.getElementById('closeDeposit').addEventListener('click', closeDeposit);
  document.getElementById('depositModal').addEventListener('click', (e) => {
    if (e.target.id === 'depositModal') closeDeposit();
  });
  document.getElementById('depositForm').addEventListener('submit', onDeposit);
}

async function loadGoals() {
  try {
    GOALS = await API.getGoals();
    renderGoals();
    renderSummary();
  } catch (err) { showErr(err.message); }
}

function renderSummary() {
  const total = GOALS.length;
  const saved = GOALS.reduce((s, g) => s + g.saved, 0);
  const target = GOALS.reduce((s, g) => s + g.target, 0);
  const complete = GOALS.filter(g => g.saved >= g.target && g.target > 0).length;

  document.getElementById('statTotalGoals').textContent = total + ' เป้าหมาย';
  document.getElementById('statSaved').textContent = formatMoney(saved);
  document.getElementById('statTarget').textContent = formatMoney(target);
  document.getElementById('statComplete').textContent = complete + ' รายการ';
}

function renderGoals() {
  const wrap = document.getElementById('goalList');
  wrap.innerHTML = '';
  if (!GOALS.length) {
    wrap.innerHTML = `<div class="card" style="text-align:center;color:#7A7286;">
      ยังไม่มีเป้าหมาย กด "➕ เพิ่มเป้าหมาย" เพื่อเริ่มต้น</div>`;
    return;
  }

  GOALS.forEach(g => {
    const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
    const done = g.saved >= g.target && g.target > 0;
    const remaining = Math.max(0, g.target - g.saved);

    let deadlineInfo = '';
    if (g.deadline) {
      const d = new Date(g.deadline);
      const now = new Date();
      const days = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      if (days > 0) deadlineInfo = `เหลือ ${days} วัน`;
      else if (days === 0) deadlineInfo = 'ครบกำหนดวันนี้';
      else deadlineInfo = `เลยกำหนด ${-days} วัน`;
    }

    const card = document.createElement('div');
    card.className = 'card goal-card';
    card.innerHTML = `
      ${done ? '<span class="goal-complete">✅ สำเร็จ</span>' : ''}
      <div class="goal-emoji">${g.icon}</div>
      <div class="goal-name">${g.name}</div>
      <div class="goal-amounts">
        <span>ออมแล้ว <b style="color:${g.color};">${formatMoney(g.saved)}</b></span>
        <span>เป้า ${formatMoney(g.target)}</span>
      </div>
      <div class="goal-progress">
        <div class="goal-progress-fill"
             style="width:${pct}%;background:linear-gradient(90deg,${g.color},${g.color}cc);"></div>
      </div>
      <div class="goal-meta">
        <span class="goal-pct" style="color:${g.color};">${pct.toFixed(0)}%</span>
        <span>${done ? '🎉 บรรลุเป้าหมาย' : 'ขาดอีก ' + formatMoney(remaining)}</span>
      </div>
      ${deadlineInfo ? `<div class="goal-meta" style="margin-top:.4rem;">
        <span>📅 ${g.deadline}</span><span>${deadlineInfo}</span></div>` : ''}
      <div class="goal-actions">
        <button class="btn btn-primary" data-act="deposit">💰 ฝาก</button>
        <button class="btn btn-soft" data-act="withdraw">💸 ถอน</button>
        <button class="btn btn-edit" data-act="edit">✏️ แก้ไข</button>
        <button class="btn btn-danger" data-act="del">🗑️ ลบ</button>
      </div>
    `;
    card.querySelector('[data-act="deposit"]').onclick = () => openDeposit(g.id, 'deposit');
    card.querySelector('[data-act="withdraw"]').onclick = () => openDeposit(g.id, 'withdraw');
    card.querySelector('[data-act="edit"]').onclick = () => editGoal(g);
    card.querySelector('[data-act="del"]').onclick = () => deleteGoal(g);
    wrap.appendChild(card);
  });
}

async function onAddGoal(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('goalName').value.trim(),
    icon: document.getElementById('goalIcon').value.trim() || '🎯',
    target: Number(document.getElementById('goalTarget').value),
    saved: Number(document.getElementById('goalSaved').value) || 0,
    deadline: document.getElementById('goalDeadline').value || '',
    color: document.getElementById('goalColor').value
  };
  try {
    await API.addGoal(payload);
    e.target.reset();
    document.getElementById('goalIcon').value = '🎯';
    document.getElementById('goalColor').value = '#A8D8B9';
    document.getElementById('addGoalCard').classList.add('hidden');
    await loadGoals();
  } catch (err) {
    const st = document.getElementById('goalFormStatus');
    st.textContent = '❌ ' + err.message;
    st.className = 'status-msg err';
  }
}

function openDeposit(id, mode) {
  currentGoalId = id;
  depositMode = mode;
  const g = GOALS.find(x => x.id === id);
  document.getElementById('depositTitle').textContent =
    mode === 'deposit' ? `💰 ฝากเข้า� "${g.name}"` : `💸 ถอนจาก "${g.name}"`;
  document.getElementById('depositSubmit').textContent =
    mode === 'deposit' ? '💾 ฝากเงิน' : '💾 ถอนเงิน';
  document.getElementById('depositAmount').value = '';
  document.getElementById('depositModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('depositAmount').focus(), 100);
}

function closeDeposit() {
  document.getElementById('depositModal').classList.add('hidden');
  currentGoalId = null;
}

async function onDeposit(e) {
  e.preventDefault();
  const amount = Number(document.getElementById('depositAmount').value);
  if (!amount || amount <= 0) return;
  try {
    if (depositMode === 'deposit') {
      await API.depositGoal({ id: currentGoalId, amount });
    } else {
      await API.withdrawGoal({ id: currentGoalId, amount });
    }
    closeDeposit();
    await loadGoals();
  } catch (err) {
    const st = document.getElementById('depositStatus');
    st.textContent = '❌ ' + err.message;
    st.className = 'status-msg err';
  }
}

async function editGoal(g) {
  const name = prompt('ชื่อเป้าหมาย', g.name);
  if (name === null) return;
  const icon = prompt('Icon (Emoji)', g.icon);
  if (icon === null) return;
  const target = prompt('เป้าหมาย (บาท)', g.target);
  if (target === null) return;
  const saved = prompt('ออมแล้ว (บาท)', g.saved);
  if (saved === null) return;
  const deadline = prompt('กำหนดเสร็จ (YYYY-MM-DD, ว่างได้)', g.deadline);
  if (deadline === null) return;
  const color = prompt('สี (Hex)', g.color);
  if (color === null) return;
  try {
    await API.updateGoal({
      id: g.id,
      name: name.trim() || g.name,
      icon: icon.trim() || g.icon,
      target: Number(target) || g.target,
      saved: Number(saved) || 0,
      deadline: deadline.trim() || '',
      color: color.trim() || g.color
    });
    await loadGoals();
  } catch (err) { alert(err.message); }
}

async function deleteGoal(g) {
  if (!confirm(`ลบเป้าหมาย "${g.name}" ?`)) return;
  try {
    await API.deleteGoal({ id: g.id });
    await loadGoals();
  } catch (err) { alert(err.message); }
}

function showErr(msg) {
  const el = document.getElementById('errorMsg');
  el.style.display = 'block';
  el.textContent = '⚠️ ' + msg;
  document.getElementById('loading').style.display = 'none';
}
