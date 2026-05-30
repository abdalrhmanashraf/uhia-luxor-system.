// ═══════════════════════════════════════════════════════════════
// Premium Dashboard JS v3.2 (CRM Analytics)
// UHIA Luxor System
// ═══════════════════════════════════════════════════════════════

var API_URL = window.SCRIPT_URL || '';

// كائنات الرسوم البيانية لتحديثها لاحقاً
var charts = {
  fac: null, cat: null, trend: null,
  sTrend: null, sCatDonut: null, sCatBar: null, sLocBar: null,
  sRadar: null, sNps: null, sScatter: null, sFacRank: null, sQuesGrouped: null
};

function switchSurveyTab(tabId) {
  document.querySelectorAll('.survey-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.survey-tab-content').forEach(c => c.style.display = 'none');
  event.target.classList.add('active');
  document.getElementById(tabId).style.display = 'block';
}

window.addEventListener('load', function() {
  updateClock();
  setInterval(updateClock, 1000);
  
  // إعداد الإعدادات الافتراضية لـ Chart.js للـ Dark Mode
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Cairo', sans-serif";
  Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';
  
  loadData();
});

function updateClock() {
  var now = new Date();
  document.getElementById('clockTime').innerText = now.toLocaleTimeString('ar-EG');
  document.getElementById('clockDate').innerText = now.toLocaleDateString('ar-EG');
}

function switchSection(secId) {
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.querySelectorAll('.content-sections > section').forEach(s => s.classList.remove('active-sec'));
  document.getElementById(secId).classList.add('active-sec');
}

function loadData() {
  if (!API_URL) return alert('رابط API غير موجود!');
  document.getElementById('fullLoading').style.display = 'flex';
  
  fetch(API_URL + '?action=getDashboardData')
    .then(res => res.json())
    .then(res => {
      document.getElementById('fullLoading').style.display = 'none';
      if (res.success) {
        renderKPIs(res.kpi, res.analytics.surveyCount);
        renderRepeated(res.analytics.repeatedPatients);
        renderTopStaff(res.analytics.topEmployees);
        renderCharts(res.analytics.charts);
      } else alert('خطأ في جلب البيانات: ' + res.error);
    }).catch(err => {
      document.getElementById('fullLoading').style.display = 'none';
      console.error(err);
      alert('تعذر الاتصال بالخادم.');
    });
}

function renderKPIs(kpi, surveyCount) {
  document.getElementById('kpiTotal').innerText = kpi.total;
  document.getElementById('kpiOpen').innerText = kpi.open;
  document.getElementById('kpiResolved').innerText = kpi.resolved;
  document.getElementById('kpiSla').innerText = kpi.slaCompliance + '%';
  document.getElementById('kpiSurveyTotal').innerText = surveyCount || '--';
}

function renderRepeated(patients) {
  var tbody = document.getElementById('repeatedBody');
  if (!patients || patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">النظام مستقر</td></tr>';
    return;
  }
  var html = '';
  patients.forEach(p => {
    html += `<tr><td><strong>${p.id}</strong></td><td><span class="badge-danger">${p.count} شكاوى</span></td></tr>`;
  });
  tbody.innerHTML = html;
}

function renderTopStaff(staff) {
  var tbody = document.getElementById('staffBody');
  if (!staff || staff.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">لا توجد بيانات</td></tr>';
    return;
  }
  var html = '';
  staff.forEach((s, i) => {
    var medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''));
    html += `<tr><td>${medal} <strong>${s.name}</strong></td><td>${s.resolvedCount}</td><td>${s.avgSpeedHours}</td></tr>`;
  });
  tbody.innerHTML = html;
}

