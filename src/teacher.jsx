/* =========================================================================
   Teacher dashboard — window.Dashboards.TeacherDashboard (التحديث الكبير)
   • المقررات الموكلة للتدريس + الفصل الحالي
   • إدخال الدرجات ثلاثية المكوّن لكل طالب في كل مقرر + تأكيدها
   • قائمة الطلاب الموكلين (اسم / رقم / حالة)
   ========================================================================= */
(function () {
  const { theme, L, Icon } = window.TC;
  const { Avatar, Btn, Badge, Card, EmptyState, Input } = window.UI;
  const { DashShell, InboxView, downloadScheduleCSV, AnnouncementsView, CloudView, ScheduleTable } = window.Dash;
  const { SemesterBanner, CourseCard, StatusBadge, GradeBreakdown } = window.CoursesUI;
  const X = window.TCX;
  const { useState, useEffect } = React;
  const tr = (o, lang) => X.tr(o, lang);

  // أزرار المستويات (الأول..الرابع) — تفصل طلاب/مقررات كل مستوى
  function LevelTabs({ levels, value, onChange, counts, lang }) {
    if (!levels.length) return null;
    return (
      <div style={{ display:'flex', gap:4, padding:4, borderRadius:12, background:theme.creamDeep, marginBottom:14, flexWrap:'wrap' }}>
        {levels.map(lv=>{
          const on = value===lv; const sem = X.levelSem(lv);
          return (
            <button key={lv} type="button" onClick={()=>onChange(lv)} style={{ flex:'1 1 auto', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 10px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'Cairo, sans-serif', fontSize:12.5, fontWeight:700, background:on?theme.paper:'transparent', color:on?theme.ink:theme.brown, boxShadow:on?'0 1px 3px rgba(0,0,0,.08)':'none' }}>
              {sem ? X.tr(sem.levelName, lang) : lv}
              {counts && counts[lv]!=null && <span style={{ fontSize:11, color:theme.muted, fontWeight:600 }}>({counts[lv]})</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // صف إدخال درجة لطالب واحد في مقرر
  function GradeEntryRow({ student, course, grade, lang, actions }) {
    const t = L(lang);
    const init = {
      participation: grade ? (grade.participation ?? 0) : 0,
      midterm: grade ? (grade.midterm ?? 0) : 0,
      final: grade ? (grade.final ?? 0) : 0,
    };
    const [vals, setVals] = useState(init);
    const [dirty, setDirty] = useState(false);
    const set = (key, v, max) => {
      let n = v === '' ? '' : Math.max(0, Math.min(max, parseFloat(v) || 0));
      setVals(p => ({ ...p, [key]: n })); setDirty(true);
    };
    const clean = { participation:+vals.participation||0, midterm:+vals.midterm||0, final:+vals.final||0 };
    const total = clean.participation + clean.midterm + clean.final;
    const pct = Math.round((total / X.GRADE_TOTAL) * 100);
    const hours = X.courseHours(course);
    const sc = X.scaleFor(total);
    const status = grade ? grade.status : 'draft';
    const gs = (X.GRADE_STATUS[status] || X.GRADE_STATUS.draft);
    return (
      <Card pad={14}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <Avatar name={student.name} img={student.img} size={38} accent={theme.gold} />
          <div style={{ minWidth:140, flex:'0 0 auto' }}>
            <p style={{ fontSize:13.5, fontWeight:700, color:theme.ink }}>{student.name}</p>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11.5, color:theme.muted }} dir="ltr">{student.accessKey}</span>
              <StatusBadge status={student.status} lang={lang} />
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flex:1, flexWrap:'wrap' }}>
            {X.GRADE_PARTS.map(p=>(
              <div key={p.key} style={{ textAlign:'center' }}>
                <label style={{ display:'block', fontSize:10.5, color:theme.muted, marginBottom:3 }}>{p.shortAr} <span style={{ color:theme.mutedSoft }}>/{p.max}</span></label>
                <input type="number" min="0" max={p.max} value={vals[p.key]} onChange={e=>set(p.key, e.target.value, p.max)}
                  style={{ width:62, padding:'7px 6px', borderRadius:9, border:`1px solid ${theme.line}`, textAlign:'center', fontSize:14, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif', outline:'none', background:theme.paper }} />
              </div>
            ))}
            <div style={{ textAlign:'center', minWidth:62 }}>
              <label style={{ display:'block', fontSize:10.5, color:theme.muted, marginBottom:3 }}>{t('total')}</label>
              <div style={{ padding:'7px 6px', borderRadius:9, background:theme.creamDeep, fontSize:15, fontWeight:800, color:theme[X.scoreTone(pct)], fontFamily:'Cairo, sans-serif' }}>{total}</div>
            </div>
            <div style={{ textAlign:'center', minWidth:70 }}>
              <label style={{ display:'block', fontSize:10.5, color:theme.muted, marginBottom:3 }}>{lang==='ar'?'النقاط':'Points'} <span style={{ color:theme.mutedSoft }}>/{hours*4}</span></label>
              <div style={{ padding:'7px 6px', borderRadius:9, background:theme.paperAlt, fontSize:14, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{X.fmt2(X.coursePoints(total, hours))} <span dir="ltr" style={{ fontSize:11, color:theme.brown }}>{sc.letter}</span></div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <Badge tone={gs.tone}>{tr(gs.name, lang)}</Badge>
            <Btn size="sm" variant="soft" onClick={()=>{ actions.saveCourseGrade(student.accessKey, course.id, clean, 'draft'); setDirty(false); }}>{t('saveDraft')}</Btn>
            <Btn size="sm" variant="primary" icon="check" onClick={()=>{ actions.saveCourseGrade(student.accessKey, course.id, clean, 'confirmed'); setDirty(false); }}>{t('confirmGrade')}</Btn>
          </div>
        </div>
      </Card>
    );
  }

  function TeacherDashboard({ user, lang, setLang, db, actions, onLogout, onHome, routeTab, onTab }) {
    const t = L(lang);
    const [active, setActiveState] = useState(routeTab || 'inbox');
    const setActive = (tb) => { setActiveState(tb); onTab && onTab(tb); };
    useEffect(() => { if (routeTab && routeTab !== active) setActiveState(routeTab); }, [routeTab]);
    const uid = user.accessKey;

    const inbox = db.sharedItems.filter(i=>i.toUserId===uid);
    const unread = inbox.filter(i=>!i.isRead).length;
    const scheduleItem = [...inbox].reverse().find(i=>i.itemType==='schedule' && i.scheduleData);

    // المقررات الموكلة لهذا المعلم
    const myCourseIds = (db.courseTeachers||[]).filter(ct=>ct.teacherId===uid).map(ct=>ct.courseId);
    const myCourses = myCourseIds.map(id=>(db.courses||[]).find(c=>c.id===id)).filter(Boolean);
    // الطلاب الموكلون = طلاب المجموعات/الفصول المُسندة لهذا المعلم (تلقائيًا، يشمل الجدد)
    const mySectionKeys = new Set((db.teacherSections||[]).filter(ts=>ts.teacherId===uid).map(ts=>ts.section));
    const myStudents = db.users.filter(u=>u.role==='student' && u.section && mySectionKeys.has(u.section));
    const myStudentIds = new Set(myStudents.map(u=>u.accessKey));

    const [selCourse, setSelCourse] = useState(null);
    const [q, setQ] = useState('');

    // ---- الفصل بحسب المستوى ----
    const curSem = (db.settings && db.settings.current_semester) || 'y1s1';
    const courseLevel = (c) => (X.semester(c.semester) || {}).level || 1;
    const courseLevels = [...new Set(myCourses.map(courseLevel))].sort();
    const curLevel = (X.semester(curSem) || {}).level || 1;
    const [cLvl, setCLvl] = useState(null);
    const activeCLvl = courseLevels.includes(cLvl) ? cLvl : (courseLevels.includes(curLevel) ? curLevel : courseLevels[0]);
    const levelCourses = myCourses.filter(c=>courseLevel(c)===activeCLvl);
    const stuLevel = (u) => X.studentLevel(u, curSem) || 1;
    const studentLevels = [...new Set(myStudents.map(stuLevel))].sort();
    const [sLvl, setSLvl] = useState(null);
    const activeSLvl = studentLevels.includes(sLvl) ? sLvl : studentLevels[0];
    const countBy = (arr, fn) => arr.reduce((o, x) => { const k = fn(x); o[k] = (o[k]||0) + 1; return o; }, {});

    // طلاب مقرر معيّن = المسجّلون فيه ∩ الموكلون لي
    const courseStudents = (courseId) => (db.enrollments||[])
      .filter(e=>e.courseId===courseId && myStudentIds.has(e.studentId))
      .map(e=>db.users.find(u=>u.accessKey===e.studentId)).filter(Boolean)
      .sort((a,b)=>a.accessKey.localeCompare(b.accessKey));
    const gradeFor = (sid, cid) => (db.courseGrades||[]).find(g=>g.studentId===sid && g.courseId===cid);
    // الطلاب الذين لم تُؤكَّد درجاتهم بعد (مسودة أو لا درجة) — هؤلاء فقط يظهرون للإدخال
    const pendingStudents = (courseId) => courseStudents(courseId).filter(s=>{
      const g = gradeFor(s.accessKey, courseId);
      return !g || g.status==='draft';
    });
    const pendingCount = (courseId) => pendingStudents(courseId).length;
    const confirmedCount = (courseId) => courseStudents(courseId).filter(s=>{
      const g = gradeFor(s.accessKey, courseId);
      return g && (g.status==='confirmed' || g.status==='approved');
    }).length;

    const tabs = [
      { id:'inbox', label:t('inbox'), icon:'inbox', badge:unread },
      { id:'announcements', label:t('announcements'), icon:'megaphone', badge:0 },
      { id:'courses', label:t('teachingCourses'), icon:'book', badge:0 },
      { id:'grades', label:t('enterGrades'), icon:'edit', badge:0 },
      { id:'students', label:t('students'), icon:'gradCap', badge:0 },
      { id:'schedule', label:t('mySchedule'), icon:'calendar', badge:0 },
      { id:'cloud', label:t('cloudSystem'), icon:'cloud', badge:0 },
    ];

    const selectedCourse = myCourses.find(c=>c.id===selCourse);
    const filteredStudents = myStudents
      .filter(s=>stuLevel(s)===activeSLvl)
      .filter(s=>s.name.includes(q)||s.accessKey.includes(q.toUpperCase()))
      .sort((a,b)=>a.accessKey.localeCompare(b.accessKey));

    return (
      <DashShell user={user} lang={lang} setLang={setLang} panelLabel={t('teacherPanel')} accent={theme.tan}
        tabs={tabs} active={active} setActive={setActive} onLogout={onLogout} onHome={onHome}>

        {active==='inbox' && <InboxView items={inbox} users={db.users} lang={lang} onMarkRead={actions.markRead} onDownloadSchedule={downloadScheduleCSV} onDelete={actions.deleteSharedItem} />}
        {active==='announcements' && <AnnouncementsView announcements={db.announcements} role="teacher" lang={lang} />}

        {/* المقررات الموكلة */}
        {active==='courses' && (
          <div style={{ maxWidth:760, margin:'0 auto' }}>
            <SemesterBanner db={db} lang={lang} />
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <Icon name="book" size={20} color={theme.primary} />
              <h2 style={{ fontSize:19, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('teachingCourses')}</h2>
              <Badge tone="neutral">{myCourses.length}</Badge>
            </div>
            {myCourses.length===0 ? <EmptyState icon="book" title={t('noCoursesB')} /> : (
              <div style={{ display:'grid', gap:12 }}>
                {courseLevels.map(lv=>(
                  <React.Fragment key={lv}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:lv===courseLevels[0]?0:8 }}>
                      <Icon name="layers" size={15} color={theme.primary} />
                      <h3 style={{ fontSize:14.5, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{X.tr(X.levelSem(lv).levelName, lang)}</h3>
                    </div>
                    {myCourses.filter(c=>courseLevel(c)===lv).map(c=>(
                      <CourseCard key={c.id} course={c} lang={lang} db={db}
                        right={<Btn size="sm" variant="soft" icon="edit" onClick={()=>{setCLvl(lv);setSelCourse(c.id);setActive('grades');}}>{t('enterGrades')}</Btn>} />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}

        {/* إدخال الدرجات */}
        {active==='grades' && (
          <div className="tc-split" style={{ display:'flex', gap:24 }}>
            <div style={{ width:280, flexShrink:0 }} className="tc-split-aside">
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
                <Icon name="book" size={18} color={theme.primary} /><h3 style={{ fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('teachingCourses')}</h3>
              </div>
              <SemesterBanner db={db} lang={lang} compact />
              <div style={{ marginTop:12 }}>
                <LevelTabs levels={courseLevels} value={activeCLvl} onChange={(lv)=>{ setCLvl(lv); setSelCourse(null); }} counts={countBy(myCourses, courseLevel)} lang={lang} />
              </div>
              <div style={{ display:'grid', gap:8 }}>
                {myCourses.length===0 ? <p style={{ fontSize:13, color:theme.muted, padding:'16px 0', textAlign:'center' }}>{t('noCoursesB')}</p> :
                  levelCourses.map(c=>{
                    const on = selCourse===c.id;
                    const n = courseStudents(c.id).length;
                    return (
                      <Card key={c.id} pad={12} onClick={()=>setSelCourse(c.id)} style={{ background:on?theme.creamDeep:theme.paper, border:`1px solid ${on?theme.line:theme.lineSoft}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:9, background:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="book" size={16} color={theme.primaryDeep} /></div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13, fontWeight:700, color:theme.ink }}>{c.name}</p>
                            <span style={{ fontSize:11, color:theme.muted }} dir="rtl">{c.code} · {pendingCount(c.id)} {lang==='ar'?'بانتظار':'pending'}</span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {selectedCourse ? (() => {
                const studs = pendingStudents(selectedCourse.id);
                const confirmed = confirmedCount(selectedCourse.id);
                return (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                      <h2 style={{ fontSize:19, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{selectedCourse.name}</h2>
                      <span style={{ fontSize:12, fontWeight:700, color:theme.primaryDeep, background:theme.creamDeep, padding:'2px 9px', borderRadius:7 }} dir="rtl">{selectedCourse.code}</span>
                      {confirmed>0 && <Badge tone="ok"><Icon name="check" size={12} color={theme.ok} /> {confirmed} {t('confirmed')}</Badge>}
                    </div>
                    <p style={{ fontSize:12.5, color:theme.muted, marginBottom:18, display:'flex', alignItems:'center', gap:6 }}><Icon name="info" size={14} color={theme.muted} />{t('confirmHint')}</p>
                    {studs.length===0 ? <EmptyState icon="checkCircle" title={t('allConfirmed')} body={t('allConfirmedB')} /> : (
                      <div style={{ display:'grid', gap:10 }}>
                        {studs.map(s=>(
                          <GradeEntryRow key={`${selectedCourse.id}-${s.accessKey}`} student={s} course={selectedCourse}
                            grade={gradeFor(s.accessKey, selectedCourse.id)} lang={lang} actions={actions} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:360, color:theme.muted }}>
                  <Icon name="edit" size={42} color={theme.mutedSoft} style={{ marginBottom:14 }} />
                  <p style={{ fontSize:15, fontWeight:700, color:theme.brown, marginBottom:4 }}>{t('selectCourse')}</p>
                  <p style={{ fontSize:13 }}>{t('selectCourseB')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* قائمة الطلاب الموكلين */}
        {active==='students' && (
          <div style={{ maxWidth:820, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
              <Icon name="gradCap" size={20} color={theme.primary} />
              <h2 style={{ fontSize:19, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('myDelegatedStudents')}</h2>
              <Badge tone="neutral">{myStudents.length}</Badge>
              <div style={{ flex:1 }} />
              <div style={{ position:'relative', width:220 }}>
                <Icon name="search" size={15} color={theme.muted} style={{ position:'absolute', insetInlineStart:12, top:'50%', transform:'translateY(-50%)' }} />
                <Input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('search')} style={{ paddingInlineStart:36 }} />
              </div>
            </div>
            <LevelTabs levels={studentLevels} value={activeSLvl} onChange={setSLvl} counts={countBy(myStudents, stuLevel)} lang={lang} />
            {myStudents.length===0 ? <EmptyState icon="gradCap" title={t('noDelegated')} /> : (
              <Card pad={0} style={{ overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', background:theme.creamDeep, fontSize:12.5, fontWeight:700, color:theme.muted }}>
                  <span style={{ width:38 }}></span>
                  <span style={{ flex:1 }}>{lang==='ar'?'الاسم':'Name'}</span>
                  <span style={{ width:90, textAlign:'center' }}>{t('studentNumber')}</span>
                  <span style={{ width:110, textAlign:'center' }}>{t('statusLabel')}</span>
                </div>
                {filteredStudents.map((s,i)=>(
                  <div key={s.accessKey} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderTop:`1px solid ${theme.lineSoft}` }}>
                    <Avatar name={s.name} img={s.img} size={38} accent={theme.gold} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:600, color:theme.ink }}>{s.name}</p>
                      {s.diploma && <span style={{ fontSize:11.5, color:theme.muted }}>{tr(X.diploma(s.diploma)?.short, lang)}</span>}
                    </div>
                    <span style={{ width:90, textAlign:'center', fontSize:12.5, color:theme.brown, fontWeight:600 }} dir="ltr">{s.accessKey}</span>
                    <span style={{ width:110, display:'flex', justifyContent:'center' }}><StatusBadge status={s.status} lang={lang} /></span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {active==='schedule' && (
          <div style={{ maxWidth:820, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <Icon name="calendar" size={20} color={theme.primary} />
              <h2 style={{ fontSize:19, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('mySchedule')}</h2>
            </div>
            {scheduleItem ? (
              <Card pad={22}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                  <h3 style={{ fontSize:16, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{scheduleItem.itemName}</h3>
                  <Btn size="sm" variant="soft" icon="download" onClick={()=>downloadScheduleCSV(scheduleItem)}>{t('downloadExcel')}</Btn>
                </div>
                <ScheduleTable data={scheduleItem.scheduleData} />
              </Card>
            ) : <EmptyState icon="calendar" title={lang==='ar'?'لا يوجد جدول بعد':'No schedule yet'} body={lang==='ar'?'سيظهر جدولك هنا عند إرساله من الإدارة':'Your schedule appears here when sent by administration'} />}
          </div>
        )}

        {active==='cloud' && <CloudView lang={lang} db={db} actions={actions} uid={uid} canShare />}
      </DashShell>
    );
  }

  window.Dashboards = window.Dashboards || {};
  window.Dashboards.TeacherDashboard = TeacherDashboard;
})();
