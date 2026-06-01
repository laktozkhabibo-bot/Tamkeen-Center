# منظومة مركز تمكين

نظام تعليمي ثنائي اللغة (عربي/إنجليزي) متّصل بقاعدة بيانات **Supabase**: واجهة عامة + لوحات للطلاب والمعلمين والإدارة (المدير وشؤون الطلاب)، مع نظام مقررات ودرجات واعتماد.

> **مهم:** هذا **موقع ثابت (Static Site)** — React وBabel يُحمَّلان من CDN وتُترجم ملفات `src/*.jsx` في المتصفح مباشرةً. **لا توجد خطوة تجميع (bundling) معقّدة**، لذا لا تحدث «أخطاء بناء». خطوة البناء الوحيدة هي توليد ملف `env.js` من متغيّرات البيئة.

---

## 🚀 التشغيل المحلي

```bash
# 1) جهّز ملف الإعدادات المحلي
cp env.example.js env.js        # ثم املأ المفتاحين بداخله
#    (أو) cp .env.example .env && npm run build   لتوليد env.js تلقائيًا

# 2) شغّل خادمًا محليًا
npm install
npm run dev                     # يفتح على http://localhost:8000
```

افتح `http://localhost:8000` → سيُحمَّل `index.html` (التطبيق الرئيسي).

---

## 🔐 إعداد قاعدة البيانات (مرة واحدة)

في Supabase → **SQL Editor** → شغّل بالترتيب:

1. `supabase/setup.sql`      — الجداول الأساسية والصلاحيات (RLS) والحسابات.
2. `supabase/setup-v2.sql`   — المنهج والمقررات والدرجات.
3. `supabase/setup-v3.sql`   — التنظيف + الصور + المجموعات + دوال إنشاء/حذف المستخدمين.

**حسابات الدخول بعد التنظيف** (كلمة المرور `1234`): المدير `DIR1` · شؤون الطلاب `K100`.
تُضيف باقي المعلمين والطلاب من لوحة الإدارة.

---

## 🔑 عزل مفاتيح Supabase

المفاتيح **ليست مكتوبة في الكود**؛ تُقرأ من `env.js` الذي يضبط متغيّرين عامّين:

```js
window.TAMKEEN_SUPABASE_URL = "https://xxxx.supabase.co";
window.TAMKEEN_SUPABASE_ANON_KEY = "eyJhbGci...";
```

- `env.js` و`.env` **مُستثنيان من Git** (انظر `.gitignore`) — لن يُرفعا على GitHub.
- `env.example.js` و`.env.example` قوالب آمنة للرفع.
- عند النشر، يُولِّد `scripts/generate-env.js` ملف `env.js` من متغيّرات البيئة.

> **ملاحظة أمنية:** مفتاح `anon` **عام بطبيعته وآمن في المتصفح** — الحماية الحقيقية من سياسات **RLS** في القاعدة. عزله هنا للنظافة وسهولة التدوير فقط. **لا تضع مفتاح `service_role` في أي ملف يصل للمتصفح إطلاقًا.**

---

## ☁️ النشر

اضبط في لوحة المنصّة متغيّرين:

| المتغيّر | القيمة |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (anon) |

### Vercel
الإعداد جاهز في `vercel.json`:
- Framework Preset: **Other** · Build Command: `node scripts/generate-env.js` · Output Directory: `.`
- أضف المتغيّرين في **Settings → Environment Variables** ثم Deploy.

### Netlify
الإعداد جاهز في `netlify.toml` (Build: `node scripts/generate-env.js` · Publish: `.`).
أضف المتغيّرين في **Site settings → Environment variables** ثم Deploy.

### GitHub
ادفع المستودع كما هو — `env.js`/`.env` لن يُرفعا. وصِل المستودع بـ Vercel أو Netlify لينشر آليًا.
> **GitHub Pages** لا يشغّل أمر بناء؛ إن أردته، إمّا أن تنشئ GitHub Action يشغّل `node scripts/generate-env.js`، أو (بما أن مفتاح anon عام) تنشئ `env.js` يدويًا في الفرع المنشور.

---

## 📁 البنية

```
index.html              ← التطبيق الرئيسي (نقطة الدخول)
env.js                  ← المفاتيح (محلي/مولّد — غير مرفوع)
env.example.js          ← قالب المفاتيح
scripts/generate-env.js ← مولّد env.js وقت النشر
src/                    ← منطق التطبيق (React عبر Babel في المتصفح)
assets/                 ← الصور والفيديو والشعار
supabase/               ← ملفات SQL للإعداد
vercel.json · netlify.toml
```
