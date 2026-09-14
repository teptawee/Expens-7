async function apiGet(action) {
  const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Response ไม่ใช่ JSON: ' + text.slice(0, 200)); }
  if (data && data.error) throw new Error(data.error);
  return data;
}

async function apiPost(action, payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Response ไม่ใช่ JSON: ' + text.slice(0, 200)); }
  if (data && data.error) throw new Error(data.error);
  return data;
}

const API = {
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

  // 🆕 Goals
  getGoals: () => apiGet('getGoals'),
  addGoal: (p) => apiPost('addGoal', p),
  updateGoal: (p) => apiPost('updateGoal', p),
  deleteGoal: (p) => apiPost('deleteGoal', p),
  depositGoal: (p) => apiPost('depositGoal', p),
  withdrawGoal: (p) => apiPost('withdrawGoal', p),

  // 🆕 Recurring
  getRecurring: () => apiGet('getRecurring'),
  addRecurring: (p) => apiPost('addRecurring', p),
  updateRecurring: (p) => apiPost('updateRecurring', p),
  deleteRecurring: (p) => apiPost('deleteRecurring', p),
  toggleRecurring: (p) => apiPost('toggleRecurring', p),
  runRecurringNow: () => apiPost('runRecurringNow', {})
};async function apiGet(action) {
  const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Response ไม่ใช่ JSON: ' + text.slice(0, 200)); }
  if (data && data.error) throw new Error(data.error);
  return data;
}

async function apiPost(action, payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Response ไม่ใช่ JSON: ' + text.slice(0, 200)); }
  if (data && data.error) throw new Error(data.error);
  return data;
}

const API = {
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

  // 🆕 Goals
  getGoals: () => apiGet('getGoals'),
  addGoal: (p) => apiPost('addGoal', p),
  updateGoal: (p) => apiPost('updateGoal', p),
  deleteGoal: (p) => apiPost('deleteGoal', p),
  depositGoal: (p) => apiPost('depositGoal', p),
  withdrawGoal: (p) => apiPost('withdrawGoal', p),

  // 🆕 Recurring
  getRecurring: () => apiGet('getRecurring'),
  addRecurring: (p) => apiPost('addRecurring', p),
  updateRecurring: (p) => apiPost('updateRecurring', p),
  deleteRecurring: (p) => apiPost('deleteRecurring', p),
  toggleRecurring: (p) => apiPost('toggleRecurring', p),
  runRecurringNow: () => apiPost('runRecurringNow', {})
};
