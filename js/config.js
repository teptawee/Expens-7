// ⚠️ ใส่ URL ของ Google Apps Script Web App ที่ deploy แล้วตรงนี้
const API_URL = "https://script.google.com/macros/s/AKfycby5qo5_n8q_fBf8k-jSPOgrWqtQr-_8msxKn50QnIuOAK034BMcdnDoQgSrc3HQ7Hplnw/exec";

const THB = new Intl.NumberFormat('th-TH', {
  style: 'currency', currency: 'THB', maximumFractionDigits: 0
});

const TH_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

function formatMoney(n) { return THB.format(Number(n) || 0); }

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isIncome(t) { return t.type === 'income'; }
function isExpense(t) { return !t.type || t.type === 'expense'; }

function sumExpense(arr) { return arr.filter(isExpense).reduce((s, t) => s + Number(t.amount), 0); }
function sumIncome(arr) { return arr.filter(isIncome).reduce((s, t) => s + Number(t.amount), 0); }
