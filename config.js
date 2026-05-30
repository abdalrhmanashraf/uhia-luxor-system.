// ==========================================
// Config - Global Settings
// ==========================================

// الرابط الجديد بعد التحديث
var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_Z-lvfMPKOGcIRPvkvjD3eXnLl3ymX3G-s107B6cMO_daGnFc11TdfOp7FfqQJKg/exec';

// لضمان الوصول للرابط في كل المتصفحات
window.SCRIPT_URL = SCRIPT_URL;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCRIPT_URL: SCRIPT_URL };
}
