// ═══════════════════════════════════════════════════════════════
// Premium Dashboard JS
// UHIA Luxor System v3.0
// ═══════════════════════════════════════════════════════════════

var API_URL = window.SCRIPT_URL || '';

window.addEventListener('load', function() {
  updateClock();
  setInterval(updateClock, 1000);
  loadData();
});

// ─── الساعة ───
function updateClock() {
  var now = new Date();
  document.getElementById('clockTime').innerText = now.toLocaleTimeString('ar-EG');
  document.getElementById('clockDate').innerText = now.toLocaleDateString('ar-EG');
}

// ─── التبديل بين الأقسام ───
function switchSection(secId) {
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  document.querySelectorAll('.content-sections > section').forEach(s => s.classList.remove('active-sec'));
  document.getElementById(secId).classList.add('active-sec');
}

// ─── جلب وعرض البيانات ───
function loadData() {
  if (!API_URL) {
    alert('رابط API غير موجود!');
    return;
  }
  
  document.getElementById('fullLoading').style.display = 'flex';
  
  fetch(API_URL + '?action=getDashboardData')
    .then(res => res.json())
    .then(res => {
      document.getElementById('fullLoading').style.display = 'none';
      if (res.success) {
        renderKPIs(res.kpi, res.analytics.surveyCount);
        renderRecent(res.recent);
        renderRepeated(res.analytics.repeatedPatients);
        renderTopStaff(res.analytics.topEmployees);
      } else {
        alert('خطأ في جلب البيانات: ' + res.error);
      }
    })
    .catch(err => {
      document.getElementById('fullLoading').style.display = 'none';
      console.error(err);
      alert('تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    });
}

// ─── تحديث الشاشات ───
function renderKPIs(kpi, surveyCount) {
  document.getElementById('kpiTotal').innerText = kpi.total;
  document.getElementById('kpiOpen').innerText = kpi.open;
  document.getElementById('kpiResolved').innerText = kpi.resolved;
  document.getElementById('kpiSla').innerText = kpi.slaCompliance + '%';
  document.getElementById('kpiSurveyTotal').innerText = surveyCount || '--';
}

function renderRecent(recent) {
  var container = document.getElementById('recentList');
  if (!recent || recent.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8; padding:20px;">لا توجد شكاوى حديثة.</p>';
    return;
  }
  
  var html = '';
  recent.forEach(function(r) {
    html += `
      <div class="recent-item">
        <h4>${r.name || 'مجهول'} <span style="font-size:0.8rem; color:var(--primary);">#${r.id}</span></h4>
        <p>${r.facility} - ${r.category}</p>
        <div style="margin-top:8px;">
          <span class="badge ${r.status === 'تم الحل' ? 'success' : 'warning'}" style="font-size:0.75rem; padding:2px 8px; border-radius:10px; border:1px solid currentColor;">${r.status}</span>
          <span style="font-size:0.75rem; color:#94a3b8; float:left;">${r.date}</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderRepeated(patients) {
  var tbody = document.getElementById('repeatedBody');
  if (!patients || patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">النظام مستقر. لا يوجد مرضى متكررين بكثرة.</td></tr>';
    return;
  }
  
  var html = '';
  patients.forEach(function(p) {
    var warningLevel = p.count > 3 ? '🔴 خطير جداً' : (p.count > 2 ? '🟠 تحذير' : '🟡 تنبيه');
    html += `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td><span class="badge-danger">${p.count} شكاوى</span></td>
        <td>${warningLevel}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderTopStaff(staff) {
  var tbody = document.getElementById('staffBody');
  if (!staff || staff.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">لم يتم حل شكاوى بعد لتسجيل أداء الموظفين.</td></tr>';
    return;
  }
  
  var html = '';
  staff.forEach(function(s, index) {
    var medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
    html += `
      <tr>
        <td>${medal} <strong>${s.name}</strong></td>
        <td>${s.resolvedCount} شكاوى</td>
        <td>${s.avgSpeedHours} ساعة / للشكوى</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}
