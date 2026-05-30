// ═══════════════════════════════════════════════════════════════
// admin.js — منطق لوحة متابعة الشكاوى
// UHIA Luxor System v2.0
// ═══════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────
var ADMIN = {
  token:       '',
  complaints:  [],
  currentPage: 1,
  pageSize:    20,
  totalPages:  1,
  totalCount:  0,
  filters:     {},
  currentId:   null,
  searchTimer: null,
};

// ─── Startup ──────────────────────────────────────────────────
window.addEventListener('load', function() {
  // تحقق من session مؤقتة
  var saved = sessionStorage.getItem('adminToken');
  if (saved) {
    ADMIN.token = saved;
    showPanel();
    loadComplaints();
  }
});

// ─── Login ────────────────────────────────────────────────────
function doLogin() {
  var pwd = document.getElementById('pwdInput').value;
  if (!pwd) { setLoginError('أدخل كلمة المرور'); return; }
  setLoginError('');
  setLoginLoading(true);

  callApi('adminLogin', { payload: { password: pwd } }, function(err, res) {
    setLoginLoading(false);
    if (err || !res || !res.success) {
      setLoginError('كلمة المرور غير صحيحة');
      return;
    }
    ADMIN.token = pwd;
    sessionStorage.setItem('adminToken', pwd);
    showPanel();
    loadComplaints();
  });
}

function logout() {
  sessionStorage.removeItem('adminToken');
  ADMIN.token = '';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminWrap').style.display   = 'none';
  document.getElementById('pwdInput').value = '';
}

function togglePwd() {
  var inp = document.getElementById('pwdInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function setLoginError(msg) {
  document.getElementById('loginError').textContent = msg;
}
function setLoginLoading(on) {
  var btn  = document.getElementById('loginBtn');
  var txt  = document.getElementById('loginBtnText');
  btn.disabled  = on;
  txt.textContent = on ? 'جارٍ التحقق...' : 'دخول';
}

function showPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminWrap').style.display   = 'flex';
}

// ─── Load Complaints ──────────────────────────────────────────
function loadComplaints() {
  showFullLoading(true);
  var filters = buildFilters();

  callApi('getComplaints', {
    token:   ADMIN.token,
    payload: { filters: filters, token: ADMIN.token },
  }, function(err, res) {
    showFullLoading(false);
    if (err || !res || !res.success) {
      if (res && res.error === 'غير مصرح') { logout(); return; }
      // Demo mode
      renderDemoComplaints();
      return;
    }
    ADMIN.complaints  = res.items || [];
    ADMIN.totalCount  = res.total || 0;
    ADMIN.currentPage = res.page  || 1;
    ADMIN.totalPages  = res.totalPages || 1;
    renderTable();
    renderPagination();
    renderTopbarStats();
  });
}

// ─── Build Filters from UI ────────────────────────────────────
function buildFilters() {
  var f = {
    status:   val('fStatus'),
    category: val('fCategory'),
    severity: val('fSeverity'),
    dateFrom: val('fDateFrom'),
    dateTo:   val('fDateTo'),
    search:   val('searchInput'),
    page:     ADMIN.currentPage,
    pageSize: ADMIN.pageSize,
  };
  // SLA breach quick filter
  if (ADMIN.filters.__breach) { f.slaBreached = 'نعم'; f.status = ''; }
  return f;
}

function applyFilters() {
  ADMIN.currentPage = 1;
  loadComplaints();
}

