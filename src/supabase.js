/* =========================================================================
   إعداد اتصال Supabase — منظومة مركز تمكين
   المفاتيح تُقرأ من env.js (يُحمَّل قبل هذا الملف) — لا تُكتب هنا صراحةً.
   • anon key مفتاح عام آمن للاستخدام في المتصفح (الحماية الفعلية من RLS).
   • لا تضع مفتاح service_role في أي ملف يصل للمتصفح أبدًا.
   يتطلب: تحميل supabase-js (UMD) ثم env.js قبل هذا الملف.
   ========================================================================= */
(function () {
  var url = window.TAMKEEN_SUPABASE_URL;
  var key = window.TAMKEEN_SUPABASE_ANON_KEY;

  if (!url || !key || /YOUR_SUPABASE|REPLACE_ME/.test(String(url) + String(key))) {
    var msg =
      'إعدادات Supabase غير مضبوطة. انسخ env.example.js إلى env.js واملأ ' +
      'TAMKEEN_SUPABASE_URL و TAMKEEN_SUPABASE_ANON_KEY (أو اضبط متغيرات البيئة عند النشر).';
    console.error('[Tamkeen] ' + msg);
    document.addEventListener('DOMContentLoaded', function () {
      var r = document.getElementById('root');
      if (r) {
        r.innerHTML =
          '<div style="font-family:Cairo,Tahoma,sans-serif;direction:rtl;max-width:560px;' +
          'margin:80px auto;padding:28px;background:#FBF8F1;border:1px solid #E5DAC4;' +
          'border-radius:18px;color:#473C28;line-height:1.9">' +
          '<h2 style="margin:0 0 10px;color:#B4452F;font-size:18px">تعذّر الاتصال بقاعدة البيانات</h2>' +
          '<p style="margin:0;font-size:14px">' + msg + '</p></div>';
      }
    });
    return;
  }

  window.tamkeenSupabase = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tamkeen_auth' },
  });

  // تحويل مفتاح الدخول (مثل T100) إلى البريد الداخلي المستخدم في Supabase Auth
  window.tamkeenKeyToEmail = function (k) {
    return String(k || '').trim().toLowerCase() + '@tamkeen.local';
  };
})();
