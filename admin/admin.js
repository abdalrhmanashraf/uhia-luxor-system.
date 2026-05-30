// ═══════════════════════════════════════════════════════════════
// Premium Admin JS
// UHIA Luxor System v3.0
// ═══════════════════════════════════════════════════════════════

var API_URL = window.SCRIPT_URL || '';
var currentUser = null;
var complaintsData = [];
var currentComplaintId = null;

// ─── إعداد الصفحة ───
window.addEventListener('load', function() {
  var savedUser = localStorage.getItem('uhia_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showAdminPanel();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminWrap').style.display = 'none';
  }
});

// ─── تسجيل الدخول ───
function togglePwd() {
  var input = document.getElementById('pwdInput');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function doLogin() {
  var phone = document.getElementById('phoneInput').value.trim();
  var pwd = document.getElementById('pwdInput').value.trim();
  var err = document.getElementById('loginError');
  var btnText = document.getElementById('loginBtnText');

  if (!phone || !pwd) {
    err.innerText = 'الرجاء إدخال رقم الهاتف وكلمة المرور';
    return;
  }
  
  if (!API_URL) {
    err.innerText = 'خطأ: لم يتم العثور على رابط API.';
    return;
  }

  err.innerText = '';
  btnText.innerText = 'جارٍ التحقق...';
  
  var payload = { action: 'login', phone: phone, password: pwd };
  
  fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors', // لا يمكننا قراءة الرد المباشر بسبب سياسات جوجل مع POST أحيانا، لذلك نستخدم JSONP كبديل، 
    // ولكن نظرًا لأن الكود في جوجل تم إعداده للرد عبر JSON، سنحاول استخدامه.
    // ملاحظة: Google Apps Script POST requests from browser often require no-cors, which makes reading response impossible.
    // للحصول على ردود من POST في Apps Script يجب تفعيل CORS، أو استخدام طريقة تعتمد على fetch عادي.
    // بناء على الطريقة المتبعة: سنرسل بـ text/plain 
  });
  
  // التصحيح: الطريقة الأمثل للـ Apps script هي إرسال Post بـ text/plain 
  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  })
  .then(function(res) { return res.json(); })
  .then(function(res) {
    if (res.success) {
      currentUser = res.user;
      localStorage.setItem('uhia_user', JSON.stringify(currentUser));
      showAdminPanel();
    } else {
      err.innerText = res.message || 'بيانات الدخول غير صحيحة';
      btnText.innerText = 'تسجيل الدخول';
    }
  })
  .catch(function(error) {
    console.error(error);
    err.innerText = 'حدث خطأ في الاتصال بالخادم.';
    btnText.innerText = 'تسجيل الدخول';
  });
}

function logout() {
  localStorage.removeItem('uhia_user');
  location.reload();
}

function showAdminPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminWrap').style.display = 'flex';
  
  document.getElementById('displayUserName').innerText = currentUser.name;
  document.getElementById('displayUserRole').innerText = currentUser.role === 'admin' ? 'مدير نظام' : 'موظف';
  
  loadData();
}

// ─── تحميل وعرض البيانات ───
function loadData() {
  showLoading(true);
  fetch(API_URL + '?action=getAllComplaints')
    .then(function(res) { return res.json(); })
    .then(function(res) {
      showLoading(false);
      if (res.success) {
        complaintsData = res.data;
        renderTable(complaintsData);
      } else {
        showToast('فشل تحميل البيانات', 'error');
      }
    })
    .catch(function(err) {
      showLoading(false);
      showToast('خطأ في الاتصال', 'error');
    });
}

