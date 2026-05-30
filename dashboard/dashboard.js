// ═══════════════════════════════════════════════════════════════
// Premium Dashboard JS v3.2 (CRM Analytics)
// UHIA Luxor System
// ═══════════════════════════════════════════════════════════════

var API_URL = window.SCRIPT_URL || '';

// كائنات الرسوم البيانية لتحديثها لاحقاً
var charts = {
  fac: null, cat: null, trend: null, nps: null, radar: null, surveyFac: null, surveyTrend: null
};

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

  // 4. NPS (Doughnut as Gauge)
  var nps = cData.nps || {promoters:0, passives:0, detractors:0};
  if(charts.nps) charts.nps.destroy();
  charts.nps = new Chart(document.getElementById('npsChart'), {
    type: 'doughnut',
    data: {
      labels: ['داعمون (Promoters)', 'محايدون (Passives)', 'منتقدون (Detractors)'],
      datasets: [{ data: [nps.promoters, nps.passives, nps.detractors], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, circumference: 180, rotation: 270, plugins: { legend: { position: 'bottom' } } }
  });

  // 5. Survey Radar
  var radarData = cData.surveyRadar || [0,0,0,0,0];
  if(charts.radar) charts.radar.destroy();
  charts.radar = new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: {
      labels: ['الاستقبال والتسجيل', 'بيئة المنشأة والنظافة', 'الرعاية الطبية', 'شبكة مقدمي الخدمة', 'المعامل والأشعة'],
      datasets: [{ label: 'متوسط التقييم (من 10)', data: radarData, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', pointBackgroundColor: '#fff' }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, display: false } } } }
  });
  // 6. Survey Facilities
  var sFacLabels = (cData.surveyFacilities || []).map(f => f.label);
  var sFacVals = (cData.surveyFacilities || []).map(f => f.avgNps);
  if(charts.surveyFac) charts.surveyFac.destroy();
  charts.surveyFac = new Chart(document.getElementById('surveyFacChart'), {
    type: 'bar',
    data: {
      labels: sFacLabels,
      datasets: [{ label: 'متوسط مؤشر الولاء', data: sFacVals, backgroundColor: 'rgba(139, 92, 246, 0.7)', borderRadius: 5 }]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
  });

  // 7. Survey Trend
  var sTrLabels = Object.keys(cData.surveyTrend || {}).sort();
  var sTrVals = sTrLabels.map(l => cData.surveyTrend[l]);
  if(charts.surveyTrend) charts.surveyTrend.destroy();
  charts.surveyTrend = new Chart(document.getElementById('surveyTrendChart'), {
    type: 'line',
    data: {
      labels: sTrLabels,
      datasets: [{ label: 'متوسط الرضا اليومي', data: sTrVals, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.4 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}
