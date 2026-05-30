// ═══════════════════════════════════════════════════════════════
// dashboard.js — منطق لوحة التحكم التنفيذية
// UHIA Luxor System v2.0
// ═══════════════════════════════════════════════════════════════

// ── استبدل هذا الرابط برابط Apps Script المنشور ──────────────
var SCRIPT_URL = window.SCRIPT_URL || '../config.js';

// تحميل config.js للحصول على SCRIPT_URL
(function() {
  var s = document.createElement('script');
  s.src = '../config.js';
  s.onerror = function() { console.warn('config.js not found — using demo mode'); };
  document.head.appendChild(s);
})();

// ── State ─────────────────────────────────────────────────────
var DB = {
  kpi:    null,
  recent: [],
  sla:    null,
  charts: {},
};

var AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 دقائق
var refreshTimer    = null;
var activeSection   = 'overview';

// ── الدخول عند تحميل الصفحة ──────────────────────────────────
window.addEventListener('load', function() {
  startClock();
  setupNav();
  loadData(false);
  // تحديث تلقائي
  refreshTimer = setInterval(function() { loadData(false); }, AUTO_REFRESH_MS);
});

// ─── ساعة حية ────────────────────────────────────────────────
function startClock() {
  var DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  setInterval(function() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2,'0');
    var m = String(now.getMinutes()).padStart(2,'0');
    var s = String(now.getSeconds()).padStart(2,'0');
    setText('liveTime', h + ':' + m + ':' + s);
    setText('liveDate', DAYS[now.getDay()] + '، ' + now.getDate() + ' ' + MONTHS[now.getMonth()]);
  }, 1000);
}

// ─── Navigation ──────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      var section = this.dataset.section;
      switchSection(section);
    });
  });
}

function switchSection(section) {
  activeSection = section;
  document.querySelectorAll('.nav-item').forEach(function(i) {
    i.classList.toggle('active', i.dataset.section === section);
  });
  document.querySelectorAll('.section').forEach(function(s) {
    s.classList.toggle('active', s.id === section);
  });
}

function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var main    = document.querySelector('.main-content');
  sidebar.classList.toggle('collapsed');
  main.classList.toggle('expanded');
}

// ─── تحميل البيانات ──────────────────────────────────────────
function loadData(showLoader) {
  if (showLoader) showLoading(true);
  setRefreshBtn(true);

  // إذا لم يكن SCRIPT_URL محدداً بعد، استخدم بيانات تجريبية
  var url = (typeof SCRIPT_URL !== 'undefined' && SCRIPT_URL.indexOf('script.google.com') !== -1)
    ? SCRIPT_URL : null;

  if (!url) {
    setTimeout(function() {
      renderDemoData();
      showLoading(false);
      setRefreshBtn(false);
    }, 600);
    return;
  }

  callApi('getDashboardData', {}, function(err, data) {
    showLoading(false);
    setRefreshBtn(false);
    if (err || !data || !data.success) {
      showToast('تعذر تحميل البيانات — يعمل في الوضع التجريبي', 'error');
      renderDemoData();
      return;
    }
    DB.kpi    = data.kpi;
    DB.recent = data.recent;
    DB.sla    = data.sla;
    renderAll();
    var now = new Date();
    setText('lastUpdate', 'آخر تحديث: ' + now.toLocaleTimeString('ar-EG'));
  });
}

// ─── Render All ──────────────────────────────────────────────
function renderAll() {
  renderKpis();
  renderTrendChart();
  renderCategoryChart();
  renderSeverityChart();
  renderSlaPanel();
  renderLocationBars();
  renderRecentTable();
  renderWordCloud();
}

// ─── KPI Cards ───────────────────────────────────────────────
function renderKpis() {
  var k = DB.kpi || {};
  setTextAnim('kv-total',    k.totalComplaints    || 0);
  setTextAnim('kv-open',     k.openComplaints     || 0);
  setTextAnim('kv-resolved', k.resolvedComplaints || 0);
  setTextAnim('kv-sla',      (k.slaComplianceRate || 100) + '%');
  setTextAnim('kv-sat',      (k.avgSatisfaction   || 0) + ' ⭐');
}

