let charts = {};
let currentWalletFilter = 'all';
let walletData = [];

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
  bindWalletFilters();
}

window.refreshDashboard = init;

/* ===== สรุปยอด ===== */
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

/* ===== เรนเดอร์กราฟทั้งหมด ===== */
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

  // 6. เปรียบเทียบ
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

  // 7. 🎯 Wallet Status (แทนที่ chartRemaining)
  renderWalletStatus(data, monthTx);

  // 8. Heatmap
  if (data.heatmap) renderHeatmap(data.heatmap);

  // 9. Top 5
  if (data.topCategories) renderTop5(data.topCategories);

  // 10. Month comparison
  if (data.monthComparison) renderMonthComparison(data.monthComparison);

  // 11. Sankey
  if (data.sankey) renderSankey(data.sankey);
}

/* =========================================================
 * 🎯 WALLET STATUS — สถานะวงเงินคงเหลือ
 * ========================================================= */
function renderWalletStatus(data, monthTx) {
  const expenseCats = data.categories.filter(c => (c.type || 'expense') === 'expense');

  walletData = expenseCats.map(c => {
    const spent = monthTx
      .filter(t => isExpense(t) && t.category === c.name)
      .reduce((s, t) => s + t.amount, 0);
    const budget = c.budget || 0;
    const remaining = budget - spent;
    const pctRemaining = budget > 0 ? (remaining / budget) * 100 : 0;
    const pctUsed = budget > 0 ? (spent / budget) * 100 : 0;

    // กำหนดสี progress bar ตาม % คงเหลือ
    let barColor;
    if (pctRemaining >= 70) barColor = '#7BD4A6';       // เขียว
    else if (pctRemaining >= 40) barColor = '#F5C77E';  // เหลือง
    else if (pctRemaining >= 20) barColor = '#F5A28E';  // ส้ม
    else if (pctRemaining >= 0) barColor = '#E88B8B';   // แดงอ่อน
    else barColor = '#C9384A';                          // แดงเข้ม (ติดลบ)

    return {
      name: c.name,
      icon: c.icon,
      color: c.color,
      budget,
      spent,
      remaining,
      pctRemaining,
      pctUsed,
      barColor
    };
  });

  // คำนวณ overall
  const totalBudget = walletData.reduce((s, w) => s + w.budget, 0);
  const totalSpent = walletData.reduce((s, w) => s + w.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? (totalRemaining / totalBudget) * 100 : 0;

  // คำนวณวันเหลือในเดือน
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();

  // ข้อความสถานะ
  let emoji, text;
  if (overallPct >= 70) { emoji = '🧁'; text = `อยู่ในเกณฑ์ดี • เหลืออีก ${daysLeft} วัน`; }
  else if (overallPct >= 40) { emoji = '😊'; text = `ยังใช้ได้อยู่ • เหลืออีก ${daysLeft} วัน`; }
  else if (overallPct >= 20) { emoji = '😬'; text = `เริ่มตึงมือ • เหลืออีก ${daysLeft} วัน`; }
  else if (overallPct >= 0) { emoji = '😰'; text = `ใกล้เต็มแล้ว • เหลืออีก ${daysLeft} วัน`; }
  else { emoji = '🚨'; text = `เกินงบแล้ว • เหลืออีก ${daysLeft} วัน`; }

  document.getElementById('wsOverallEmoji').textContent = emoji;
  document.getElementById('wsOverallText').textContent = text;
  document.getElementById('wsOverallAmount').textContent = formatMoney(totalRemaining);
  document.getElementById('wsOverallTotal').textContent =
    `/ ${formatMoney(totalBudget)} (${overallPct.toFixed(1)}%)`;

  // เปลี่ยนสี amount ตามสถานะ
  const amtEl = document.getElementById('wsOverallAmount');
  amtEl.style.color = overallPct < 0 ? '#C9384A'
    : overallPct < 20 ? '#E88B8B'
    : overallPct < 40 ? '#D97706'
    : '#3E6E52';

  renderWalletGrid();
}

function renderWalletGrid() {
  const wrap = document.getElementById('wsGrid');
  const emptyEl = document.getElementById('wsEmpty');
  wrap.innerHTML = '';

  let filtered = walletData;

  if (currentWalletFilter === 'warning') {
    // ใกล้เต็ม: pctRemaining ระหว่าง 0-20
    filtered = walletData.filter(w => w.pctRemaining >= 0 && w.pctRemaining <= 20);
  } else if (currentWalletFilter === 'over') {
    // เกินงบ: pctRemaining < 0
    filtered = walletData.filter(w => w.pctRemaining < 0);
  }

  // เรียงตาม pctRemaining น้อยไปมาก (ตึงสุดขึ้นก่อน)
  filtered = [...filtered].sort((a, b) => a.pctRemaining - b.pctRemaining);

  if (!filtered.length) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  filtered.forEach(w => {
    const card = document.createElement('div');
    card.className = 'ws-card';

    const pctLabel = w.budget > 0 ? w.pctRemaining.toFixed(1) + '%' : '—';
    const pctColor = w.pctRemaining < 0 ? '#C9384A'
      : w.pctRemaining < 20 ? '#E88B8B'
      : w.pctRemaining < 40 ? '#D97706'
      : '#3E6E52';

    card.innerHTML = `
      <div class="ws-card-head">
        <div class="ws-card-icon" style="background:${hexAlpha(w.color, 0.25)};">
          ${w.icon}
        </div>
        <div class="ws-card-title">
          <div class="ws-card-name">${w.name}</div>
          <div class="ws-card-sub">คงเหลือ ${w.budget > 0 ? w.pctRemaining.toFixed(0) : '—'}%</div>
        </div>
        <div class="ws-card-pct" style="background:${hexAlpha(pctColor, 0.15)}; color:${pctColor};">
          ${pctLabel}
        </div>
      </div>

      <div class="ws-card-stats">
        <div class="ws-stat">
          <div class="ws-stat-label">
            <span class="ws-stat-icon" style="color:#A7C7E7;">◆</span> ใช้ไป
          </div>
          <div class="ws-stat-value" style="color:#6B4FA8;">${formatMoney(w.spent)}</div>
        </div>
        <div class="ws-stat">
          <div class="ws-stat-label">
            <span class="ws-stat-icon" style="color:#C8A2C8;">●</span> วงเงิน
          </div>
          <div class="ws-stat-value" style="color:#6B4FA8;">${formatMoney(w.budget)}</div>
        </div>
        <div class="ws-stat">
          <div class="ws-stat-label">
            <span class="ws-stat-icon" style="color:#F5A28E;">🔥</span> คงเหลือ
          </div>
          <div class="ws-stat-value" style="color:${w.remaining < 0 ? '#C9384A' : '#3E6E52'};">
            ${formatMoney(w.remaining)}
          </div>
        </div>
      </div>

      <div class="ws-card-bar">
        <div class="ws-card-bar-fill"
             style="width:${Math.min(100, Math.max(0, w.pctUsed))}%;
                    background:linear-gradient(90deg, ${w.barColor}, ${w.barColor}dd);">
        </div>
      </div>
    `;

    wrap.appendChild(card);
  });
}

function bindWalletFilters() {
  document.querySelectorAll('#wsFilters .ws-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#wsFilters .ws-chip')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentWalletFilter = btn.dataset.filter;
      renderWalletGrid();
    });
  });
}

