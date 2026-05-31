// ==========================================
// Config - Global Settings
// ==========================================

// الرابط الجديد بعد التحديث
var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz6NJ7JgZhpGNxWlmGTDa5vXawv_z2lrjC6q7XW4GzeyhvmHf7sokA5JXMKOoTuWtu8vw/exec';

// اسم الفرع (مستخدم في الواجهات)
var BRANCH_NAME = 'فرع الأقصر';

// لضمان الوصول للرابط في كل المتصفحات
window.SCRIPT_URL = SCRIPT_URL;
window.BRANCH_NAME = BRANCH_NAME;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCRIPT_URL: SCRIPT_URL };
}
