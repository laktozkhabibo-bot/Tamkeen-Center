/* =========================================================================
   منهج مركز تمكين — ثوابت الدبلومات والفصول ومكوّنات الدرجة + مساعدات
   window.TCX  (يُحمّل بعد data.js وقبل core.jsx — لا يعتمد على شيء عند التحميل)
   ========================================================================= */
(function () {
  // الدبلومات
  const DIPLOMAS = [
    { id: 'sunnah', prefix: 'سن', accent: '#8C6F47',
      name: { ar: 'دبلوم السنة النبوية والدراسات الإسلامية', en: 'Prophetic Sunnah & Islamic Studies' },
      short: { ar: 'السنة النبوية', en: 'Prophetic Sunnah' } },
    { id: 'arabic', prefix: 'عر', accent: '#B68A3E',
      name: { ar: 'دبلوم اللغة العربية والدراسات الإسلامية', en: 'Arabic Language & Islamic Studies' },
      short: { ar: 'اللغة العربية', en: 'Arabic Language' } },
    { id: 'sharia', prefix: 'شر', accent: '#7A6A4F',
      name: { ar: 'دبلوم الشريعة والقانون', en: 'Sharia & Law' },
      short: { ar: 'الشريعة والقانون', en: 'Sharia & Law' } },
  ];

  // الفصول الأربعة عبر سنتين
  // كل فصل = «مستوى» (level 1..4) بلغة السجل الأكاديمي
  const SEMESTERS = [
    { id: 'y1s1', year: 1, term: 1, level: 1, name: { ar: 'الفصل الأول',  en: 'Semester 1' }, levelName: { ar: 'المستوى الأول',  en: 'Level 1' }, yearName: { ar: 'السنة الأولى', en: 'Year 1' } },
    { id: 'y1s2', year: 1, term: 2, level: 2, name: { ar: 'الفصل الثاني', en: 'Semester 2' }, levelName: { ar: 'المستوى الثاني', en: 'Level 2' }, yearName: { ar: 'السنة الأولى', en: 'Year 1' } },
    { id: 'y2s1', year: 2, term: 1, level: 3, name: { ar: 'الفصل الثالث', en: 'Semester 3' }, levelName: { ar: 'المستوى الثالث', en: 'Level 3' }, yearName: { ar: 'السنة الثانية', en: 'Year 2' } },
    { id: 'y2s2', year: 2, term: 2, level: 4, name: { ar: 'الفصل الرابع', en: 'Semester 4' }, levelName: { ar: 'المستوى الرابع', en: 'Level 4' }, yearName: { ar: 'السنة الثانية', en: 'Year 2' } },
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
    { id: 'regular',   tone: 'ok',      name: { ar: 'منتظم',  en: 'Regular' } },
    { id: 'affiliate', tone: 'neutral', name: { ar: 'منتسب',  en: 'Affiliate' } },
    { id: 'graduate',  tone: 'gold',    name: { ar: 'خريج',   en: 'Graduate' } },
    { id: 'suspended', tone: 'warn',    name: { ar: 'معلّق',  en: 'Suspended' } },
    { id: 'withdrawn', tone: 'bad',     name: { ar: 'منقطع',  en: 'Withdrawn' } },
  ];
  // نوع الدراسة
  const STUDY_TYPES = [
    { id: 'diploma',  name: { ar: 'دبلوم', en: 'Diploma' } },
    { id: 'parallel', name: { ar: 'موازي', en: 'Parallel' } },
  ];

  // ----- سلّم التقديرات (لائحة المعهد: النقاط = الساعات × معدل المادة) -----
  const GRADE_SCALE = [
    { min: 95, letter: 'A+', gp: 4.00, name: { ar: 'ممتاز مرتفع',   en: 'Excellent+' } },
    { min: 90, letter: 'A',  gp: 3.75, name: { ar: 'ممتاز',         en: 'Excellent' } },
    { min: 85, letter: 'B+', gp: 3.50, name: { ar: 'جيد جداً مرتفع', en: 'Very good+' } },
    { min: 80, letter: 'B',  gp: 3.00, name: { ar: 'جيد جداً',      en: 'Very good' } },
    { min: 75, letter: 'C+', gp: 2.50, name: { ar: 'جيد مرتفع',     en: 'Good+' } },
    { min: 70, letter: 'C',  gp: 2.00, name: { ar: 'جيد',           en: 'Good' } },
    { min: 60, letter: 'D+', gp: 1.50, name: { ar: 'مقبول مرتفع',   en: 'Pass+' } },
    { min: 50, letter: 'D',  gp: 1.00, name: { ar: 'مقبول',         en: 'Pass' } },
    { min: 0,  letter: 'F',  gp: 0.00, name: { ar: 'راسب',          en: 'Fail' } },
  ];
  const DEFAULT_HOURS = 2;

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
  const studyType = (id) => byId(STUDY_TYPES, id) || STUDY_TYPES[0];

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

  // ----- التقدير والنقاط والمعدل -----
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const courseHours = (c) => { const h = parseFloat(c && c.hours); return h > 0 ? h : DEFAULT_HOURS; };
  const scaleFor = (score) => { const s = parseFloat(score) || 0; return GRADE_SCALE.find((g) => s >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1]; };
  const coursePoints = (score, hours) => r2(scaleFor(score).gp * (parseFloat(hours) || 0));
  // التقدير العام للمعدل التراكمي
  const gpaGrade = (gpa) => (gpa >= 3.5 ? { ar: 'ممتاز', en: 'Excellent' }
    : gpa >= 2.75 ? { ar: 'جيد جداً', en: 'Very good' }
    : gpa >= 1.75 ? { ar: 'جيد', en: 'Good' }
    : gpa >= 1 ? { ar: 'مقبول', en: 'Pass' } : { ar: 'ضعيف', en: 'Weak' });
  // مرتبة الشرف: الأولى ≥3.75 والثانية ≥3.25، بشرط عدم الرسوب في أي مقرر
  const honors = (gpa, hasFail) => (hasFail ? null
    : gpa >= 3.75 ? { ar: 'مع مرتبة الشرف الأولى', en: 'First-class honours' }
    : gpa >= 3.25 ? { ar: 'مع مرتبة الشرف الثانية', en: 'Second-class honours' } : null);
  const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

  // السجل الأكاديمي الكامل لطالب: مستويات → مقررات (درجة/تقدير/نقاط) + معدلات فصلية وتراكمية.
  //  • يُحتسب المعتمد فقط.  • المستوى «مكتمل» إذا اعتُمدت درجات كل مقرراته المسجّلة.
  function buildRecord(db, studentId) {
    const courses = db.courses || [];
    const enrolledIds = new Set((db.enrollments || []).filter((e) => e.studentId === studentId).map((e) => e.courseId));
    const grades = (db.courseGrades || []).filter((g) => g.studentId === studentId);
    grades.forEach((g) => enrolledIds.add(g.courseId));
    let cumH = 0, cumP = 0, hasFail = false;
    const levels = SEMESTERS.map((sem) => {
      const levelCourses = courses.filter((c) => c.semester === sem.id && enrolledIds.has(c.id))
        .sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
      const rows = levelCourses.map((c) => {
        const g = grades.find((x) => x.courseId === c.id);
        const approved = !!(g && g.status === 'approved');
        const hours = courseHours(c);
        const score = approved ? gradeTotal(g) : null;
        const sc = approved ? scaleFor(score) : null;
        return { course: c, grade: g || null, approved, hours, score,
          letter: sc ? sc.letter : null, gp: sc ? sc.gp : null, gradeName: sc ? sc.name : null,
          points: approved ? coursePoints(score, hours) : null };
      });
      const done = rows.filter((r) => r.approved);
      const hours = done.reduce((s, r) => s + r.hours, 0);
      const points = r2(done.reduce((s, r) => s + r.points, 0));
      const scoreSum = done.reduce((s, r) => s + r.score, 0);
      if (done.some((r) => r.letter === 'F')) hasFail = true;
      cumH += hours; cumP += points;
      const complete = rows.length > 0 && done.length === rows.length;
      return { sem, rows, complete, started: done.length > 0, hours, points, scoreSum,
        gpa: hours ? points / hours : null, cgpa: cumH ? cumP / cumH : null };
    }).filter((l) => l.rows.length > 0);
    const cgpa = cumH ? cumP / cumH : null;
    return { levels, hours: cumH, points: r2(cumP), cgpa, hasFail,
      grade: cgpa != null ? gpaGrade(cgpa) : null, honors: cgpa != null ? honors(cgpa, hasFail) : null };
  }

  // ----- المجموعات/الفصول (sections) -----
  // مفتاح قانوني:  sunnah|<year> · sharia|<year>   أو   arabic|<year>|<timing>|<group>
  function buildSectionKey({ diploma: dip, year, timing, group }) {
    if (dip !== 'arabic') return (dip || 'sunnah') + '|' + (year || 1);
    const g = Number(year) === 2 ? 1 : (group || 1);
    return 'arabic|' + (year || 1) + '|' + (timing || 'weekday') + '|' + g;
  }
  function parseSection(key) {
    if (!key) return null;
    const p = String(key).split('|');
    if (p[0] === 'sunnah' || p[0] === 'sharia') return { diploma: p[0], year: Number(p[1]) || 1, timing: null, group: null, key };
    if (p[0] === 'arabic') return { diploma: 'arabic', year: Number(p[1]) || 1, timing: p[2] || 'weekday', group: Number(p[3]) || 1, key };
    return null;
  }
  // كل المجموعات الممكنة (8): سنة×2 + عربية (س1×2توقيت×2مجموعة + س2×2توقيت)
  function allSections() {
    const out = [];
    [1, 2].forEach((y) => out.push(parseSection('sunnah|' + y)));
    [1, 2].forEach((y) => out.push(parseSection('sharia|' + y)));
    ['weekday', 'weekend'].forEach((tm) => {
      [1, 2].forEach((g) => out.push(parseSection('arabic|1|' + tm + '|' + g)));
      out.push(parseSection('arabic|2|' + tm + '|1'));
    });
    return out;
  }
  // المجموعات المتاحة لدبلومة معيّنة
  function sectionsForDiploma(dip) { return allSections().filter((s) => s.diploma === dip); }
  function studentSection(u) { return u && u.section ? u.section : null; }
  // المستوى الحالي للطالب = سنته (من المجموعة) + فصل المركز الحالي
  function studentLevel(u, curSemId) {
    const s = parseSection(u && u.section); if (!s) return null;
    const cur = semester(curSemId) || SEMESTERS[0];
    return (s.year - 1) * 2 + cur.term;
  }
  const levelSem = (level) => SEMESTERS.find((s) => s.level === level) || null;
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
    BUILD: 12,
    DIPLOMAS, SEMESTERS, GRADE_PARTS, GRADE_TOTAL, STATUSES, STUDY_TYPES, GRADE_SCALE, DEFAULT_HOURS, GRADE_STATUS,
    YEARS, TIMINGS,
    diploma, semester, status, studyType, tr, gradeTotal, gradePct, scoreTone, nextCode,
    courseHours, scaleFor, coursePoints, gpaGrade, honors, buildRecord, fmt2,
    buildSectionKey, parseSection, allSections, sectionsForDiploma, studentSection, sectionLabel, studentLevel, levelSem,
  };
})();