/* helper: hex + alpha */
function hexAlpha(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(200,162,200,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ===== Trend Chart ===== */
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

/* ===== Chart helpers ===== */
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

/* =========================================================
 * 8. HEATMAP ปฏิทิน
 * ========================================================= */
function renderHeatmap(data) {
  const wrap = document.getElementById('heatmapWrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  if (!data || !data.length) {
    wrap.innerHTML = '<div class="empty-text" style="padding:1rem;">ไม่มีข้อมูล</div>';
    return;
  }

  const firstDate = new Date(data[0].date + 'T00:00:00');
  const startPad = firstDate.getDay();

  let tooltip = document.querySelector('.heatmap-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'heatmap-tooltip';
    document.body.appendChild(tooltip);
  }

  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  for (let i = 0; i < startPad; i++) {
    const empty = document.createElement('div');
    empty.className = 'heatmap-cell empty';
    grid.appendChild(empty);
  }

  data.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.dataset.level = d.level;
    cell.dataset.date = d.date;
    cell.dataset.total = d.total;

    const showTooltip = () => {
      tooltip.style.display = 'block';
      tooltip.textContent = `${formatThaiShort(d.date)} • ${formatMoney(d.total)}`;
      const r = cell.getBoundingClientRect();
      tooltip.style.left = Math.max(8, r.left + r.width / 2 - tooltip.offsetWidth / 2) + 'px';
      tooltip.style.top = (r.top - tooltip.offsetHeight - 8) + 'px';
    };
    const hideTooltip = () => { tooltip.style.display = 'none'; };

    cell.addEventListener('mouseenter', showTooltip);
    cell.addEventListener('mouseleave', hideTooltip);
    cell.addEventListener('touchstart', () => {
      showTooltip();
      setTimeout(hideTooltip, 1500);
    }, { passive: true });

    grid.appendChild(cell);
  });

  wrap.appendChild(grid);
}

