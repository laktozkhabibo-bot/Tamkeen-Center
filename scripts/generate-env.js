/* =========================================================================
   scripts/generate-env.js
   يولّد ملف env.js من متغيّرات البيئة وقت النشر (Vercel / Netlify / CI).
   يُستدعى عبر:  node scripts/generate-env.js   (أمر البناء build command)

   اضبط في لوحة المنصّة متغيّرين:
     SUPABASE_URL        = https://xxxx.supabase.co
     SUPABASE_ANON_KEY   = eyJhbGci... (anon العام)
   (يقبل أيضًا الأسماء البديلة VITE_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL …)
   ========================================================================= */
const fs = require('fs');
const path = require('path');

const url =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';
const key =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!url || !key) {
  console.error(
    '\n[generate-env] ✕ متغيّرات البيئة غير موجودة.\n' +
    '  اضبط SUPABASE_URL و SUPABASE_ANON_KEY في إعدادات المشروع على المنصّة.\n'
  );
  process.exit(1);
}

const out =
  '/* مولّد تلقائيًا وقت النشر — لا تعدّله يدويًا */\n' +
  'window.TAMKEEN_SUPABASE_URL = ' + JSON.stringify(url) + ';\n' +
  'window.TAMKEEN_SUPABASE_ANON_KEY = ' + JSON.stringify(key) + ';\n';

fs.writeFileSync(path.join(process.cwd(), 'env.js'), out, 'utf8');
console.log('[generate-env] ✓ تم توليد env.js بنجاح.');
