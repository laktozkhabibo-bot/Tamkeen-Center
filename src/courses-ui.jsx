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
  function GradeBreakdown({ grade, lang }) {
    const total = X.gradeTotal(grade);
    const pct = X.gradePct(grade);
    const totalCol = theme[X.scoreTone(pct)];
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
      </div>
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
            {(course.fileData || course.link) && (
              <a href={course.fileData || course.link} download={course.fileName || undefined} target="_blank" rel="noopener" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12.5, color:theme.primary, textDecoration:'none', marginTop:6, fontWeight:600 }}>
                <Icon name="download" size={13} color={theme.primary} /> {course.fileName || (lang==='ar'?'فتح ملف المقرر':'Open course file')}
              </a>
            )}
          </div>
          {right}
        </div>
      </Card>
    );
  }

  window.CoursesUI = { StatusBadge, SemesterBanner, GradeBreakdown, CourseCard };
})();
