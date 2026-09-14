/***********************
 * API Client — Money Tracker v3
 * ใช้ window.API เพื่อกัน "Identifier 'API' has already been declared"
 ***********************/

/* ตรวจว่า config.js โหลดก่อน */
if (typeof API_URL === 'undefined') {
  console.error('[api.js] ❌ ไม่พบ API_URL — กรุณาโหลด config.js ก่อน api.js');
  throw new Error('API_URL is not defined. Load js/config.js before js/api.js');
}

/* ตรวจว่าโหลดซ้ำหรือไม่ */
if (window.__API_LOADED__) {
  console.warn('[api.js] ⚠️ ไฟล์นี้ถูกโหลดซ้ำ — ข้ามการประกาศซ้ำ');
} else {
  window.__API_LOADED__ = true;

  async function apiGet(action) {
    const url = `${API_URL}?action=${encodeURIComponent(action)}&_t=${Date.now()}`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('Response ไม่ใช่ JSON: ' + text.slice(0, 200)); }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  async function apiPost(action, payload) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload: payload || {} }),
      redirect: 'follow'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('Response ไม่ใช่ JSON: ' + text.slice(0, 200)); }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  window.API = {
    getDashboard: () => apiGet('getDashboard'),
    getCategories: () => apiGet('getCategories'),
    getPayments: () => apiGet('getPayments'),
    getTransactions: () => apiGet('getTransactions'),

    addTransaction: (p) => apiPost('addTransaction', p),
    addIncome: (p) => apiPost('addTransaction', { ...p, type: 'income' }),
    addExpense: (p) => apiPost('addTransaction', { ...p, type: 'expense' }),
    deleteTransaction: (p) => apiPost('deleteTransaction', p),

    addCategory: (p) => apiPost('addCategory', p),
    updateCategory: (p) => apiPost('updateCategory', p),
    deleteCategory: (p) => apiPost('deleteCategory', p),

    addPayment: (p) => apiPost('addPayment', p),
    updatePayment: (p) => apiPost('updatePayment', p),
    deletePayment: (p) => apiPost('deletePayment', p),

    setMonthlyBudget: (p) => apiPost('setMonthlyBudget', p),

    getGoals: () => apiGet('getGoals'),
    addGoal: (p) => apiPost('addGoal', p),
    updateGoal: (p) => apiPost('updateGoal', p),
    deleteGoal: (p) => apiPost('deleteGoal', p),
    depositGoal: (p) => apiPost('depositGoal', p),
    withdrawGoal: (p) => apiPost('withdrawGoal', p),

    getRecurring: () => apiGet('getRecurring'),
    addRecurring: (p) => apiPost('addRecurring', p),
    updateRecurring: (p) => apiPost('updateRecurring', p),
    deleteRecurring: (p) => apiPost('deleteRecurring', p),
    toggleRecurring: (p) => apiPost('toggleRecurring', p),
    runRecurringNow: () => apiPost('runRecurringNow', {}),

    ping: () => apiGet('ping')
  };

  console.log('[api.js] ✅ โหลดสำเร็จ —', Object.keys(window.API).length, 'methods');
}