function resetFilters() {
  ['fStatus','fCategory','fSeverity','fDateFrom','fDateTo'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('searchInput').value = '';
  ADMIN.filters = {};
  document.querySelectorAll('.pill').forEach(function(p) { p.classList.remove('active'); });
  document.querySelector('.pill[data-status=""]').classList.add('active');
  ADMIN.currentPage = 1;
  loadComplaints();
}

function quickFilter(el, status) {
  document.querySelectorAll('.pill').forEach(function(p) { p.classList.remove('active'); });
  el.classList.add('active');
  ADMIN.filters.__breach = (status === '__breach');
  var fStatus = document.getElementById('fStatus');
  if (fStatus) fStatus.value = (status !== '__breach') ? status : '';
  ADMIN.currentPage = 1;
  loadComplaints();
}

function debounceSearch() {
  clearTimeout(ADMIN.searchTimer);
  ADMIN.searchTimer = setTimeout(applyFilters, 400);
}

// ─── Render Table ─────────────────────────────────────────────
function renderTable() {
  var tbody = document.getElementById('adminTableBody');
  var meta  = document.getElementById('tableMeta');
  if (!tbody) return;

  var total = ADMIN.totalCount;
  var start = (ADMIN.currentPage - 1) * ADMIN.pageSize + 1;
  var end   = Math.min(start + ADMIN.pageSize - 1, total);
  setText('tableMeta', 'عرض ' + start + ' – ' + end + ' من ' + total + ' شكوى');

  if (ADMIN.complaints.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="table-empty">لا توجد نتائج</td></tr>';
    return;
  }

  tbody.innerHTML = ADMIN.complaints.map(function(c) {
    var rowCls = c.slaBreached ? 'sla-breach' : '';
    return '<tr class="' + rowCls + '" onclick="openModal(\'' + c.id + '\')">'
      + '<td onclick="event.stopPropagation()"><input type="checkbox" class="row-check" value="' + c.id + '"></td>'
      + '<td><code style="font-size:.7rem;color:#60a5fa">' + (c.id||'') + '</code></td>'
      + '<td>' + escHtml(c.name||'') + '</td>'
      + '<td style="direction:ltr;text-align:right">' + (c.phone||'') + '</td>'
      + '<td>' + (c.category||'') + '</td>'
      + '<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(c.providerName||'') + '</td>'
      + '<td>' + statusBadge(c.status) + '</td>'
      + '<td>' + slaBadge(c.slaStatus, c.slaBreached) + '</td>'
      + '<td>' + severityBadge(c.severity) + '</td>'
      + '<td style="font-size:.7rem;color:#94a3b8;white-space:nowrap">' + fmtDate(c.timestamp) + '</td>'
      + '<td><button class="btn-action" onclick="event.stopPropagation();openModal(\'' + c.id + '\')">تحديث</button></td>'
      + '</tr>';
  }).join('');
}

// ─── Pagination ───────────────────────────────────────────────
function renderPagination() {
  var container = document.getElementById('pagination');
  if (!container) return;
  var tp = ADMIN.totalPages;
  var cp = ADMIN.currentPage;
  if (tp <= 1) { container.innerHTML = ''; return; }

  var html = '';
  html += '<button class="page-btn" onclick="gotoPage(' + (cp-1) + ')" ' + (cp<=1?'disabled':'') + '>← السابق</button>';
  for (var p = 1; p <= tp; p++) {
    if (p === 1 || p === tp || Math.abs(p - cp) <= 2) {
      html += '<button class="page-btn' + (p===cp?' active':'') + '" onclick="gotoPage(' + p + ')">' + p + '</button>';
    } else if (Math.abs(p - cp) === 3) {
      html += '<span style="color:#94a3b8;padding:0 4px">…</span>';
    }
  }
  html += '<button class="page-btn" onclick="gotoPage(' + (cp+1) + ')" ' + (cp>=tp?'disabled':'') + '>التالي →</button>';
  container.innerHTML = html;
}

function gotoPage(p) {
  if (p < 1 || p > ADMIN.totalPages) return;
  ADMIN.currentPage = p;
  loadComplaints();
}

// ─── Topbar Stats ─────────────────────────────────────────────
function renderTopbarStats() {
  var container = document.getElementById('topbarStats');
  if (!container) return;
  var c = ADMIN.complaints;
  var newCount  = ADMIN.complaints.filter(function(x){ return x.status==='جديدة'; }).length;
  container.innerHTML =
    '<div class="stat-chip"><strong>' + ADMIN.totalCount + '</strong> إجمالي</div>'
  + '<div class="stat-chip" style="color:#f87171"><strong>' + newCount + '</strong> جديدة</div>';
}

// ─── Modal ────────────────────────────────────────────────────
function openModal(id) {
  var c = ADMIN.complaints.find(function(x){ return x.id === id; });
  if (!c) return;
  ADMIN.currentId = id;

  document.getElementById('modalTitle').textContent = '📋 ' + id;

  // ── بناء تفاصيل الشكوى ──────────────────────────────────────
  var audioSection = '';
  if (c.hasAudio && c.audioUrl) {
    audioSection =
      '<div class="detail-item full">' +
        '<div class="detail-label">🎙️ التسجيل الصوتي</div>' +
        '<div class="detail-value">' +
          '<audio id="modalAudio" controls style="width:100%;border-radius:8px;margin-bottom:8px" src="' + c.audioUrl + '"></audio>' +
          '<button class="btn-transcribe" id="transcribeBtn" onclick="transcribeAudio()">' +
            '📝 تفريغ النص الصوتي (Speech-to-Text)' +
          '</button>' +
          '<div id="transcriptBox" class="transcript-box" style="display:none"></div>' +
        '</div>' +
      '</div>';
  }

  var imagesSection = '';
  if (c.hasImages && c.imageUrls && c.imageUrls.length > 0) {
    var imgs = Array.isArray(c.imageUrls) ? c.imageUrls : String(c.imageUrls).split(',');
    imagesSection =
      '<div class="detail-item full">' +
        '<div class="detail-label">📎 المرفقات (' + imgs.length + ' صورة)</div>' +
        '<div class="detail-value">' +
          '<div class="img-gallery">' +
            imgs.filter(Boolean).map(function(url, i) {
              var u = url.trim();
              return '<a href="' + u + '" target="_blank" class="img-thumb-wrap" title="صورة ' + (i+1) + '">' +
                       '<img src="' + u + '" class="img-thumb" onerror="this.parentElement.style.display=\'none\'">' +
                       '<span class="img-num">' + (i+1) + '</span>' +
                     '</a>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  document.getElementById('complaintDetails').innerHTML = [
    detailItem('الاسم',          c.name),
    detailItem('الرقم القومي',   c.nationalId),
    detailItem('الهاتف',         c.phone, 'dir="ltr"'),
    detailItem('الفئة',          c.category),
    detailItem('المنفذ',         c.providerName),
    detailItem('المنطقة',        c.location),
    detailItem('الحالة',         statusBadge(c.status)),
    detailItem('SLA',            slaBadge(c.slaStatus, c.slaBreached)),
    detailItem('الخطورة',        severityBadge(c.severity)),
    detailItem('تاريخ التقديم',  fmtDate(c.timestamp)),
    c.closedAt ? detailItem('تاريخ الإغلاق', fmtDate(c.closedAt)) : '',
    c.text ? '<div class="detail-item full"><div class="detail-label">💬 نص الشكوى</div><div class="detail-value complaint-text">' + escHtml(c.text) + '</div></div>' : '',
    audioSection,
    imagesSection,
    c.resolutionNote ? '<div class="detail-item full"><div class="detail-label">✅ ملاحظة الحل</div><div class="detail-value" style="color:#4ade80">' + escHtml(c.resolutionNote) + '</div></div>' : '',
  ].join('');

  document.getElementById('modalStatus').value   = c.status || '';
  document.getElementById('modalAssigned').value = c.assignedTo || '';
  document.getElementById('modalNote').value     = c.resolutionNote || '';
  document.getElementById('saveBtn').disabled    = false;

  document.getElementById('modalOverlay').classList.add('open');
}

// ─── Speech-to-Text (Web Speech API) ─────────────────────────
function transcribeAudio() {
  var btn = document.getElementById('transcribeBtn');
  var box = document.getElementById('transcriptBox');
  if (!box || !btn) return;

  // التحقق من دعم المتصفح
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    box.style.display = 'block';
    box.innerHTML = '<span style="color:#f87171">⚠️ متصفحك لا يدعم ميزة التعرف على الكلام. يُنصح باستخدام Google Chrome.</span>';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ جارٍ التفريغ... (شغّل الصوت أولاً)';
  box.style.display = 'block';
  box.innerHTML = '<div class="transcript-listening">🎙️ يستمع الآن... شغّل الملف الصوتي</div>';

  var recognition = new SpeechRecognition();
  recognition.lang = 'ar-EG';
  recognition.continuous = true;
  recognition.interimResults = true;

  var finalText = '';
  recognition.onresult = function(event) {
    var interim = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript + ' ';
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    box.innerHTML = '<div class="transcript-final">' + escHtml(finalText) + '</div>' +
                    (interim ? '<div class="transcript-interim">' + escHtml(interim) + '</div>' : '');
  };

  recognition.onerror = function(e) {
    box.innerHTML = '<span style="color:#f87171">⚠️ خطأ: ' + e.error + ' — تأكد من السماح للمتصفح بالميكروفون.</span>';
    btn.disabled = false;
    btn.textContent = '📝 إعادة المحاولة';
  };

  recognition.onend = function() {
    btn.disabled = false;
    btn.textContent = '📝 تفريغ مرة أخرى';
    if (!finalText.trim()) {
      box.innerHTML += '<div style="color:#fbbf24;margin-top:4px;font-size:.8rem">💡 نصيحة: شغّل الملف الصوتي فور الضغط على التفريغ.</div>';
    }
  };

  recognition.start();

  // إيقاف تلقائي بعد 120 ثانية
  setTimeout(function() { try { recognition.stop(); } catch(e){} }, 120000);
}


function detailItem(label, val, extra) {
  return '<div class="detail-item"><div class="detail-label">' + label + '</div>'
       + '<div class="detail-value" ' + (extra||'') + '>' + (val||'—') + '</div></div>';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
  ADMIN.currentId = null;
}

// ─── Save Update ──────────────────────────────────────────────
function saveUpdate() {
  var status = val('modalStatus');
  var note   = val('modalNote');
  var assign = val('modalAssigned');

  if (!status) { showToast('اختر الحالة الجديدة', 'error'); return; }
  if ((status === 'تم الحل' || status === 'مغلقة') && !note) {
    showToast('أدخل ملاحظة الحل عند الإغلاق', 'error'); return;
  }

  var btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = '⏳ جارٍ الحفظ...';

  callApi('updateComplaintStatus', {
    token:   ADMIN.token,
    payload: {
      complaintId:    ADMIN.currentId,
      status:         status,
      resolutionNote: note,
      assignedTo:     assign,
      token:          ADMIN.token,
    },
  }, function(err, res) {
    btn.disabled    = false;
    btn.textContent = '💾 حفظ التحديث';
    if (err || !res || !res.success) {
      showToast('فشل التحديث: ' + (res && res.error || 'خطأ'), 'error');
      return;
    }
    showToast('✅ تم التحديث بنجاح', 'success');
    document.getElementById('modalOverlay').classList.remove('open');
    loadComplaints(); // إعادة تحميل الجدول
  });
}

// ─── Export CSV ───────────────────────────────────────────────
function exportCsv() {
  if (ADMIN.complaints.length === 0) { showToast('لا توجد بيانات للتصدير', 'error'); return; }
  var headers = ['رقم الشكوى','التاريخ','الاسم','الهاتف','الفئة','المنفذ','الحالة','SLA','الخطورة','نص الشكوى'];
  var rows    = ADMIN.complaints.map(function(c) {
    return [
      c.id, fmtDate(c.timestamp), c.name, c.phone,
      c.category, c.providerName, c.status, c.slaStatus,
      c.severity, (c.text||'').replace(/\n/g,' ').substring(0,200),
    ].map(function(v){ return '"' + String(v||'').replace(/"/g,'""') + '"'; }).join(',');
  });
  var csv  = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'شكاوى-' + new Date().toLocaleDateString('ar-EG').replace(/\//g,'-') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ تم تصدير ' + ADMIN.complaints.length + ' شكوى', 'success');
}

// ─── Select All ───────────────────────────────────────────────
function toggleSelectAll(master) {
  document.querySelectorAll('.row-check').forEach(function(c){ c.checked = master.checked; });
}

// ─── Demo Mode ───────────────────────────────────────────────
function renderDemoComplaints() {
  var statuses = ['جديدة','تحت المراجعة','تم الحل','مغلقة'];
  var cats     = ['وحدة صحية','مستشفى رعاية','مستشفى متعاقد','معمل متعاقد'];
  var sevs     = ['عالٍ','متوسط','منخفض'];
  var slaStats = ['في الوقت','تحذير','متأخرة'];
  var names    = ['أحمد محمد','فاطمة علي','محمد حسن','سارة إبراهيم','خالد عبدالله'];
  var demo     = [];
  for (var i = 0; i < 15; i++) {
    demo.push({
      id:          'CMP-260' + String(i).padStart(3,'0') + '-' + (1000+i),
      timestamp:   new Date(Date.now() - i * 86400000),
      name:        names[i % names.length],
      nationalId:  '2901' + String(i).padStart(10,'0'),
      phone:       '0101234' + String(i).padStart(4,'0'),
      category:    cats[i % cats.length],
      providerCode: 'UNIT00' + (i+1),
      providerName: 'وحدة طب أسرة #' + (i+1),
      location:    'الأقصر',
      status:      statuses[i % statuses.length],
      slaStatus:   slaStats[i % slaStats.length],
      slaBreached: (i % 5 === 0),
      severity:    sevs[i % sevs.length],
      text:        'هذه شكوى تجريبية رقم ' + (i+1) + ' — يعمل النظام في وضع العرض التجريبي.',
      hasAudio:    false, audioUrl: '',
      assignedTo: '', resolutionNote: '',
    });
  }
  ADMIN.complaints = demo;
  ADMIN.totalCount = demo.length;
  ADMIN.totalPages = 1;
  renderTable();
  renderPagination();
  renderTopbarStats();
  setText('tableMeta', '⚠️ بيانات تجريبية — اربط Apps Script للبيانات الحقيقية');
  showFullLoading(false);
}

// ─── API Call ─────────────────────────────────────────────────
function callApi(action, params, cb) {
  var url = (typeof SCRIPT_URL !== 'undefined' && SCRIPT_URL && SCRIPT_URL.indexOf('script.google.com') !== -1)
    ? SCRIPT_URL : null;

  if (!url) { setTimeout(function(){ cb(new Error('no url'), null); }, 300); return; }

  var body = JSON.stringify(Object.assign({ action: action }, params || {}));
  var ctrl = new AbortController();
  var t    = setTimeout(function(){ ctrl.abort(); }, 25000);
  fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: body, signal: ctrl.signal,
  })
  .then(function(r){ clearTimeout(t); return r.json(); })
  .then(function(d){ cb(null, d); })
  .catch(function(e){ clearTimeout(t); cb(e, null); });
}

// ─── Utilities ───────────────────────────────────────────────
function val(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function setText(id, v) { var e=document.getElementById(id); if(e) e.textContent=v; }
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function fmtDate(ts) {
  if (!ts) return '---';
  try { return new Date(ts).toLocaleDateString('ar-EG',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch(e){ return String(ts).slice(0,16); }
}
function showFullLoading(on) {
  var el=document.getElementById('fullLoading');
  if(el) el.style.display = on ? 'flex' : 'none';
}
function showToast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'toast ' + (type||'info') + ' show';
  setTimeout(function(){ el.classList.remove('show'); }, 4000);
}
function statusBadge(s) {
  var map={'جديدة':'badge-new','تحت المراجعة':'badge-review','تم الحل':'badge-resolved','مغلقة':'badge-closed'};
  return '<span class="badge '+(map[s]||'badge-closed')+'">'+(s||'')+'</span>';
}
function slaBadge(slaStatus, breached) {
  if(slaStatus==='متأخرة'||breached) return '<span class="badge badge-breach">متأخرة ⚠️</span>';
  if(slaStatus==='تحذير')            return '<span class="badge badge-warn">تحذير 🕐</span>';
  return '<span class="badge badge-ok">في الوقت ✓</span>';
}
function severityBadge(s) {
  if(s==='عالٍ')  return '<span class="badge badge-high">عالٍ 🔴</span>';
  if(s==='متوسط') return '<span class="badge badge-medium">متوسط 🟡</span>';
  return '<span class="badge badge-low">منخفض 🟢</span>';
}
