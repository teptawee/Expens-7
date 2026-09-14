// GET helper
async function apiGet(action) {
  const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}

// POST helper
async function apiPost(action, payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    // ใช้ text/plain เลี่ยง CORS preflight กับ GAS
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload })
  });
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}

// Public API
const API = {
  getDashboard: () => apiGet('getDashboard'),
  getCategories: () => apiGet('getCategories'),
  getPayments: () => apiGet('getPayments'),
  getTransactions: () => apiGet('getTransactions'),

  addTransaction: (p) => apiPost('addTransaction', p),
  deleteTransaction: (p) => apiPost('deleteTransaction', p),

  addCategory: (p) => apiPost('addCategory', p),
  updateCategory: (p) => apiPost('updateCategory', p),
  deleteCategory: (p) => apiPost('deleteCategory', p),

  addPayment: (p) => apiPost('addPayment', p),
  updatePayment: (p) => apiPost('updatePayment', p),
  deletePayment: (p) => apiPost('deletePayment', p),

  setMonthlyBudget: (p) => apiPost('setMonthlyBudget', p)
};