function formatThaiShort(iso) {
  const d = new Date(iso + 'T00:00:00');
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/* =========================================================
 * 9. TOP 5
 * ========================================================= */
function renderTop5(items) {
  if (charts.chartTop5) charts.chartTop5.destroy();
  const ctx = document.getElementById('chartTop5');
  if (!ctx) return;

  if (!items || !items.length) {
    charts.chartTop5 = { destroy() {} };
    return;
  }

  charts.chartTop5 = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: items.map(x => `${x.icon} ${x.name}`),
      datasets: [{
        data: items.map(x => x.amount),
        backgroundColor: items.map(x => x.color),
        borderRadius: 10,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const total = items.reduce((s, x) => s + x.amount, 0);
              const pct = total > 0 ? (c.parsed.x / total * 100).toFixed(1) : 0;
              return ` ${formatMoney(c.parsed.x)} (${pct}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.5)' },
          ticks: { font: { family: 'Prompt' }, callback: (v) => formatMoney(v) }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Prompt', size: 12 } }
        }
      }
    }
  });
}

/* =========================================================
 * 10. MONTH COMPARISON
 * ========================================================= */
function renderMonthComparison(stats) {
  const wrap = document.getElementById('compareMonthWrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const items = [
    {
      label: '💸 รายจ่ายเดือนนี้',
      curr: stats.thisMonth.expense,
      prev: stats.prevMonth.expense,
      inverse: true
    },
    {
      label: '💰 รายรับเดือนนี้',
      curr: stats.thisMonth.income,
      prev: stats.prevMonth.income,
      inverse: false
    },
    {
      label: '📊 สุทธิเดือนนี้',
      curr: stats.thisMonth.income - stats.thisMonth.expense,
      prev: stats.prevMonth.income - stats.prevMonth.expense,
      inverse: false
    },
    {
      label: '📅 เทียบปีที่แล้ว (รายจ่าย)',
      curr: stats.thisMonth.expense,
      prev: stats.lastYear.expense,
      inverse: true
    }
  ];

  items.forEach(item => {
    const delta = item.prev > 0
      ? ((item.curr - item.prev) / item.prev) * 100
      : (item.curr > 0 ? 100 : 0);

    let cls = 'same';
    let arrow = '→';
    if (Math.abs(delta) < 0.5) {
      cls = 'same';
      arrow = '→';
    } else if (delta > 0) {
      cls = item.inverse ? 'up' : 'down';
      arrow = '↑';
    } else {
      cls = item.inverse ? 'down' : 'up';
      arrow = '↓';
    }

    const row = document.createElement('div');
    row.className = 'cm-row';
    row.innerHTML = `
      <div class="cm-label">${item.label}</div>
      <div class="cm-value-group">
        <span class="cm-value">${formatMoney(item.curr)}</span>
        <span class="cm-delta ${cls}">
          ${arrow} ${Math.abs(delta).toFixed(1)}%
        </span>
      </div>
    `;
    wrap.appendChild(row);
  });
}

/* =========================================================
 * 11. SANKEY
 * ========================================================= */
function renderSankey(sankey) {
  if (charts.chartSankey) charts.chartSankey.destroy();
  const ctx = document.getElementById('chartSankey');
  if (!ctx) return;

  if (!sankey || !sankey.links || !sankey.links.length) {
    charts.chartSankey = { destroy() {} };
    return;
  }

  try {
    const ctrl = Chart.registry.getController('sankey');
    if (!ctrl) throw new Error('no sankey');
  } catch (e) {
    ctx.parentElement.innerHTML =
      '<div class="empty-text" style="padding:2rem;">⚠️ Sankey plugin ไม่โหลด</div>';
    return;
  }

  const COLORS = ['#F8B195','#F67280','#C06C84','#A77AA7','#A7C7E7','#A8D8B9','#FECEAB'];
  const nodes = [...new Set(sankey.links.flatMap(l => [l.from, l.to]))];
  const colorMap = {};
  nodes.forEach((n, i) => { colorMap[n] = COLORS[i % COLORS.length]; });

  charts.chartSankey = new Chart(ctx, {
    type: 'sankey',
    data: {
      datasets: [{
        data: sankey.links.map(l => ({ from: l.from, to: l.to, flow: l.flow })),
        colorFrom: (c) => colorMap[c.dataset.data[c.dataIndex].from] || '#C8A2C8',
        colorTo: (c) => colorMap[c.dataset.data[c.dataIndex].to] || '#A7C7E7',
        colorMode: 'gradient',
        borderWidth: 0,
        alpha: 0.55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const d = c.dataset.data[c.dataIndex];
              return ` ${d.from} → ${d.to}: ${formatMoney(d.flow)}`;
            }
          }
        }
      },
      layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

/* ===== รายการล่าสุด — 2 วันย้อนหลัง ===== */
/* ===== รายการล่าสุด — 2 วันย้อนหลัง (มี icon) ===== */
function renderRecent(transactions) {
  const tbody = document.getElementById('recentTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  // หาวันที่ 2 วันย้อนหลัง (รวมวันนี้)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);

  const fromISO = toLocalISO(twoDaysAgo);

  const recent = transactions
    .filter(t => t.date >= fromISO)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return 0;
    });

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#7A7286;padding:1.5rem;">ยังไม่มีรายการ 2 วันล่าสุด</td></tr>';
    return;
  }

  // ดึง master data เพื่อ lookup icon + สี
  const cats = window.__CATS__ || [];
  const pays = window.__PAYS__ || [];

  recent.forEach(t => {
    const cat = cats.find(c => c.name === t.category);
    const pay = pays.find(p => p.name === t.payment_method);
    const catIcon = cat ? cat.icon : '📌';
    const catColor = cat ? cat.color : '#B8B8D1';
    const payIcon = pay ? pay.icon : '💳';

    const isInc = isIncome(t);
    const sign = isInc ? '+' : '−';
    const amountColor = isInc ? '#4B7A5B' : '#A64B4B';
    const typeLabel = isInc
      ? '<span style="color:#4B7A5B;">💰 รายรับ</span>'
      : '<span style="color:#A64B4B;">💸 รายจ่าย</span>';

    const tr = document.createElement('tr');
    tr.className = 'recent-row';
    tr.innerHTML = `
      <td class="recent-icon-cell">
        <div class="recent-icon" style="background:${hexAlphaLocal(catColor, 0.25)};">
          ${catIcon}
        </div>
      </td>
      <td>${t.date}</td>
      <td>${typeLabel}</td>
      <td>${t.category}</td>
      <td style="color:${amountColor};font-weight:600;">${sign}${formatMoney(t.amount)}</td>
      <td>
        <span class="recent-payment-badge">
          <span class="recent-payment-icon">${payIcon}</span>
          ${t.payment_method}
        </span>
      </td>
      <td>${t.note || '-'}</td>
      <td>
        <button class="btn btn-danger recent-del" data-id="${t.id}">ลบ</button>
      </td>
    `;
    tr.querySelector('.recent-del').addEventListener('click', async () => {
      if (!confirm('ลบรายการนี้?')) return;
      try {
        await API.deleteTransaction({ id: t.id });
        init();
      } catch (err) { alert('ลบไม่สำเร็จ: ' + err.message); }
    });
    tbody.appendChild(tr);
  });
}

/* helper: hex + alpha */
function hexAlphaLocal(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(200,162,200,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ===== FAB ===== */
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

/* ===== Utils ===== */
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

/* ===== Helper: Date → YYYY-MM-DD ===== */
function toLocalISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ===== Helper: hex + alpha ===== */
function hexAlphaLocal(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(200,162,200,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
