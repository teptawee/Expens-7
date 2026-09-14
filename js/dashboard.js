let charts = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const data = await API.getDashboard();
    renderSummary(data);
    renderCharts(data);
    renderRecent(data.transactions);
    document.getElementById('loading').style.display = 'none';
  } catch (err) {
    showError('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
  }
  bindFab();
}

window.refreshDashboard = init;

function renderSummary(data) {
  const now = new Date();
  const ym = { y: now.getFullYear(), m: now.getMonth() };
  document.getElementById('monthLabel').textContent =
    `${TH_MONTHS[ym.m]} ${ym.y + 543}`;

  const monthTx = data.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === ym.y && d.getMonth() === ym.m;
  });
  const monthIncome = sumIncome(monthTx);
  const monthExpense = sumExpense(monthTx);
  const netBalance = monthIncome - monthExpense;

  const budget = data.monthlyBudget || 0;
  const remaining = budget - monthExpense;
  const pct = budget > 0 ? Math.min(100, (monthExpense / budget) * 100) : 0;

  document.getElementById('totalIncome').textContent = formatMoney(monthIncome);
  document.getElementById('totalSpent').textContent = formatMoney(monthExpense);
  document.getElementById('totalBalance').textContent = formatMoney(netBalance);
  document.getElementById('totalBalance').style.color =
    netBalance < 0 ? '#A64B4B' : '#4B7A5B';
  document.getElementById('totalRemaining').textContent = formatMoney(remaining);
  document.getElementById('totalRemaining').style.color =
    remaining < 0 ? '#A64B4B' : 'inherit';

  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = pct.toFixed(0) + '%';

  const today = todayISO();
  const startWeek = getStartOfWeek(now);
  const startMonth = new Date(ym.y, ym.m, 1);
  const startYear = new Date(ym.y, 0, 1);

  document.getElementById('sumToday').textContent =
    formatMoney(sumExpense(data.transactions.filter(t => t.date === today)));
  document.getElementById('sumWeek').textContent =
    formatMoney(sumExpense(data.transactions.filter(t => new Date(t.date) >= startWeek)));
  document.getElementById('sumMonth').textContent = formatMoney(monthExpense);
  document.getElementById('sumYear').textContent =
    formatMoney(sumExpense(data.transactions.filter(t => new Date(t.date) >= startYear)));
}

function renderCharts(data) {
  const now = new Date();
  const monthTx = data.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  // 1. หมวดรายจ่าย
  const catMap = {};
  monthTx.filter(isExpense).forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const catNames = Object.keys(catMap);
  const catColors = catNames.map(n => {
    const c = data.categories.find(x => x.name === n);
    return c ? c.color : '#B8B8D1';
  });
  const catLabels = catNames.map(n => {
    const c = data.categories.find(x => x.name === n);
    return (c ? c.icon + ' ' : '') + n;
  });
  drawDoughnut('chartCategory', catLabels, Object.values(catMap), catColors);

  // 2. ประเภทการชำระ
  const payMap = {};
  monthTx.filter(isExpense).forEach(t => {
    payMap[t.payment_method] = (payMap[t.payment_method] || 0) + t.amount;
  });
  const payNames = Object.keys(payMap);
  const payLabels = payNames.map(n => {
    const p = data.payments.find(x => x.name === n);
    return (p ? p.icon + ' ' : '') + n;
  });
  const payPalette = ['#F8B195','#C8A2C8','#A7C7E7','#A8D8B9','#FECEAB','#F5A6A6'];
  drawDoughnut('chartPayment', payLabels, Object.values(payMap),
    payNames.map((_, i) => payPalette[i % payPalette.length]));

  // 3. แหล่งรายรับ
  const incMap = {};
  monthTx.filter(isIncome).forEach(t => {
    incMap[t.category] = (incMap[t.category] || 0) + t.amount;
  });
  const incNames = Object.keys(incMap);
  const incLabels = incNames.map(n => {
    const c = data.categories.find(x => x.name === n);
    return (c ? c.icon + ' ' : '') + n;
  });
  const incColors = incNames.map(n => {
    const c = data.categories.find(x => x.name === n);
    return c ? c.color : '#A8D8B9';
  });
  drawDoughnut('chartIncome', incLabels, Object.values(incMap), incColors);

  // 4. รายรับ vs รายจ่าย
  drawBar('chartInOut',
    ['รายรับ', 'รายจ่าย'],
    [sumIncome(monthTx), sumExpense(monthTx)],
    ['#A8D8B9', '#F5A6A6'],
    { currency: true });

  // 5. Trend 6 เดือน
  if (data.trend && data.trend.length) renderTrendChart(data.trend);

  // 6. เปรียบเทียบ วัน/สัปดาห์/เดือน/ปี
  const startWeek = getStartOfWeek(now);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startYear = new Date(now.getFullYear(), 0, 1);

  const compareData = [
    sumExpense(data.transactions.filter(t => t.date === todayISO())),
    sumExpense(data.transactions.filter(t => new Date(t.date) >= startWeek)),
    sumExpense(data.transactions.filter(t => new Date(t.date) >= startMonth)),
    sumExpense(data.transactions.filter(t => new Date(t.date) >= startYear))
  ];

  drawBar('chartCompare',
    ['วันนี้','สัปดาห์นี้','เดือนนี้','ปีนี้'],
    compareData,
    ['#F8B195','#C8A2C8','#A7C7E7','#A8D8B9'],
    { currency: true });

  // 7. วงเงินคงเหลือ
  const expenseCats = data.categories.filter(c => (c.type || 'expense') === 'expense');
  const catBudget = expenseCats.map(c => {
    const spent = monthTx
      .filter(t => isExpense(t) && t.category === c.name)
      .reduce((s, t) => s + t.amount, 0);
    const pct = c.budget > 0 ? Math.max(0, ((c.budget - spent) / c.budget) * 100) : 0;
    return { name: c.name, icon: c.icon, color: c.color, pct, spent, budget: c.budget };
  });
  drawHorizontalBar('chartRemaining',
    catBudget.map(c => c.icon + ' ' + c.name),
    catBudget.map(c => c.pct),
    catBudget.map(c => c.color));
  charts.catBudget = catBudget;
}

