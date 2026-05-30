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
  renderSurveys();
  renderAllComplaints();
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

// ─── Survey Dashboard ─────────────────────────────────────────
function renderSurveys() {
  var k = DB.kpi || {};
  var s = k.surveysAnalytics || null;

  // إذا لم تصل بيانات استبيانات من الخادم، إظهار رسالة مناسبة
  if (!s) {
    var svSec = document.getElementById('surveys');
    if (svSec) {
      var noData = svSec.querySelector('.survey-nodata');
      if (!noData) {
        var msg = document.createElement('div');
        msg.className = 'survey-nodata';
        msg.style.cssText = 'padding:40px;text-align:center;color:#94a3b8;font-size:.9rem';
        msg.innerHTML = '⚠️ لا توجد بيانات استبيانات بعد. قم بتشغيل نموذج الاستبيانات لتبدأ البيانات في الظهور.';
        svSec.prepend(msg);
      }
    }
    return;
  }

  // ── بطاقات الأرقام العلوية ─────────────────────────────────
  var total = k.totalSurveys || 0;
  setTextAnim('sv-total', total);

  if (total > 0 && s.nps) {
    var promoters   = Math.round((s.nps.promoters   / total) * 100);
    var detractors  = Math.round((s.nps.detractors  / total) * 100);
    var npsScore    = promoters - detractors;
    setTextAnim('sv-promoters',  promoters + '%');
    setTextAnim('sv-detractors', detractors + '%');
    setTextAnim('sv-nps', (npsScore >= 0 ? '+' : '') + npsScore);

    // تلوين مؤشر NPS حسب النتيجة
    var npsEl = document.getElementById('sv-nps');
    if (npsEl) {
      npsEl.style.color = npsScore >= 50 ? '#4ade80' : npsScore >= 0 ? '#fbbf24' : '#f87171';
    }
  }

  // ── Radar Chart (الرضا حسب قسم الخدمة) ────────────────────
  var canvasRadar = document.getElementById('surveyRadarChart');
  if (canvasRadar) {
    if (DB.charts.radar) DB.charts.radar.destroy();
    DB.charts.radar = new Chart(canvasRadar, {
      type: 'radar',
      data: {
        labels: ['التواصل\nوالتسجيل', 'بيئة الوحدة', 'رعاية\nالمستشفى', 'الجهات\nالمتعاقدة', 'المعامل'],
        datasets: [{
          label: 'متوسط الرضا (من 5)',
          data: s.radarData || [0,0,0,0,0],
          backgroundColor: 'rgba(96,165,250,0.15)',
          borderColor: '#60a5fa',
          borderWidth: 2,
          pointBackgroundColor: '#60a5fa',
          pointBorderColor: '#0f172a',
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          r: {
            min: 0, max: 5,
            ticks: { stepSize: 1, backdropColor: 'transparent', color: '#94a3b8', font: { family: 'Cairo', size: 10 } },
            grid: { color: 'rgba(255,255,255,0.08)' },
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: { color: '#e2e8f0', font: { family: 'Cairo', size: 11 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8',
            callbacks: { label: function(ctx) { return ' ' + ctx.raw + ' / 5'; } }
          }
        }
      }
    });
  }

  // ── أفضل 5 منشآت ────────────────────────────────────────────
  var canvasTop = document.getElementById('topProvidersChart');
  if (canvasTop && s.topProviders && s.topProviders.length > 0) {
    if (DB.charts.top) DB.charts.top.destroy();
    var topColors = s.topProviders.map(function(p) {
      return p.score >= 4.5 ? '#4ade80' : p.score >= 4.0 ? '#a3e635' : '#fbbf24';
    });
    DB.charts.top = new Chart(canvasTop, {
      type: 'bar',
      data: {
        labels: s.topProviders.map(function(p) { return p.name; }),
        datasets: [{
          data: s.topProviders.map(function(p) { return p.score; }),
          backgroundColor: topColors,
          borderRadius: 6,
          borderWidth: 0,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8',
            callbacks: { label: function(ctx) { return ' تقييم: ' + ctx.raw + ' / 5 ⭐'; } }
          }
        },
        scales: {
          x: { min: 0, max: 5, grid: {color:'rgba(255,255,255,.05)'}, ticks: {color:'#94a3b8', font:{family:'Cairo'}} },
          y: { grid: {display:false}, ticks: {color:'#e2e8f0', font:{family:'Cairo', size:11}} }
        }
      }
    });
  }

  // ── أسوأ 5 منشآت ────────────────────────────────────────────
  var canvasBot = document.getElementById('bottomProvidersChart');
  if (canvasBot && s.bottomProviders && s.bottomProviders.length > 0) {
    if (DB.charts.bot) DB.charts.bot.destroy();
    var botColors = s.bottomProviders.map(function(p) {
      return p.score <= 2.5 ? '#f87171' : p.score <= 3.5 ? '#fb923c' : '#fbbf24';
    });
    DB.charts.bot = new Chart(canvasBot, {
      type: 'bar',
      data: {
        labels: s.bottomProviders.map(function(p) { return p.name; }),
        datasets: [{
          data: s.bottomProviders.map(function(p) { return p.score; }),
          backgroundColor: botColors,
          borderRadius: 6,
          borderWidth: 0,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8',
            callbacks: { label: function(ctx) { return ' تقييم: ' + ctx.raw + ' / 5 ⭐'; } }
          }
        },
        scales: {
          x: { min: 0, max: 5, grid: {color:'rgba(255,255,255,.05)'}, ticks: {color:'#94a3b8', font:{family:'Cairo'}} },
          y: { grid: {display:false}, ticks: {color:'#e2e8f0', font:{family:'Cairo', size:11}} }
        }
      }
    });
  }

  // ── اتجاه الرضا اليومي ──────────────────────────────────────
  var canvasSTrend = document.getElementById('surveyTrendChart');
  if (canvasSTrend && s.dailyTrend && s.dailyTrend.length > 0) {
    if (DB.charts.strend) DB.charts.strend.destroy();
    DB.charts.strend = new Chart(canvasSTrend, {
      type: 'line',
      data: {
        labels: s.dailyTrend.map(function(d) { return d.date.slice(5); }),
        datasets: [{
          label: 'متوسط الرضا',
          data: s.dailyTrend.map(function(d) { return d.score; }),
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251,191,36,0.08)',
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#fbbf24',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8',
            callbacks: { label: function(ctx) { return ' متوسط الرضا: ' + ctx.raw + ' / 5'; } }
          }
        },
        scales: {
          y: { min: 1, max: 5, grid: {color:'rgba(255,255,255,.05)'}, ticks: {color:'#94a3b8', font:{family:'Cairo'}} },
          x: { grid: {display:false}, ticks: {color:'#94a3b8', font:{family:'Cairo',size:10}} }
        }
      }
    });
  }
}


// ─── All Complaints Table ─────────────────────────────────────
function renderAllComplaints() {
  var tbody = document.getElementById('allComplaintsTableBody');
  if (!tbody) return;
  // لجعل الجدول ممتلئ، نستخدم DB.recent لأن الخادم حالياً لا يرسل كل الشكاوى
  // في تحديث قادم يمكن جعل الخادم يرسل آخر 50 شكوى أو حسب الحاجة
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
    totalSurveys:       90,
    categoryBreakdown:  { 'وحدة صحية':22,'مستشفى رعاية':14,'مستشفى متعاقد':7,'معمل متعاقد':4 },
    locationBreakdown:  { 'إسنا':18,'أرمنت':13,'الأقصر':16 },
    severityBreakdown:  { 'عالٍ':8,'متوسط':20,'منخفض':19 },
    slaBreached:        6,
    wordFrequency:      getDemoWords(),
    dailyTrend:         getDemoTrend(),
    surveysAnalytics: {
      nps: { promoters: 54, passives: 21, detractors: 15 },
      radarData: [3.9, 4.2, 3.6, 4.5, 3.1],
      topProviders: [
        { name: 'مستشفى الكرنك الدولي',      score: 4.8, count: 12 },
        { name: 'مركز طب أسرة الأقصر',        score: 4.6, count: 18 },
        { name: 'وحدة طب أسرة المدينة',       score: 4.5, count: 9  },
        { name: 'معمل البرج التخصصي',          score: 4.3, count: 7  },
        { name: 'مستشفى الزيتون الخيري',      score: 4.2, count: 11 },
      ],
      bottomProviders: [
        { name: 'وحدة الشغب الصحية',          score: 2.1, count: 6  },
        { name: 'مستشفى أرمنت العام',          score: 2.4, count: 8  },
        { name: 'معمل الطلائع',                score: 2.7, count: 5  },
        { name: 'مستشفى إسنا المركزي',         score: 2.9, count: 7  },
        { name: 'وحدة نجع الشيخ',              score: 3.1, count: 4  },
      ],
      dailyTrend: getDemoSurveyTrend(),
    },
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

function getDemoSurveyTrend() {
  var arr = [];
  for (var i = 29; i >= 0; i--) {
    var d = new Date(Date.now() - i * 86400000);
    var score = (3.2 + Math.random() * 1.6).toFixed(1);
    arr.push({ date: d.toISOString().slice(0,10), score: parseFloat(score) });
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
