/* =========================================================================
   منهج مركز تمكين — ثوابت الدبلومات والفصول ومكوّنات الدرجة + مساعدات
   window.TCX  (يُحمّل بعد data.js وقبل core.jsx — لا يعتمد على شيء عند التحميل)
   ========================================================================= */
(function () {
  // الدبلومتان
  const DIPLOMAS = [
    { id: 'sunnah', prefix: 'سن', accent: '#8C6F47',
      name: { ar: 'دبلوم السنة النبوية', en: 'Prophetic Sunnah Diploma' },
      short: { ar: 'السنة النبوية', en: 'Prophetic Sunnah' } },
    { id: 'arabic', prefix: 'عر', accent: '#B68A3E',
      name: { ar: 'دبلوم اللغة العربية', en: 'Arabic Language Diploma' },
      short: { ar: 'اللغة العربية', en: 'Arabic Language' } },
  ];

  // الفصول الأربعة عبر سنتين
  const SEMESTERS = [
    { id: 'y1s1', year: 1, term: 1, name: { ar: 'الفصل الأول',  en: 'Semester 1' }, yearName: { ar: 'السنة الأولى', en: 'Year 1' } },
    { id: 'y1s2', year: 1, term: 2, name: { ar: 'الفصل الثاني', en: 'Semester 2' }, yearName: { ar: 'السنة الأولى', en: 'Year 1' } },
    { id: 'y2s1', year: 2, term: 1, name: { ar: 'الفصل الثالث', en: 'Semester 3' }, yearName: { ar: 'السنة الثانية', en: 'Year 2' } },
    { id: 'y2s2', year: 2, term: 2, name: { ar: 'الفصل الرابع', en: 'Semester 4' }, yearName: { ar: 'السنة الثانية', en: 'Year 2' } },
  ];

  // مكوّنات الدرجة (المجموع = 100)
  const GRADE_PARTS = [
    { key: 'participation', max: 20, name: { ar: 'المشاركة والتكليف', en: 'Participation' }, shortAr: 'مشاركة وتكليف' },
    { key: 'midterm',       max: 20, name: { ar: 'الاختبار النصفي',   en: 'Midterm' },       shortAr: 'نصفي' },
    { key: 'final',         max: 60, name: { ar: 'الاختبار النهائي',  en: 'Final' },         shortAr: 'نهائي' },
  ];
  const GRADE_TOTAL = GRADE_PARTS.reduce((s, p) => s + p.max, 0); // 100

  // حالات الطالب
  const STATUSES = [
    { id: 'regular',   tone: 'ok',  name: { ar: 'منتظم',  en: 'Regular' } },
    { id: 'suspended', tone: 'warn',name: { ar: 'معلّق',  en: 'Suspended' } },
    { id: 'withdrawn', tone: 'bad', name: { ar: 'منقطع',  en: 'Withdrawn' } },
  ];

  // حالات اعتماد الدرجة
  const GRADE_STATUS = {
    draft:     { tone: 'neutral', name: { ar: 'مسودة',  en: 'Draft' } },
    confirmed: { tone: 'warn',    name: { ar: 'بانتظار الاعتماد', en: 'Awaiting approval' } },
    approved:  { tone: 'ok',      name: { ar: 'معتمدة', en: 'Approved' } },
  };

  // ----- السنوات والتوقيتات (لبنية المجموعات/الفصول) -----
  const YEARS = [
    { id: 1, name: { ar: 'السنة الأولى', en: 'Year 1' }, short: { ar: 'سنة 1', en: 'Y1' } },
    { id: 2, name: { ar: 'السنة الثانية', en: 'Year 2' }, short: { ar: 'سنة 2', en: 'Y2' } },
  ];
  // توقيت دبلوم اللغة العربية (يوافق عمود attendance_group)
  const TIMINGS = [
    { id: 'weekday', name: { ar: 'بداية الأسبوع', en: 'Weekday' } },
    { id: 'weekend', name: { ar: 'نهاية الأسبوع', en: 'Weekend' } },
  ];

  // ----- مساعدات -----
  const byId = (arr, id) => arr.find((x) => x.id === id) || null;
  const diploma = (id) => byId(DIPLOMAS, id);
  const semester = (id) => byId(SEMESTERS, id);
  const status = (id) => byId(STATUSES, id) || STATUSES[0];

  // اسم مترجم (يحتاج window.TC.pick لكن يُستدعى وقت العرض فلا مشكلة)
  const tr = (obj, lang) => {
    if (!obj) return '';
    return obj[lang] != null ? obj[lang] : (obj.ar != null ? obj.ar : '');
  };

  const gradeTotal = (g) => {
    if (!g) return 0;
    return GRADE_PARTS.reduce((s, p) => s + (parseFloat(g[p.key]) || 0), 0);
  };
  const gradePct = (g) => Math.round((gradeTotal(g) / GRADE_TOTAL) * 100);

  // لون حسب النسبة
  const scoreTone = (pct) => (pct >= 85 ? 'ok' : pct >= 60 ? 'warn' : 'bad');

  // ----- المجموعات/الفصول (sections) -----
  // مفتاح قانوني:  sunnah|<year>   أو   arabic|<year>|<timing>|<group>
  function buildSectionKey({ diploma: dip, year, timing, group }) {
    if (dip === 'sunnah') return 'sunnah|' + (year || 1);
    const g = Number(year) === 2 ? 1 : (group || 1);
    return 'arabic|' + (year || 1) + '|' + (timing || 'weekday') + '|' + g;
  }
  function parseSection(key) {
    if (!key) return null;
    const p = String(key).split('|');
    if (p[0] === 'sunnah') return { diploma: 'sunnah', year: Number(p[1]) || 1, timing: null, group: null, key };
    if (p[0] === 'arabic') return { diploma: 'arabic', year: Number(p[1]) || 1, timing: p[2] || 'weekday', group: Number(p[3]) || 1, key };
    return null;
  }
  // كل المجموعات الممكنة (8): سنة×2 + عربية (س1×2توقيت×2مجموعة + س2×2توقيت)
  function allSections() {
    const out = [];
    [1, 2].forEach((y) => out.push(parseSection('sunnah|' + y)));
    ['weekday', 'weekend'].forEach((tm) => {
      [1, 2].forEach((g) => out.push(parseSection('arabic|1|' + tm + '|' + g)));
      out.push(parseSection('arabic|2|' + tm + '|1'));
    });
    return out;
  }
  // المجموعات المتاحة لدبلومة معيّنة
  function sectionsForDiploma(dip) { return allSections().filter((s) => s.diploma === dip); }
  function studentSection(u) { return u && u.section ? u.section : null; }
  function sectionLabel(key, lang) {
    const s = parseSection(key); if (!s) return '';
    const d = diploma(s.diploma);
    const yr = YEARS.find((y) => y.id === s.year);
    const parts = [tr(d && d.short, lang), tr(yr && yr.name, lang)];
    if (s.diploma === 'arabic') {
      const tmObj = TIMINGS.find((x) => x.id === s.timing);
      parts.push(tr(tmObj && tmObj.name, lang));
      if (s.year === 1) parts.push((lang === 'ar' ? 'مجموعة ' : 'Group ') + s.group);
    }
    return parts.filter(Boolean).join(' — ');
  }

  // توليد رمز مقرر تالٍ ضمن (دبلومة، فصل) اعتمادًا على المقررات الموجودة
  const nextCode = (courses, diplomaId, semId) => {
    const d = diploma(diplomaId); const s = semester(semId);
    if (!d || !s) return '';
    const base = (s.year * 100) + (s.term === 1 ? 0 : 0); // 100 للسنة1، 200 لو احتجنا
    const band = s.year === 1 && s.term === 1 ? 100
               : s.year === 1 && s.term === 2 ? 200
               : s.year === 2 && s.term === 1 ? 300 : 400;
    const used = courses
      .filter((c) => c.diploma === diplomaId && c.code && c.code.startsWith(d.prefix))
      .map((c) => parseInt(String(c.code).replace(/[^0-9]/g, ''), 10))
      .filter((n) => !isNaN(n) && n >= band && n < band + 100);
    const max = used.length ? Math.max(...used) : band;
    return d.prefix + (max + 1);
  };

  window.TCX = {
    DIPLOMAS, SEMESTERS, GRADE_PARTS, GRADE_TOTAL, STATUSES, GRADE_STATUS,
    YEARS, TIMINGS,
    diploma, semester, status, tr, gradeTotal, gradePct, scoreTone, nextCode,
    buildSectionKey, parseSection, allSections, sectionsForDiploma, studentSection, sectionLabel,
  };
})();