function setTextAnim(id, val) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.transition = 'transform .2s';
  el.style.transform  = 'scale(1.15)';
  setTimeout(function() { el.textContent = val; el.style.transform = 'scale(1)'; }, 180);
}

// ─── Trend Chart ─────────────────────────────────────────────
function renderTrendChart() {
  var canvas = document.getElementById('trendChart');
  if (!canvas) return;
  var trend = (DB.kpi && DB.kpi.dailyTrend) ? DB.kpi.dailyTrend : getDemoTrend();
  var labels = trend.map(function(t) { return t.date.slice(5); }); // MM-DD
  var values = trend.map(function(t) { return t.count; });

  if (DB.charts.trend) DB.charts.trend.destroy();
  DB.charts.trend = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'عدد الشكاوى',
        data:  values,
        fill:  true,
        backgroundColor: 'rgba(26,115,232,.12)',
        borderColor:     'rgba(96,165,250,.9)',
        borderWidth:     2.5,
        pointBackgroundColor: '#60a5fa',
        pointRadius:     4,
        tension:         0.4,
      }]
    },
    options: chartOptions('عدد الشكاوى اليومي'),
  });
}

// ─── Category Chart ──────────────────────────────────────────
function renderCategoryChart() {
  var canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  var data = (DB.kpi && DB.kpi.categoryBreakdown) ? DB.kpi.categoryBreakdown : {
    'وحدة صحية': 12, 'مستشفى رعاية': 8, 'مستشفى متعاقد': 4, 'معمل متعاقد': 3
  };
  var labels = Object.keys(data);
  var values = Object.values(data);
  var colors = ['#60a5fa','#4ade80','#fbbf24','#c084fc'];

  if (DB.charts.cat) DB.charts.cat.destroy();
  DB.charts.cat = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#1e293b' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Cairo', size: 11 }, padding: 10 } },
      },
    },
  });
}

// ─── Severity Chart ───────────────────────────────────────────
function renderSeverityChart() {
  var canvas = document.getElementById('severityChart');
  if (!canvas) return;
  var data = (DB.kpi && DB.kpi.severityBreakdown) ? DB.kpi.severityBreakdown : {
    'عالٍ': 5, 'متوسط': 12, 'منخفض': 20
  };
  if (DB.charts.sev) DB.charts.sev.destroy();
  DB.charts.sev = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: Object.keys(data),
      datasets: [{
        data:            Object.values(data),
        backgroundColor: ['#f87171','#fbbf24','#4ade80'],
        borderRadius:    8,
        borderWidth:     0,
      }]
    },
    options: chartOptions('الخطورة'),
  });
}

// ─── SLA Panel ───────────────────────────────────────────────
function renderSlaPanel() {
  var sla = DB.sla || {};
  setTextAnim('sla-breached', sla.breachedCount || 0);
  setTextAnim('sla-warning',  sla.warningCount  || 0);
  setTextAnim('sla-ok',       sla.okCount       || 0);

  var list = document.getElementById('slaBreachedList');
  if (!list) return;
  list.innerHTML = '';
  var items = (sla.breached || []).slice(0, 5);
  if (items.length === 0) {
    list.innerHTML = '<div style="color:#4ade80;font-size:.8rem;text-align:center;padding:8px">✅ لا توجد شكاوى متأخرة</div>';
    return;
  }
  items.forEach(function(c) {
    var div = document.createElement('div');
    div.className = 'sla-item';
    div.innerHTML = '<span class="sla-item-id">' + c.id + '</span>'
      + '<span class="sla-item-info">' + (c.provider || '') + ' · ' + (c.category || '') + '</span>';
    list.appendChild(div);
  });
}

// ─── Location Bars ───────────────────────────────────────────
function renderLocationBars() {
  var container = document.getElementById('locationBars');
  if (!container) return;
  var data = (DB.kpi && DB.kpi.locationBreakdown) ? DB.kpi.locationBreakdown : {
    'إسنا': 15, 'أرمنت': 10, 'الأقصر': 18
  };
  var entries  = Object.entries(data).sort(function(a,b){ return b[1]-a[1]; });
  var maxVal   = entries.length > 0 ? entries[0][1] : 1;
  container.innerHTML = '';
  entries.forEach(function(entry) {
    var name = entry[0], val = entry[1];
    var pct  = Math.round((val / maxVal) * 100);
    var div  = document.createElement('div');
    div.className = 'loc-bar-item';
    div.innerHTML = '<div class="loc-bar-label"><span>' + name + '</span><span>' + val + '</span></div>'
      + '<div class="loc-bar-track"><div class="loc-bar-fill" style="width:' + pct + '%"></div></div>';
    container.appendChild(div);
  });
}

