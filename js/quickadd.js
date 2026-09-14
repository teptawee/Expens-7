/***********************
 * Quick Add Modal
 * ใช้งาน: QuickAdd.open('expense' | 'income')
 ***********************/

const QuickAdd = (() => {
  let CATS = [];
  let PAYS = [];
  let modalEl, formEl, statusEl, mode = 'expense';

  async function ensureLoaded() {
    if (CATS.length && PAYS.length) return;
    const data = await API.getDashboard();
    CATS = data.categories;
    PAYS = data.payments;
  }

  function build() {
    if (modalEl) return;
    modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay hidden';
    modalEl.id = 'quickAddModal';
    modalEl.innerHTML = `
      <div class="modal-box">
        <div class="modal-head">
          <h3 id="qaTitle">➕ บันทึกรายจ่าย</h3>
          <button class="modal-close" type="button" aria-label="ปิด">✕</button>
        </div>
        <div class="mode-toggle">
          <button class="mode-btn" data-mode="expense" type="button">💸 รายจ่าย</button>
          <button class="mode-btn" data-mode="income" type="button">💰 รายรับ</button>
        </div>
        <form id="qaForm" class="form-grid">
          <div class="form-group">
            <label>📅 วันที่</label>
            <input type="date" id="qaDate" required>
          </div>
          <div class="form-group">
            <label>💵 จำนวนเงิน</label>
            <input type="number" id="qaAmount" min="0" step="0.01" placeholder="0.00" required>
          </div>
          <div class="form-group full">
            <label>🏷️ หมวดหมู่</label>
            <div class="chips" id="qaCatChips"></div>
            <input type="hidden" id="qaCategory">
          </div>
          <div class="form-group full">
            <label>💳 ประเภทการชำระ</label>
            <div class="chips" id="qaPayChips"></div>
            <input type="hidden" id="qaPayment">
          </div>
          <div class="form-group full">
            <label>📝 หมายเหตุ</label>
            <input type="text" id="qaNote" placeholder="ไม่บังคับ">
          </div>
          <div class="form-group full">
            <button type="submit" class="btn btn-primary">💾 บันทึก</button>
          </div>
        </form>
        <div id="qaStatus" class="status-msg"></div>
      </div>
    `;
    document.body.appendChild(modalEl);

    formEl = modalEl.querySelector('#qaForm');
    statusEl = modalEl.querySelector('#qaStatus');

    modalEl.querySelector('.modal-close').addEventListener('click', close);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modalEl.classList.contains('hidden')) close();
    });

    modalEl.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    formEl.addEventListener('submit', onSubmit);
  }

  function setMode(m) {
    mode = m;
    modalEl.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === m);
    });
    const title = modalEl.querySelector('#qaTitle');
    title.textContent = m === 'income' ? '💰 บันทึกรายรับ' : '➕ บันทึกรายจ่าย';
    document.getElementById('qaCategory').value = '';
    document.getElementById('qaPayment').value = '';
    renderCatChips();
    renderPayChips();
  }

  function renderCatChips() {
    const wrap = document.getElementById('qaCatChips');
    wrap.innerHTML = '';
    const list = CATS.filter(c => (c.type || 'expense') === mode);
    if (!list.length) {
      wrap.innerHTML = '<div style="color:#7A7286;font-size:.85rem;">ยังไม่มีหมวดในหมวดนี้</div>';
      return;
    }
    list.forEach(c => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.dataset.value = c.name;
      chip.textContent = `${c.icon} ${c.name}`;
      chip.addEventListener('click', () => {
        wrap.querySelectorAll('.chip').forEach(x => x.classList.remove('selected'));
        chip.classList.add('selected');
        document.getElementById('qaCategory').value = c.name;
      });
      wrap.appendChild(chip);
    });
  }

  function renderPayChips() {
    const wrap = document.getElementById('qaPayChips');
    wrap.innerHTML = '';
    PAYS.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.dataset.value = p.name;
      chip.textContent = `${p.icon} ${p.name}`;
      chip.addEventListener('click', () => {
        wrap.querySelectorAll('.chip').forEach(x => x.classList.remove('selected'));
        chip.classList.add('selected');
        document.getElementById('qaPayment').value = p.name;
      });
      wrap.appendChild(chip);
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const payload = {
      date: document.getElementById('qaDate').value,
      amount: Number(document.getElementById('qaAmount').value),
      category: document.getElementById('qaCategory').value,
      payment_method: document.getElementById('qaPayment').value,
      note: document.getElementById('qaNote').value.trim(),
      type: mode
    };
    if (!payload.category) return setStatus('กรุณาเลือกหมวดหมู่', 'err');
    if (!payload.payment_method) return setStatus('กรุณาเลือกประเภทการชำระ', 'err');
    if (!payload.amount || payload.amount <= 0) return setStatus('กรุณากรอกจำนวนเงิน', 'err');

    try {
      setStatus('⏳ กำลังบันทึก...', '');
      await API.addTransaction(payload);
      setStatus('✅ บันทึกสำเร็จ', 'ok');
      setTimeout(() => {
        close();
        if (typeof window.refreshDashboard === 'function') window.refreshDashboard();
      }, 700);
    } catch (err) {
      setStatus('❌ ' + err.message, 'err');
    }
  }

  function setStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = 'status-msg ' + cls;
  }

  async function open(initialMode = 'expense') {
    build();
    try {
      await ensureLoaded();
    } catch (err) {
      alert('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
      return;
    }
    document.getElementById('qaDate').value = todayISO();
    document.getElementById('qaAmount').value = '';
    document.getElementById('qaNote').value = '';
    setStatus('', '');
    setMode(initialMode);
    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('qaAmount').focus(), 100);
  }

  function close() {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    document.body.style.overflow = '';
  }

  return { open, close };
})();
