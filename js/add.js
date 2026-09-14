let CATS = [];
let PAYS = [];
let mode = 'expense';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('date').value = todayISO();
  try {
    const data = await API.getDashboard();
    CATS = data.categories;
    PAYS = data.payments;
    renderCategoryChips();
    renderPaymentChips();
  } catch (err) {
    alert('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
  }

  document.querySelectorAll('#modeToggle .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      document.querySelectorAll('#modeToggle .mode-btn').forEach(b =>
        b.classList.toggle('active', b === btn));
      document.getElementById('category').value = '';
      renderCategoryChips();
    });
  });

  document.getElementById('txForm').addEventListener('submit', onSubmit);
}

function renderCategoryChips() {
  const wrap = document.getElementById('categoryChips');
  wrap.innerHTML = '';
  const list = CATS.filter(c => (c.type || 'expense') === mode);
  if (!list.length) {
    wrap.innerHTML = '<div style="color:#7A7286;font-size:.85rem;">ยังไม่มีหมวด</div>';
    return;
  }
  list.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = `${c.icon} ${c.name}`;
    chip.addEventListener('click', () => {
      wrap.querySelectorAll('.chip').forEach(x => x.classList.remove('selected'));
      chip.classList.add('selected');
      document.getElementById('category').value = c.name;
    });
    wrap.appendChild(chip);
  });
}

function renderPaymentChips() {
  const wrap = document.getElementById('paymentChips');
  wrap.innerHTML = '';
  PAYS.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = `${p.icon} ${p.name}`;
    chip.addEventListener('click', () => {
      wrap.querySelectorAll('.chip').forEach(x => x.classList.remove('selected'));
      chip.classList.add('selected');
      document.getElementById('payment').value = p.name;
    });
    wrap.appendChild(chip);
  });
}

async function onSubmit(e) {
  e.preventDefault();
  const status = document.getElementById('formStatus');
  status.className = 'status-msg';

  const payload = {
    date: document.getElementById('date').value,
    amount: Number(document.getElementById('amount').value),
    category: document.getElementById('category').value,
    payment_method: document.getElementById('payment').value,
    note: document.getElementById('note').value.trim(),
    type: mode
  };

  if (!payload.category) return setStatus('กรุณาเลือกหมวดหมู่', 'err');
  if (!payload.payment_method) return setStatus('กรุณาเลือกประเภทการชำระ', 'err');
  if (!payload.amount || payload.amount <= 0) return setStatus('กรุณากรอกจำนวนเงิน', 'err');

  try {
    setStatus('⏳ กำลังบันทึก...', '');
    await API.addTransaction(payload);
    setStatus('✅ บันทึกสำเร็จ! กำลังกลับ Dashboard...', 'ok');
    setTimeout(() => location.href = 'index.html', 1000);
  } catch (err) {
    setStatus('❌ ' + err.message, 'err');
  }
}

function setStatus(msg, cls) {
  const el = document.getElementById('formStatus');
  el.textContent = msg;
  el.className = 'status-msg ' + cls;
}