// ─── Recent Table ─────────────────────────────────────────────
function renderRecentTable() {
  var tbody = document.getElementById('recentTableBody');
  if (!tbody) return;
  var rows = DB.recent || [];
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">لا توجد شكاوى بعد</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(function(c) {
    return '<tr>'
      + '<td><code style="color:#60a5fa;font-size:.75rem">' + (c.id||'') + '</code></td>'
      + '<td>' + (c.name||'') + '</td>'
      + '<td>' + (c.category||'') + '</td>'
      + '<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (c.provider||'') + '</td>'
      + '<td>' + statusBadge(c.status) + '</td>'
      + '<td>' + slaBadge(c.slaStatus, c.slaBreached) + '</td>'
      + '<td>' + severityBadge(c.severity) + '</td>'
      + '<td style="font-size:.72rem;color:#94a3b8">' + fmtDate(c.timestamp) + '</td>'
      + '</tr>';
  }).join('');
}

// ─── Word Cloud ───────────────────────────────────────────────
function renderWordCloud() {
  var container = document.getElementById('wordCloud');
  if (!container) return;
  var words = (DB.kpi && DB.kpi.wordFrequency && DB.kpi.wordFrequency.length > 0)
    ? DB.kpi.wordFrequency
    : getDemoWords();

  var maxCount = words[0] ? words[0].count : 1;
  var colors   = ['#60a5fa','#4ade80','#fbbf24','#c084fc','#f87171','#38bdf8','#fb923c'];

  container.innerHTML = words.slice(0, 40).map(function(w, i) {
    var size = 0.7 + (w.count / maxCount) * 1.2;
    var col  = colors[i % colors.length];
    return '<span class="wc-word" style="font-size:' + size + 'rem;color:' + col + ';background:' + col + '18">'
      + w.word + '</span>';
  }).join('');
}

// ─── Chart Options Helper ─────────────────────────────────────
function chartOptions(yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#e2e8f0',
        bodyColor:  '#94a3b8',
        borderColor: 'rgba(255,255,255,.1)',
        borderWidth: 1,
      }
    },
    scales: {
      x: { grid: { color:'rgba(255,255,255,.04)' }, ticks: { color:'#64748b', font:{family:'Cairo',size:10} } },
      y: { grid: { color:'rgba(255,255,255,.04)' }, ticks: { color:'#64748b', font:{family:'Cairo',size:10} } },
    },
  };
}

// ─── Badges ──────────────────────────────────────────────────
function statusBadge(s) {
  var map = {
    'جديدة':         'badge-new',
    'تحت المراجعة': 'badge-review',
    'تم الحل':      'badge-resolved',
    'مغلقة':        'badge-closed',
  };
  return '<span class="badge ' + (map[s]||'badge-closed') + '">' + (s||'') + '</span>';
}
function slaBadge(slaStatus, breached) {
  if (slaStatus === 'متأخرة' || breached) return '<span class="badge badge-breach">متأخرة</span>';
  if (slaStatus === 'تحذير')              return '<span class="badge badge-warn">تحذير</span>';
  return '<span class="badge badge-ok">في الوقت</span>';
}
function severityBadge(s) {
  if (s === 'عالٍ')   return '<span class="badge badge-high">عالٍ</span>';
  if (s === 'متوسط') return '<span class="badge badge-medium">متوسط</span>';
  return '<span class="badge badge-low">منخفض</span>';
}

// ─── API Call ─────────────────────────────────────────────────
function callApi(action, params, cb) {
  var url = (typeof SCRIPT_URL !== 'undefined') ? SCRIPT_URL : '';
  if (!url || url.indexOf('script.google.com') === -1) {
    cb(new Error('no url'), null);
    return;
  }
  var body = JSON.stringify(Object.assign({ action: action }, params));
  var ctrl = new AbortController();
  var t    = setTimeout(function(){ ctrl.abort(); }, 25000);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:   body,
    signal: ctrl.signal,
  })
  .then(function(r) { clearTimeout(t); return r.json(); })
  .then(function(d) { cb(null, d); })
  .catch(function(e){ clearTimeout(t); cb(e, null); });
}

