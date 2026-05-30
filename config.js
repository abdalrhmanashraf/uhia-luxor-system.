// ==========================================
// Config - Global Settings
// ==========================================

// الرابط الجديد بعد التحديث
var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz11Rpl6DCNeuyJ1KTOIGQT3c3eZbx2TAQmW2fuDACB8tTp1jyDlx2SDrTHqyz9EgZHWg/exec';

// اسم الفرع (مستخدم في الواجهات)
var BRANCH_NAME = 'فرع الأقصر';

// لضمان الوصول للرابط في كل المتصفحات
window.SCRIPT_URL = SCRIPT_URL;
window.BRANCH_NAME = BRANCH_NAME;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCRIPT_URL: SCRIPT_URL };
}
