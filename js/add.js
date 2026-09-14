let CATS = [];
let PAYS = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('date').value = todayISO();
  try {
    const data = await API.getDashboard();
    CATS = data.categories;
    PAYS = data.payments;
    renderCategorySelect();
    renderPaymentChips();
    renderCategoryChips();
  } catch (err) {
    alert('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
  }
  document.getElementById('txForm').addEventListener('submit', onSubmit);
}

function renderCategorySelect() {
  const sel = document.getElementById('category');
  sel.innerHTML = '<option value="">-- เลือกหมวดหมู่ --</option>';
  CATS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = `${c.icon} ${c.name}`;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    document.querySelectorAll('#categoryChips .chip')
      .forEach(ch => ch.classList.toggle('selected', ch.dataset.value === sel.value));
  });
}

function renderCategoryChips() {
  const wrap = document.getElementById('categoryChips');
  wrap.innerHTML = '';
  CATS.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.value = c.name;
    chip.textContent = `${c.icon} ${c.name}`;
    chip.addEventListener('click', () => {
      document.querySelectorAll('#categoryChips .chip').forEach(x => x.classList.remove('selected'));
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
    chip.dataset.value = p.name;
    chip.textContent = `${p.icon} ${p.name}`;
    chip.addEventListener('click', () => {
      document.querySelectorAll('#paymentChips .chip').forEach(x => x.classList.remove('selected'));
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
    note: document.getElementById('note').value.trim()
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
