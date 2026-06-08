# Department Assessment Tool

تطبيق داخلي بسيط لإجراء مقابلات رؤساء الإدارات، توثيق سير العمل الحالي، تحليل المشكلات، واقتراح حلول التحول الرقمي.

## التقنيات

- Frontend: React + Vite + Tailwind CSS (واجهة عربية RTL)
- Backend: Node.js + Express
- Database: SQLite

## الميزات

- صفحات رئيسية: لوحة التحكم، الإدارات، المقابلات، المشكلات، التقارير.
- CRUD كامل للإدارات والمقابلات والمشكلات.
- حساب تلقائي لـ `priority_score` في قاعدة البيانات:
  - `priority_score = severity_score * frequency_score * urgency_score`
- لوحة تحكم تعرض:
  - إجمالي الإدارات
  - إجمالي المقابلات
  - إجمالي المشكلات
  - عدد المشكلات عالية الأولوية
  - أعلى المشكلات حسب الأولوية
- صفحة تقارير بفلترة حسب الإدارة والحد الأدنى للأولوية.
- تصدير CSV للمشكلات والمقابلات.

## التشغيل المحلي

### 1) تشغيل الـ Backend

```bash
cd /tmp/workspace/munjed80/department-assessment-tool/server
npm install
npm run start
```

يعمل افتراضيًا على:
- `http://localhost:4000`

### 2) تشغيل الـ Frontend

```bash
cd /tmp/workspace/munjed80/department-assessment-tool/client
npm install
npm run dev
```

يعمل افتراضيًا على:
- `http://localhost:5173`

الواجهة تتصل تلقائيًا بـ `http://localhost:4000/api`.

## متغيرات اختيارية للواجهة

يمكن تغيير عنوان API عبر متغير البيئة:

```bash
VITE_API_URL=http://localhost:4000/api
```

