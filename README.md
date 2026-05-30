# 🏥 UHIA Luxor System — دليل النشر الشامل
**الهيئة العامة للتأمين الصحي الشامل — فرع الأقصر | الإصدار 2.0.0**

---

## 🗺️ هيكل المشروع

```
UHIA-Luxor-System/
├── index.html          ← نموذج الشكاوى/الاستبيانات (للمرضى)
├── config.js           ← إعداد رابط Apps Script
├── data.js             ← بيانات المنافذ والأسئلة
├── scripts.js          ← منطق النموذج
├── styles.css          ← تصميم النموذج
│
├── dashboard/          ← لوحة Dashboard التنفيذية
│   ├── index.html
│   ├── dashboard.css
│   └── dashboard.js
│
├── admin/              ← لوحة متابعة الشكاوى (للفريق)
│   ├── index.html
│   ├── admin.css
│   └── admin.js
│
└── apps-script/        ← كود Google Apps Script
    ├── Code.gs         ← الراوتر الرئيسي
    ├── Config.gs       ← إعدادات النظام
    ├── SheetHelper.gs  ← دوال Google Sheets
    ├── ComplaintHandler.gs
    ├── SurveyHandler.gs
    ├── SlaMonitor.gs
    ├── AnalyticsEngine.gs
    ├── DashboardApi.gs
    └── AdminApi.gs
```

---

## 🚀 خطوات النشر (الترتيب مهم جداً)

### الخطوة 1: إنشاء Google Sheets