// ─── Demo Data (عند عدم وجود Apps Script) ────────────────────
function renderDemoData() {
  DB.kpi = {
    totalComplaints:    47,
    openComplaints:     12,
    resolvedComplaints: 35,
    slaComplianceRate:  87,
    avgSatisfaction:    3.8,
    categoryBreakdown:  { 'وحدة صحية':22,'مستشفى رعاية':14,'مستشفى متعاقد':7,'معمل متعاقد':4 },
    locationBreakdown:  { 'إسنا':18,'أرمنت':13,'الأقصر':16 },
    severityBreakdown:  { 'عالٍ':8,'متوسط':20,'منخفض':19 },
    slaBreached:        6,
    wordFrequency:      getDemoWords(),
    dailyTrend:         getDemoTrend(),
  };
  DB.sla = {
    breachedCount: 6,
    warningCount:  4,
    okCount:       8,
    breached: [
      {id:'CMP-260501-1234',provider:'وحدة طب أسرة الشغب',category:'وحدة صحية'},
      {id:'CMP-260502-5678',provider:'مستشفى حورس التخصصي',category:'مستشفى رعاية'},
    ],
  };
  DB.recent = [
    {id:'CMP-260530-9001',name:'أحمد محمد علي',category:'وحدة صحية',provider:'مركز طب أسرة الأقصر',status:'جديدة',slaStatus:'في الوقت',severity:'منخفض',timestamp:new Date()},
    {id:'CMP-260529-8840',name:'فاطمة إبراهيم',category:'مستشفى رعاية',provider:'مستشفى الكرنك الدولي',status:'تحت المراجعة',slaStatus:'تحذير',severity:'متوسط',timestamp:new Date(Date.now()-86400000)},
    {id:'CMP-260528-7721',name:'محمد حسن',category:'معمل متعاقد',provider:'معمل البرج',status:'تم الحل',slaStatus:'في الوقت',severity:'منخفض',timestamp:new Date(Date.now()-172800000)},
  ];
  renderAll();
  setText('lastUpdate', '⚠️ بيانات تجريبية — اربط Apps Script لبيانات حقيقية');
  showLoading(false);
  setRefreshBtn(false);
}

function getDemoTrend() {
  var arr = [];
  for (var i = 29; i >= 0; i--) {
    var d = new Date(Date.now() - i * 86400000);
    arr.push({ date: d.toISOString().slice(0,10), count: Math.floor(Math.random()*5) + 1 });
  }
  return arr;
}

function getDemoWords() {
  return [
    {word:'انتظار',count:18},{word:'دواء',count:15},{word:'طبيب',count:13},
    {word:'نظافة',count:11},{word:'تأخير',count:10},{word:'استقبال',count:9},
    {word:'كشف',count:8},{word:'تحليل',count:7},{word:'إهمال',count:6},
    {word:'سرعة',count:5},{word:'معاملة',count:5},{word:'موعد',count:4},
    {word:'أدوية',count:4},{word:'مساعدة',count:3},{word:'توجيه',count:3},
  ];
}

// ─── Utilities ───────────────────────────────────────────────
function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}
function fmtDate(ts) {
  if (!ts) return '---';
  try { return new Date(ts).toLocaleDateString('ar-EG', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }
  catch(e) { return String(ts).slice(0,16); }
}
function showLoading(show) {
  var el = document.getElementById('loadingOverlay');
  if (el) el.classList.toggle('hidden', !show);
}
function setRefreshBtn(loading) {
  var btn = document.getElementById('refreshBtn');
  if (btn) {
    btn.textContent = loading ? '⏳ جارٍ...' : '🔄 تحديث';
    btn.disabled    = loading;
  }
}
function showToast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent  = msg;
  el.className    = 'toast ' + (type || 'info') + ' show';
  setTimeout(function() { el.classList.remove('show'); }, 4000);
}