function renderTable(data) {
  var tbody = document.getElementById('adminTableBody');
  var meta = document.getElementById('tableMeta');
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">لا توجد شكاوى لعرضها</td></tr>';
    meta.innerText = 'العدد: 0';
    return;
  }
  
  meta.innerText = 'العدد: ' + data.length + ' شكوى';
  var html = '';
  
  for (var i = 0; i < data.length; i++) {
    var c = data[i];
    
    // Status Badge
    var statusClass = 'closed';
    if (c.status === 'جديدة') statusClass = 'new';
    else if (c.status === 'تحت المراجعة') statusClass = 'review';
    else if (c.status === 'تم الحل') statusClass = 'resolved';
    
    // Severity Badge
    var sevClass = 'sev-low';
    if (c.severity === 'عالٍ' || c.severity === 'عالي') sevClass = 'sev-high';
    else if (c.severity === 'متوسط') sevClass = 'sev-med';
    
    html += '<tr>';
    html += '  <td><strong>#' + (c.id || '-') + '</strong></td>';
    html += '  <td>' + (c.name || 'مجهول') + '<br><small style="color:#94a3b8">' + (c.phone || '-') + '</small></td>';
    html += '  <td>' + (c.facility || '-') + '<br><small style="color:#94a3b8">' + (c.category || '-') + '</small></td>';
    html += '  <td><span class="badge ' + statusClass + '">' + (c.status || '-') + '</span></td>';
    html += '  <td><span class="badge ' + sevClass + '">' + (c.severity || '-') + '</span></td>';
    html += '  <td><button class="btn-icon" onclick="openModal(\'' + c.id + '\')">👁️ عرض</button></td>';
    html += '  <td><button class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openModal(\'' + c.id + '\')">معالجة ⚙️</button></td>';
    html += '</tr>';
  }
  
  tbody.innerHTML = html;
}

// ─── الفلاتر ───
var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 300);
}

function applyFilters() {
  var s = document.getElementById('searchInput').value.toLowerCase();
  var st = document.getElementById('fStatus').value;
  var sv = document.getElementById('fSeverity').value;
  
  var filtered = complaintsData.filter(function(c) {
    var matchSearch = !s || (c.name||'').toLowerCase().includes(s) || (c.id||'').toString().includes(s);
    var matchStatus = !st || c.status === st;
    var matchSev = !sv || c.severity === sv;
    return matchSearch && matchStatus && matchSev;
  });
  
  renderTable(filtered);
}

// ─── النافذة المنبثقة (Modal) ───
function openModal(id) {
  var c = complaintsData.find(function(x) { return String(x.id) === String(id); });
  if (!c) return;
  currentComplaintId = id;
  
  // ملء التفاصيل
  var details = document.getElementById('complaintDetails');
  details.innerHTML = `
    <p>رقم الشكوى: <strong>#${c.id}</strong></p>
    <p>مقدم الشكوى: <strong>${c.name} (${c.phone})</strong></p>
    <p>المنشأة: <strong>${c.facility}</strong></p>
    <p>تاريخ التسجيل: <strong>${c.date}</strong></p>
  `;
  
  // تعيين القيم الحالية في الفورم
  document.getElementById('modalStatus').value = c.status || 'جديدة';
  document.getElementById('modalNote').value = '';
  
  document.getElementById('modalOverlay').style.display = 'flex';
  setTimeout(function() {
    document.getElementById('modalOverlay').classList.add('show');
  }, 10);
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay') && e.target.className !== 'btn-close' && e.target.className !== 'btn-secondary') return;
  document.getElementById('modalOverlay').classList.remove('show');
  setTimeout(function() {
    document.getElementById('modalOverlay').style.display = 'none';
  }, 300);
}

// ─── الحفظ ───
function saveUpdate() {
  var newStatus = document.getElementById('modalStatus').value;
  var note = document.getElementById('modalNote').value;
  
  if (!newStatus) return showToast('يجب اختيار حالة!', 'error');
  
  document.getElementById('saveBtn').innerText = 'جارٍ الحفظ...';
  
  var payload = {
    action: 'updateComplaint',
    id: currentComplaintId,
    status: newStatus,
    note: note,
    assigned: currentUser.name // وضع اسم الموظف من الجلسة الحالية
  };
  
  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  })
  .then(function(res) { return res.json(); })
  .then(function(res) {
    document.getElementById('saveBtn').innerText = '💾 حفظ الإجراءات';
    if (res.success) {
      showToast('تم التحديث بنجاح!');
      closeModal();
      loadData(); // إعادة التحميل لتحديث الجدول
    } else {
      showToast('خطأ: ' + res.message, 'error');
    }
  })
  .catch(function(err) {
    document.getElementById('saveBtn').innerText = '💾 حفظ الإجراءات';
    showToast('خطأ في الاتصال بالخادم', 'error');
  });
}

// ─── Helpers ───
function showLoading(show) {
  document.getElementById('fullLoading').style.display = show ? 'flex' : 'none';
}

function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.innerText = msg;
  if (type === 'error') t.classList.add('error');
  else t.classList.remove('error');
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}