1. افتح [Google Sheets](https://sheets.google.com) وأنشئ ملفاً جديداً باسم `UHIA-Luxor-System`
2. انسخ معرف الملف من الرابط:
   ```
   https://docs.google.com/spreadsheets/d/[معرف الملف]/edit
   ```

### الخطوة 2: رفع Apps Script

1. افتح [Google Apps Script](https://script.google.com)
2. أنشئ مشروعاً جديداً باسم `UHIA-Luxor-Backend`
3. **انسخ كل ملف** من مجلد `apps-script/` إلى المشروع:
   - `Code.gs` — ستجده موجوداً بالاسم الافتراضي، استبدله
   - أضف ملفات جديدة للباقي: `Config.gs`, `SheetHelper.gs`, إلخ
4. **في ملف `Config.gs`**, استبدل:
   ```javascript
   SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',
   ```
   بمعرف الشيت الذي نسخته في الخطوة 1

### الخطوة 3: تهيئة النظام

1. في محرر Apps Script، اختر دالة `initializeSystem` من القائمة المنسدلة
2. اضغط **▶ تشغيل**
3. وافق على صلاحيات الوصول (Google Drive & Sheets)
4. ستُنشأ **8 شيتات** تلقائياً بالهيكل الصحيح

### الخطوة 4: نشر كـ Web App

1. في Apps Script، اذهب إلى: **النشر → نشر جديد**
2. اختر النوع: **تطبيق ويب (Web App)**
3. الإعدادات:
   - **Execute as**: Me
   - **Who has access**: Anyone (مطلوب للنموذج العام)
4. اضغط **نشر**
5. **انسخ رابط الـ Web App** (يبدأ بـ `https://script.google.com/macros/s/...`)

### الخطوة 5: تحديث config.js

افتح ملف `config.js` وحدّث:
```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

### الخطوة 6: النشر على GitHub Pages

```bash
git init
git add .
git commit -m "UHIA Luxor System v2.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/uhia-luxor-system.git
git push -u origin main
```
ثم في إعدادات GitHub Repository:
- **Settings → Pages → Source**: `main` branch, `/ (root)` folder
- الموقع سيكون: `https://username.github.io/uhia-luxor-system/`

---

## 🔗 الروابط بعد النشر

| الواجهة | الرابط |
|---------|-------|
| نموذج المرضى | `https://username.github.io/uhia-luxor-system/` |
| لوحة الداشبورد | `https://username.github.io/uhia-luxor-system/dashboard/` |
| لوحة الإدارة | `https://username.github.io/uhia-luxor-system/admin/` |

---

## 🔐 الأمان

### كلمة مرور الإدارة
كلمة المرور الافتراضية هي: `UHIA-LUXOR-2026`

**لتغييرها:**
1. في لوحة الإدارة، الدخول بالكلمة الحالية
2. أو مباشرة من Apps Script:
   ```javascript
   PropertiesService.getScriptProperties()
     .setProperty('ADMIN_PASSWORD', 'كلمة_المرور_الجديدة');
   ```

### بريد التنبيهات (SLA Alerts)
في شيت `Settings`، حدّث الصف:
| key | value |
|-----|-------|
| `alert_email` | your@email.com |

---

## ⚙️ إعداد التنبيهات التلقائية

بعد التهيئة، يُشغَّل تلقائياً:
- **SLA Monitor**: كل ساعة ← يفحص الشكاوى المتأخرة ويُرسل إشعاراً
- **KPI Refresh**: كل 30 دقيقة ← يُحدِّث مؤشرات الداشبورد

لإعادة إنشاء الـ Triggers يدوياً:
```javascript
// في Apps Script Console:
setupSlaMonitorTrigger();
setupKpiRefreshTrigger();
```

---

## 🗃️ هيكل Google Sheets

| الشيت | الوصف |
|-------|-------|
| `Settings` | إعدادات النظام |
| `Providers` | قائمة المنافذ |
| `Questions` | بنك الأسئلة |
| `Complaints` | سجل الشكاوى (**24 عمود**) |
| `Surveys` | سجل الاستبيانات (**34 عمود**) |
| `SLA_Log` | سجل متابعة SLA |
| `AuditLog` | سجل كل التعديلات |
| `KPI_Cache` | مخزن مؤقت للمؤشرات |

---

## 🔄 حالات الشكوى

```
جديدة → تحت المراجعة → تم الحل → مغلقة
```

| الحالة | اللون | المعنى |
|--------|-------|--------|
| جديدة | 🔴 | لم تُعالج بعد |
| تحت المراجعة | 🟡 | يعمل عليها الفريق |
| تم الحل | 🟢 | حُلَّت بنجاح |
| مغلقة | ⚫ | أُغلقت بشكل نهائي |

---

## 📊 مؤشرات الأداء (KPIs)

| المؤشر | الوصف |
|--------|-------|
| إجمالي الشكاوى | عدد كل الشكاوى المسجلة |
| مفتوحة | جديدة + تحت المراجعة |
| تم حلها | محلولة + مغلقة |
| نسبة SLA | (غير متأخرة ÷ الكل) × 100% |
| معدل الرضا | متوسط درجات التقييم (من 5) |
| متوسط وقت الإغلاق | متوسط الساعات من الفتح للإغلاق |

---

## 🐛 حل المشكلات الشائعة

### الواجهة لا تُرسل البيانات
- تأكد أن `SCRIPT_URL` في `config.js` صحيح
- تأكد أن النشر تم بصلاحية **"Anyone"**
- افتح رابط Apps Script في المتصفح مباشرة وتحقق من Health Check

### الداشبورد يعرض بيانات تجريبية
- هذا طبيعي قبل ربط `SCRIPT_URL`
- بعد الربط سيُحمِّل البيانات الحقيقية تلقائياً

### خطأ في إنشاء الشيتات
- تأكد أنك حددت `SHEET_ID` الصحيح في `Config.gs`
- تأكد من صلاحيات الوصول للـ Spreadsheet

---

## 📝 التطوير المستقبلي

- [ ] تصدير تقارير PDF للشكاوى
- [ ] إشعارات WhatsApp/SMS للمريض
- [ ] إضافة فلتر تاريخي للداشبورد
- [ ] نموذج متابعة المريض لحالته

---

**Developed by Abdalrhman Ashraf | UHIA Luxor Branch | 2026**
