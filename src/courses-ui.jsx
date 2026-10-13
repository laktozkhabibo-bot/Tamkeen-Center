/* =========================================================================
   مكوّنات مشتركة للمقررات والدرجات — window.CoursesUI
   تُحمّل بعد dash-common.jsx (تستخدم window.UI و window.TC و window.TCX)
   ========================================================================= */
(function () {
  const { theme, Icon } = window.TC;
  const { Badge, Card } = window.UI;
  const X = window.TCX;
  const tr = (o, lang) => X.tr(o, lang);

  // شارة حالة الطالب
  function StatusBadge({ status, lang }) {
    const s = X.status(status);
    return <Badge tone={s.tone}>{tr(s.name, lang)}</Badge>;
  }

  // شريط الفصل الحالي
  function SemesterBanner({ db, lang, compact }) {
    const semId = (db.settings && db.settings.current_semester) || 'y1s1';
    const s = X.semester(semId);
    if (!s) return null;
    if (compact) {
      return (
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:700, color:theme.primaryDeep, background:theme.goldSoft, padding:'4px 11px', borderRadius:999 }}>
          <Icon name="calendar" size={13} color={theme.primaryDeep} /> {tr(s.name, lang)}
        </span>
      );
    }
    return (
      <div style={{ display:'flex', alignItems:'center', gap:11, padding:'12px 16px', borderRadius:14, background:theme.goldSoft, marginBottom:18 }}>
        <div style={{ width:38, height:38, borderRadius:11, background:theme.primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name="calendar" size={19} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize:12, color:theme.primaryDeep, fontWeight:600 }}>{lang==='ar'?'الفصل الحالي':'Current semester'}</p>
          <p style={{ fontSize:15.5, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{tr(s.name, lang)} <span style={{ fontSize:12.5, color:theme.brown, fontWeight:600 }}>· {tr(s.yearName, lang)}</span></p>
        </div>
      </div>
    );
  }

  const partColor = (val, max) => {
    const pct = max ? (val / max) * 100 : 0;
    return pct >= 85 ? theme.ok : pct >= 60 ? theme.warn : theme.bad;
  };

  // تفصيل الدرجة ثلاثية المكوّن + المجموع (للعرض فقط)
  function GradeBreakdown({ grade, lang, course }) {
    const total = X.gradeTotal(grade);
    const pct = X.gradePct(grade);
    const totalCol = theme[X.scoreTone(pct)];
    const hours = course ? X.courseHours(course) : null;
    const sc = X.scaleFor(total);
    return (
      <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {X.GRADE_PARTS.map(p=>{
            const v = parseFloat(grade[p.key]) || 0;
            return (
              <div key={p.key} style={{ textAlign:'center', minWidth:78, padding:'7px 11px', borderRadius:11, background:theme.paperAlt }}>
                <p style={{ fontSize:11, color:theme.muted, marginBottom:2 }}>{p.shortAr}</p>
                <p style={{ fontSize:15, fontWeight:800, color:partColor(v,p.max), fontFamily:'Cairo, sans-serif' }}>{v}<span style={{ fontSize:10.5, color:theme.muted, fontWeight:500 }}>/{p.max}</span></p>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign:'center', minWidth:90, padding:'7px 13px', borderRadius:11, background:theme.creamDeep, border:`1px solid ${theme.line}` }}>
          <p style={{ fontSize:11, color:theme.muted, marginBottom:2 }}>{lang==='ar'?'المجموع':'Total'}</p>
          <p style={{ fontSize:18, fontWeight:800, color:totalCol, fontFamily:'Cairo, sans-serif' }}>{total}<span style={{ fontSize:11, color:theme.muted, fontWeight:500 }}>/{X.GRADE_TOTAL}</span></p>
        </div>
        {course && (
          <div style={{ textAlign:'center', minWidth:90, padding:'7px 13px', borderRadius:11, background:theme.creamDeep, border:`1px solid ${theme.line}` }}>
            <p style={{ fontSize:11, color:theme.muted, marginBottom:2 }}>{lang==='ar'?'النقاط':'Points'} · <span dir="ltr">{sc.letter}</span></p>
            <p style={{ fontSize:18, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{X.fmt2(X.coursePoints(total, hours))}<span style={{ fontSize:11, color:theme.muted, fontWeight:500 }}>/{hours*4}</span></p>
          </div>
        )}
      </div>
    );
  }

  // فتح ملف المقرر عند الطلب (يُجلَب محتواه base64 من القاعدة لحظة النقر، لا عند التحميل)
  async function openCourseFile(course) {
    if (!course) return;
    if (course.link && !course.fileName && !course.hasFile) { window.open(course.link, '_blank', 'noopener'); return; }
    let fileData = course.fileData, fileName = course.fileName;
    if (!fileData && (course.hasFile || course.fileName)) {
      const f = await window.TCData.getCourseFile(course.id);
      if (f) { fileData = f.fileData; fileName = f.fileName; }
    }
    if (fileData) {
      const a = document.createElement('a');
      a.href = fileData; a.download = fileName || 'course-file';
      document.body.appendChild(a); a.click(); a.remove();
    } else if (course.link) {
      window.open(course.link, '_blank', 'noopener');
    }
  }

  // رابط ملف المقرر — زر يجلب الملف عند النقر (مع حالة تحميل)
  function CourseFileLink({ course, lang, style }) {
    const [busy, setBusy] = React.useState(false);
    const hasLink = course.link && !course.fileName && !course.hasFile;
    const label = course.fileName || (hasLink ? (lang==='ar'?'فتح رابط المقرر':'Open course link') : (lang==='ar'?'فتح ملف المقرر':'Open course file'));
    return (
      <button type="button" disabled={busy}
        onClick={async (e)=>{ e.stopPropagation(); setBusy(true); try { await openCourseFile(course); } catch(err){ alert((err&&err.message)||String(err)); } setBusy(false); }}
        style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12.5, color:theme.primary, background:'none', border:'none', cursor:busy?'wait':'pointer', padding:0, marginTop:6, fontWeight:600, fontFamily:'Cairo, sans-serif', ...(style||{}) }}>
        <Icon name="download" size={13} color={theme.primary} /> {busy?(lang==='ar'?'جارٍ الفتح…':'Opening…'):label}
      </button>
    );
  }

  // بطاقة مقرر (للعرض): الرمز + الاسم + المعلمون + رابط
  function CourseCard({ course, lang, db, showTeachers, right }) {
    const d = X.diploma(course.diploma);
    const teachers = (db.courseTeachers||[])
      .filter(ct=>ct.courseId===course.id)
      .map(ct=>(db.users||[]).find(u=>u.accessKey===ct.teacherId))
      .filter(Boolean);
    return (
      <Card pad={16}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:13 }}>
          <div style={{ width:46, height:46, borderRadius:13, background:theme.goldSoft, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="book" size={18} color={theme.primaryDeep} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, fontWeight:700, color:theme.primaryDeep, background:theme.creamDeep, padding:'2px 9px', borderRadius:7, fontFamily:'Cairo, sans-serif' }} dir="rtl">{course.code}</span>
              {d && <Badge tone="neutral">{tr(d.short, lang)}</Badge>}
            </div>
            <h4 style={{ fontSize:15.5, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif', marginBottom:showTeachers?6:0 }}>{course.name}</h4>
            {showTeachers && teachers.length>0 && (
              <p style={{ fontSize:12.5, color:theme.muted, display:'flex', alignItems:'center', gap:5 }}>
                <Icon name="gradCap" size={13} color={theme.primary} /> {teachers.map(t=>t.name).join('، ')}
              </p>
            )}
            {(course.hasFile || course.fileData || course.link) && (
              <CourseFileLink course={course} lang={lang} />
            )}
          </div>
          {right}
        </div>
      </Card>
    );
  }

  window.CoursesUI = { StatusBadge, SemesterBanner, GradeBreakdown, CourseCard, CourseFileLink, openCourseFile };
})();

/* =========================================================================
   السجل الأكاديمي — window.RecordUI: AcademicRecord, RecordSummary, LevelTable, printRecord
   يعتمد على X.buildRecord (curriculum.js): مستويات → مقررات (درجة/تقدير/نقاط) + GPA/CGPA
   ========================================================================= */
(function () {
  const { theme, Icon } = window.TC;
  const { Btn, Badge, Card, EmptyState } = window.UI;
  const X = window.TCX;
  const tr = (o, lang) => X.tr(o, lang);

  const th = { padding:'9px 8px', fontSize:11.5, fontWeight:700, color:theme.muted, textAlign:'center', whiteSpace:'nowrap', borderBottom:`1px solid ${theme.line}` };
  const td = { padding:'9px 8px', fontSize:13, color:theme.ink, textAlign:'center', borderTop:`1px solid ${theme.lineSoft}` };

  function Stat({ label, value, sub, strong }) {
    return (
      <div style={{ padding:'12px 14px', borderRadius:12, background:strong?theme.creamDeep:theme.paperAlt, border:strong?`1px solid ${theme.line}`:'none', textAlign:'center', minWidth:0 }}>
        <p style={{ fontSize:11.5, color:theme.muted, marginBottom:3 }}>{label}</p>
        <p style={{ fontSize:strong?24:19, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif', lineHeight:1.2 }}>{value}</p>
        {sub && <p style={{ fontSize:11.5, color:theme.brown, fontWeight:600, marginTop:2 }}>{sub}</p>}
      </div>
    );
  }

  // ملخص: المعدل التراكمي من 4 + مجموع النقاط + الساعات + التقدير العام
  function RecordSummary({ record, lang }) {
    const ar = lang === 'ar';
    if (!record || record.cgpa == null) return null;
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:10 }}>
        <Stat strong label={ar?'المعدل التراكمي':'CGPA'} value={<span dir="ltr">{X.fmt2(record.cgpa)}<span style={{ fontSize:13, color:theme.muted, fontWeight:600 }}> / 4.00</span></span>} sub={tr(record.grade, lang)} />
        <Stat label={ar?'مجموع النقاط':'Total points'} value={X.fmt2(record.points)} sub={ar?`من ${record.hours*4}`:`of ${record.hours*4}`} />
        <Stat label={ar?'الساعات المحتسبة':'Credit hours'} value={record.hours} />
        {record.honors && <Stat label={ar?'مرتبة الشرف':'Honours'} value={<Icon name="award" size={22} color={theme.primaryDeep} />} sub={tr(record.honors, lang)} />}
      </div>
    );
  }

  // جدول مستوى واحد بنمط السجل الرسمي
  function LevelTable({ level, lang, showPending }) {
    const ar = lang === 'ar';
    const rows = showPending ? level.rows : level.rows.filter((r) => r.approved);
    return (
      <Card pad={0} style={{ overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:theme.creamDeep, flexWrap:'wrap' }}>
          <Icon name="layers" size={16} color={theme.primaryDeep} />
          <h4 style={{ fontSize:15, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{tr(level.sem.levelName, lang)}</h4>
          {level.complete ? <Badge tone="ok">{ar?'مكتمل':'Complete'}</Badge> : <Badge tone="warn">{ar?'قيد الاعتماد':'In progress'}</Badge>}
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:520 }}>
            <thead><tr>
              <th style={th}>{ar?'م':'#'}</th>
              <th style={th}>{ar?'الرمز':'Code'}</th>
              <th style={{ ...th, textAlign:'start' }}>{ar?'المقرر':'Course'}</th>
              <th style={th}>{ar?'الساعات':'Hrs'}</th>
              <th style={th}>{ar?'الدرجة':'Score'}</th>
              <th style={th}>{ar?'التقدير':'Grade'}</th>
              <th style={th}>{ar?'النقاط':'Points'}</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.course.id}>
                  <td style={{ ...td, color:theme.muted }}>{i + 1}</td>
                  <td style={{ ...td, fontSize:12, color:theme.brown, fontWeight:600 }} dir="rtl">{r.course.code}</td>
                  <td style={{ ...td, textAlign:'start', fontWeight:600 }}>{r.course.name}</td>
                  <td style={td}>{r.hours}</td>
                  <td style={{ ...td, fontWeight:700, color:r.approved?theme[X.scoreTone(r.score)]:theme.mutedSoft }}>{r.approved ? r.score : '—'}</td>
                  <td style={{ ...td, fontWeight:700 }} dir="ltr">{r.approved ? r.letter : '—'}</td>
                  <td style={{ ...td, fontWeight:700 }}>{r.approved ? X.fmt2(r.points) : '—'}</td>
                </tr>
              ))}
              <tr style={{ background:theme.paperAlt }}>
                <td style={{ ...td, fontWeight:800 }} colSpan={3}>{ar?'المجموع':'Total'}</td>
                <td style={{ ...td, fontWeight:800 }}>{level.hours}</td>
                <td style={{ ...td, fontWeight:800 }}>{level.scoreSum}</td>
                <td style={td}></td>
                <td style={{ ...td, fontWeight:800 }}>{X.fmt2(level.points)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {level.gpa != null && (
          <div style={{ display:'flex', gap:18, padding:'11px 16px', borderTop:`1px solid ${theme.line}`, flexWrap:'wrap', fontSize:13, color:theme.brown }}>
            <span>{ar?'المعدل الفصلي':'Term GPA'}: <strong style={{ color:theme.ink }} dir="ltr">{X.fmt2(level.gpa)}</strong></span>
            <span>{ar?'المعدل التراكمي':'CGPA'}: <strong style={{ color:theme.ink }} dir="ltr">{X.fmt2(level.cgpa)}</strong></span>
            <span>{ar?'التقدير':'Grade'}: <strong style={{ color:theme.ink }}>{tr(X.gpaGrade(level.cgpa), lang)}</strong></span>
          </div>
        )}
      </Card>
    );
  }

  // طباعة السجل بنمط الوثيقة الرسمية (نافذة مستقلة)
  function printRecord(student, record, lang) {
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
    const dip = X.diploma(student.diploma);
    const levels = record.levels.filter((l) => l.complete);
    const today = new Date(); const pad = (n) => String(n).padStart(2, '0');
    const levelHtml = levels.map((l) => `
      <h3>${esc(X.tr(l.sem.levelName, 'ar'))} / Level (${l.sem.level})</h3>
      <table><thead><tr><th>م</th><th>رمز المقرر<br><small>COURSE CODE</small></th><th>اسم المقرر<br><small>COURSE NAME</small></th><th>الساعات<br><small>HOURS</small></th><th>الدرجة<br><small>SCORE</small></th><th>التقدير<br><small>GRADE</small></th><th>النقاط<br><small>POINTS</small></th></tr></thead>
      <tbody>${l.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.course.code)}</td><td class="n">${esc(r.course.name)}</td><td>${r.hours}</td><td>${r.score}</td><td dir="ltr">${r.letter}</td><td>${X.fmt2(r.points)}</td></tr>`).join('')}
      <tr class="tot"><td colspan="3">المجموع / Total</td><td>${l.hours}</td><td>${l.scoreSum}</td><td></td><td>${X.fmt2(l.points)}</td></tr></tbody></table>
      <table class="sum"><tr><th>المعدل الفصلي / GPA</th><th>المعدل التراكمي / CGPA</th><th>التقدير / GRADE</th></tr>
      <tr><td>${X.fmt2(l.gpa)}</td><td>${X.fmt2(l.cgpa)}</td><td>${esc(X.tr(X.gpaGrade(l.cgpa), 'ar'))}</td></tr></table>`).join('');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>السجل الأكاديمي — ${esc(student.name)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>@page{size:A4;margin:14mm}body{font-family:Cairo,sans-serif;color:#2a2418;margin:0;padding:24px;font-size:12.5px}
      header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #6E5B3D;padding-bottom:10px;margin-bottom:14px}header img{width:62px;height:62px;object-fit:contain}
      h1{font-size:19px;margin:0}h1 small{display:block;font-size:12px;color:#6E5B3D;font-weight:600}
      h3{font-size:14px;margin:18px 0 6px;color:#473C28}table{width:100%;border-collapse:collapse;margin-bottom:6px}
      th,td{border:1px solid #bfb39a;padding:5px 6px;text-align:center}th{background:#F1EADB;font-size:11.5px}th small{font-weight:600;color:#6E5B3D;font-size:9.5px}
      td.n{text-align:right}tr.tot td{font-weight:800;background:#F8F3E8}.sum th{width:33%}.sum td{font-weight:800}
      .info td{text-align:right}.info th{width:22%}.final{margin-top:16px}.final td{font-size:14px;font-weight:800}
      footer{display:flex;justify-content:space-between;margin-top:40px;font-weight:700}footer span{min-width:160px;text-align:center}
      .pb{page-break-inside:avoid}</style></head><body>
      <header><img src="${location.origin}/assets/logo.jpeg" alt=""><h1>السجل الأكاديمي<small>ACADEMIC RECORD — مركز تمكين</small></h1></header>
      <table class="info"><tr><th>اسم الطالب / STUDENT NAME</th><td>${esc(student.name)}</td><th>رقم الطالب / STUDENT NO.</th><td dir="ltr">${esc(student.accessKey)}</td></tr>
      <tr><th>الدرجة العلمية / PROGRAM</th><td>${esc(X.tr(X.studyType(student.studyType).name, 'ar'))}</td><th>التخصص / MAJOR</th><td>${esc(dip ? X.tr(dip.short, 'ar') : '')}</td></tr>
      <tr><th>الحالة / STATUS</th><td>${esc(X.tr(X.status(student.status).name, 'ar'))}</td><th>تاريخ الإصدار</th><td dir="ltr">${today.getFullYear()}/${pad(today.getMonth() + 1)}/${pad(today.getDate())}</td></tr></table>
      ${levelHtml || '<p>لا توجد مستويات مكتملة بعد.</p>'}
      ${record.cgpa != null ? `<table class="sum final pb"><tr><th>إجمالي الساعات</th><th>إجمالي النقاط</th><th>المعدل التراكمي / CGPA</th><th>التقدير العام</th>${record.honors ? '<th>مرتبة الشرف</th>' : ''}</tr>
      <tr><td>${record.hours}</td><td>${X.fmt2(record.points)}</td><td>${X.fmt2(record.cgpa)} / 4.00</td><td>${esc(X.tr(record.grade, 'ar'))}</td>${record.honors ? `<td>${esc(X.tr(record.honors, 'ar'))}</td>` : ''}</tr></table>` : ''}
      <footer class="pb"><span>القبول والتسجيل</span><span>الختم</span><span>عميد المعهد</span></footer>
      <script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert(lang === 'ar' ? 'اسمح بالنوافذ المنبثقة لطباعة السجل' : 'Allow pop-ups to print'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  // السجل الأكاديمي الكامل (المستويات المكتملة فقط) + الملخص + طباعة
  function AcademicRecord({ db, student, lang, showAll }) {
    const ar = lang === 'ar';
    const record = X.buildRecord(db, student.accessKey);
    const levels = record.levels.filter((l) => showAll ? l.started : l.complete);
    if (!levels.length) return <EmptyState icon="award" title={ar?'لا توجد مستويات مكتملة بعد':'No completed levels yet'} body={ar?'ينتقل المستوى إلى السجل الأكاديمي تلقائيًا عند اعتماد درجات كل مقرراته.':'A level moves here once all its course grades are approved.'} />;
    return (
      <div style={{ display:'grid', gap:14 }}>
        <RecordSummary record={record} lang={lang} />
        {levels.map((l) => <LevelTable key={l.sem.id} level={l} lang={lang} showPending={showAll} />)}
        <div><Btn variant="soft" icon="download" onClick={() => printRecord(student, record, lang)}>{ar?'طباعة / حفظ PDF':'Print / Save PDF'}</Btn></div>
      </div>
    );
  }

  window.RecordUI = { AcademicRecord, RecordSummary, LevelTable, printRecord };
})();
