// ==========================================
// Config - Global Settings
// ==========================================

// الرابط الجديد بعد التحديث
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_Z-lvfMPKOGcIRPvkvjD3eXnLl3ymX3G-s107B6cMO_daGnFc11TdfOp7FfqQJKg/exec';

// تصدير للوصول من باقي الملفات إذا لزم الأمر (לبيئات العمل الحديثة)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCRIPT_URL };
}