function renderTrendChart(trend) {
  if (charts.chartTrend) charts.chartTrend.destroy();
  const ctx = document.getElementById('chartTrend');
  if (!ctx) return;

  charts.chartTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.map(m => m.label),
      datasets: [
        {
          label: 'รายรับ',
          data: trend.map(m => m.income),
          borderColor: '#7BB88E',
          backgroundColor: 'rgba(168,216,185,0.25)',
          borderWidth: 3, tension: 0.4, fill: true,
          pointBackgroundColor: '#7BB88E', pointRadius: 5, pointHoverRadius: 7
        },
        {
          label: 'รายจ่าย',
          data: trend.map(m => m.expense),
          borderColor: '#E38585',
          backgroundColor: 'rgba(245,166,166,0.2)',
          borderWidth: 3, tension: 0.4, fill: true,
          pointBackgroundColor: '#E38585', pointRadius: 5, pointHoverRadius: 7
        },
        {
          label: 'สุทธิ',
          data: trend.map(m => m.income - m.expense),
          borderColor: '#A98BC7',
          backgroundColor: 'transparent',
          borderWidth: 2, borderDash: [6, 4], tension: 0.4,
          pointBackgroundColor: '#A98BC7', pointRadius: 4, pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => ` ${c.dataset.label}: ${formatMoney(c.parsed.y)}` }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.5)' },
          ticks: { font: { family: 'Prompt' }, callback: (v) => formatMoney(v) }
        },
        x: { grid: { display: false }, ticks: { font: { family: 'Prompt' } } }
      }
    }
  });
}

function drawDoughnut(id, labels, values, colors) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx || !values.length) { charts[id] = { destroy() {} }; return; }
  charts[id] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: 'rgba(255,255,255,0.7)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Prompt' }, padding: 12 } },
        tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + formatMoney(c.parsed) } }
      }
    }
  });
}

function drawBar(id, labels, values, colors, opts = {}) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 10, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: opts.currency
          ? { callbacks: { label: (c) => ' ' + formatMoney(c.parsed.y) } }
          : {}
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.5)' },
          ticks: {
            font: { family: 'Prompt' },
            callback: opts.currency ? (v) => formatMoney(v) : undefined
          }
        },
        x: { grid: { display: false }, ticks: { font: { family: 'Prompt' } } }
      }
    }
  });
}

function drawHorizontalBar(id, labels, values, colors) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 8, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const info = charts.catBudget?.[c.dataIndex];
              if (!info) return ' ' + c.parsed.x.toFixed(1) + '%';
              return [
                ` คงเหลือ ${c.parsed.x.toFixed(1)}%`,
                ` ใช้ไป ${formatMoney(info.spent)} / ${formatMoney(info.budget)}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true, max: 100,
          grid: { color: 'rgba(255,255,255,0.5)' },
          ticks: { font: { family: 'Prompt' }, callback: (v) => v + '%' }
        },
        y: { grid: { display: false }, ticks: { font: { family: 'Prompt' } } }
      }
    }
  });
}

function renderRecent(transactions) {
  const tbody = document.querySelector('#recentTable tbody');
  tbody.innerHTML = '';
  const recent = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#7A7286;">ยังไม่มีรายการ</td></tr>';
    return;
  }
  recent.forEach(t => {
    const tr = document.createElement('tr');
    const typeLabel = isIncome(t)
      ? '<span style="color:#4B7A5B;">💰 รายรับ</span>'
      : '<span style="color:#A64B4B;">💸 รายจ่าย</span>';
    const amountColor = isIncome(t) ? '#4B7A5B' : '#A64B4B';
    const sign = isIncome(t) ? '+' : '−';
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${typeLabel}</td>
      <td>${t.category}</td>
      <td style="color:${amountColor};font-weight:600;">${sign}${formatMoney(t.amount)}</td>
      <td>${t.payment_method}</td>
      <td>${t.note || '-'}</td>
      <td><button class="btn btn-danger" data-id="${t.id}">ลบ</button></td>
    `;
    tr.querySelector('button').addEventListener('click', async () => {
      if (!confirm('ลบรายการนี้?')) return;
      try {
        await API.deleteTransaction({ id: t.id });
        init();
      } catch (err) { alert('ลบไม่สำเร็จ: ' + err.message); }
    });
    tbody.appendChild(tr);
  });
}

function bindFab() {
  const fab = document.getElementById('fabToggle');
  if (!fab) return;
  fab.addEventListener('click', () => fab.classList.toggle('open'));
  fab.querySelectorAll('.fab-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      fab.classList.remove('open');
      QuickAdd.open(item.dataset.type);
    });
  });
  document.addEventListener('click', (e) => {
    if (!fab.contains(e.target)) fab.classList.remove('open');
  });
}

function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}

function showError(msg) {
  document.getElementById('loading').style.display = 'none';
  const el = document.getElementById('errorMsg');
  el.style.display = 'block';
  el.textContent = '⚠️ ' + msg;
}