// ─── دوال رسم المخططات (Chart.js) ───
function renderCharts(cData) {
  if(!cData) return;
  
  // 1. الفئات (Doughnut)
  var catLabels = Object.keys(cData.categories || {});
  var catVals = Object.values(cData.categories || {});
  if(charts.cat) charts.cat.destroy();
  charts.cat = new Chart(document.getElementById('categoriesChart'), {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{ data: catVals, backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
  });

  // 2. الجهات (Bar)
  var facLabels = (cData.facilities || []).map(f => f.label);
  var facVals = (cData.facilities || []).map(f => f.value);
  if(charts.fac) charts.fac.destroy();
  charts.fac = new Chart(document.getElementById('facilitiesChart'), {
    type: 'bar',
    data: {
      labels: facLabels,
      datasets: [{ label: 'عدد الشكاوى', data: facVals, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderRadius: 5 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // 3. Trend (Line)
  var trLabels = Object.keys(cData.trend || {}).sort();
  var trVals = trLabels.map(l => cData.trend[l]);
  if(charts.trend) charts.trend.destroy();
  charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: trLabels,
      datasets: [{ label: 'حجم الشكاوى اليومي', data: trVals, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // --------------------------------------------------------
  // V4.0 Advanced Survey Analytics Rendering
  // --------------------------------------------------------
  document.getElementById('kpiSurveyTotal').textContent = data.analytics.surveyCount || 0;
  var overallRadar = cData.radar || [0,0,0,0,0];
  var totalAvg = overallRadar.reduce((a,b)=>a+b, 0) / 5;
  document.getElementById('kpiSurveyAvg').textContent = totalAvg.toFixed(2) + ' / 5';

  // 1. Trend Line (sTrendChart)
  var trKeys = Object.keys(cData.sTrend || {}).sort();
  var trendDatasets = [];
  var colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  var catSet = new Set();
  trKeys.forEach(d => Object.keys(cData.sTrend[d]).forEach(c => catSet.add(c)));
  Array.from(catSet).forEach((cat, idx) => {
    trendDatasets.push({
      label: cat,
      data: trKeys.map(d => cData.sTrend[d] && cData.sTrend[d][cat] ? cData.sTrend[d][cat].s / cData.sTrend[d][cat].c : null),
      borderColor: colorPalette[idx % colorPalette.length],
      tension: 0.4
    });
  });
  if(charts.sTrend) charts.sTrend.destroy();
  charts.sTrend = new Chart(document.getElementById('sTrendChart'), {
    type: 'line', data: { labels: trKeys, datasets: trendDatasets },
    options: { responsive: true, maintainAspectRatio: false, spanGaps: true }
  });

  // 2. Category Donut (sCatDonut)
  var cLabs = (cData.sCat || []).map(c => c.label);
  var cVals = (cData.sCat || []).map(c => c.count);
  if(charts.sCatDonut) charts.sCatDonut.destroy();
  charts.sCatDonut = new Chart(document.getElementById('sCatDonut'), {
    type: 'doughnut', data: { labels: cLabs, datasets: [{ data: cVals, backgroundColor: colorPalette, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // 3. Category Bar (sCatBar)
  var cAvg = (cData.sCat || []).map(c => c.avg);
  if(charts.sCatBar) charts.sCatBar.destroy();
  charts.sCatBar = new Chart(document.getElementById('sCatBar'), {
    type: 'bar', data: { labels: cLabs, datasets: [{ label: 'متوسط التقييم', data: cAvg, backgroundColor: 'rgba(59, 130, 246, 0.7)' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // 4. Location Bar (sLocBar)
  var locLabs = Object.keys(cData.sLoc || {});
  var locVals = locLabs.map(l => cData.sLoc[l]);
  if(charts.sLocBar) charts.sLocBar.destroy();
  charts.sLocBar = new Chart(document.getElementById('sLocBar'), {
    type: 'bar', data: { labels: locLabs, datasets: [{ label: 'عدد العينات', data: locVals, backgroundColor: 'rgba(16, 185, 129, 0.7)' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // 5. Matrix Table
  var mTable = '<thead><tr><th>الموقع</th>' + Array.from(catSet).map(c=>`<th>${c}</th>`).join('') + '</tr></thead><tbody>';
  Object.keys(cData.sLocCat || {}).forEach(loc => {
    mTable += `<tr><td><strong>${loc}</strong></td>`;
    Array.from(catSet).forEach(cat => {
      var d = cData.sLocCat[loc][cat];
      var val = d ? (d.s/d.c).toFixed(1) : '-';
      var bg = d ? `rgba(59, 130, 246, ${Math.max(0.1, (d.s/d.c)/5)})` : 'transparent';
      mTable += `<td style="background:${bg}; text-align:center;">${val}</td>`;
    });
    mTable += `</tr>`;
  });
  document.getElementById('sMatrixTable').innerHTML = mTable + '</tbody>';

  // 6. Radar Chart
  if(charts.sRadar) charts.sRadar.destroy();
  charts.sRadar = new Chart(document.getElementById('sRadar'), {
    type: 'radar', data: {
      labels: ['الاستقبال والتسجيل', 'بيئة المنشأة والنظافة', 'الرعاية الطبية', 'شبكة مقدمي الخدمة', 'المعامل والأشعة'],
      datasets: [{ label: 'متوسط الأداء', data: overallRadar, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', pointBackgroundColor: '#fff' }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 5 } } }
  });

  // 7. NPS
  var nps = cData.nps || {promoters:0, passives:0, detractors:0};
  if(charts.sNps) charts.sNps.destroy();
  charts.sNps = new Chart(document.getElementById('sNps'), {
    type: 'doughnut', data: {
      labels: ['داعمون (4-5)', 'محايدون (3)', 'منتقدون (1-2)'],
      datasets: [{ data: [nps.promoters, nps.passives, nps.detractors], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, circumference: 180, rotation: 270 }
  });

  // 8. Scatter Plot
  var scatterData = (cData.sFac || []).map(f => ({ x: f.count, y: f.avg, provider: f.label }));
  if(charts.sScatter) charts.sScatter.destroy();
  charts.sScatter = new Chart(document.getElementById('sScatter'), {
    type: 'scatter', data: {
      datasets: [{ label: 'الموردين', data: scatterData, backgroundColor: '#8b5cf6', pointRadius: 8, pointHoverRadius: 10 }]
    },
    options: { 
      responsive: true, maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw.provider} (العدد: ${ctx.raw.x}, التقييم: ${ctx.raw.y})` } } }
    }
  });

  // 9. Ranked Bar
  var fLabs = (cData.sFac || []).slice(0,10).map(f => f.label);
  var fVals = (cData.sFac || []).slice(0,10).map(f => f.avg);
  if(charts.sFacRank) charts.sFacRank.destroy();
  charts.sFacRank = new Chart(document.getElementById('sFacRank'), {
    type: 'bar', data: { labels: fLabs, datasets: [{ label: 'التقييم', data: fVals, backgroundColor: '#3b82f6', borderRadius: 5 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
  });

  // 10. Questions Grouped Bar
  var qCats = Object.keys(cData.sQues || {});
  var qDatasets = [];
  ['q1', 'q2', 'q3', 'q4', 'q5'].forEach((q, i) => {
    qDatasets.push({
      label: ['الاستقبال', 'البيئة', 'الرعاية', 'الشبكة', 'المعامل'][i],
      data: qCats.map(c => cData.sQues[c][q].c ? (cData.sQues[c][q].s / cData.sQues[c][q].c) : 0),
      backgroundColor: colorPalette[i]
    });
  });
  if(charts.sQuesGrouped) charts.sQuesGrouped.destroy();
  charts.sQuesGrouped = new Chart(document.getElementById('sQuesGrouped'), {
    type: 'bar', data: { labels: qCats, datasets: qDatasets },
    options: { responsive: true, maintainAspectRatio: false }
  });
}
