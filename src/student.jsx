/* =========================================================================
   Student dashboard — window.Dashboards.StudentDashboard
   ========================================================================= */
(function () {
  const { theme, L, Icon, fmtDate } = window.TC;
  const { Avatar, Btn, Badge, Card, EmptyState, ScoreRing } = window.UI;
  const { DashShell, InboxView, ScheduleTable, downloadScheduleCSV, AnnouncementsView } = window.Dash;
  const { SemesterBanner, CourseCard, GradeBreakdown, StatusBadge } = window.CoursesUI;
  const X = window.TCX;
  const { useState } = React;

  function StudentDashboard({ user, lang, setLang, db, actions, onLogout, onHome }) {
    const t = L(lang);
    const [active, setActive] = useState('inbox');
    const uid = user.accessKey;

    const inbox = db.sharedItems.filter(i=>i.toUserId===uid);
    const grades = (db.courseGrades||[]).filter(g=>g.studentId===uid && g.status==='approved');
    const myCourses = (db.enrollments||[]).filter(e=>e.studentId===uid).map(e=>(db.courses||[]).find(c=>c.id===e.courseId)).filter(Boolean);
    const course = (id)=>(db.courses||[]).find(c=>c.id===id);
    const assignments = db.assignments.filter(a=>a.studentId===uid);
    const behavior = db.behaviorScores[uid] || 0;
    const scheduleItem = [...inbox].reverse().find(i=>i.itemType==='schedule' && i.scheduleData);
    const unread = inbox.filter(i=>!i.isRead).length;

    const tabs = [
      { id:'inbox', label:t('inbox'), icon:'inbox', badge:unread },
      { id:'announcements', label:t('announcements'), icon:'megaphone', badge:0 },
      { id:'courses', label:t('myCourses'), icon:'book', badge:0 },
      { id:'schedule', label:t('mySchedule'), icon:'calendar', badge:0 },
      { id:'grades', label:t('myGrades'), icon:'book', badge:0 },
      { id:'assignments', label:t('myAssignments'), icon:'fileText', badge:assignments.length },
      { id:'profile', label:t('myProfile'), icon:'user', badge:0 },
    ];

    const statusConf = null;

    const Section = ({ icon, title, extra }) => (
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <Icon name={icon} size={20} color={theme.primary} />
        <h2 style={{ fontSize:19, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{title}</h2>
        {extra}
      </div>
    );

    return (
      <DashShell user={user} lang={lang} setLang={setLang} panelLabel={t('studentPanel')} accent={theme.gold}
        tabs={tabs} active={active} setActive={setActive} onLogout={onLogout} onHome={onHome}>

        {active==='inbox' && <InboxView items={inbox} users={db.users} lang={lang} onMarkRead={actions.markRead} onDownloadSchedule={downloadScheduleCSV} />}

        {active==='announcements' && <AnnouncementsView announcements={db.announcements} role="student" lang={lang} />}

        {active==='courses' && (
          <div style={{ maxWidth:760, margin:'0 auto' }}>
            <SemesterBanner db={db} lang={lang} />
            <Section icon="book" title={t('myCourses')} extra={<Badge tone="neutral">{myCourses.length}</Badge>} />
            {myCourses.length===0 ? <EmptyState icon="book" title={t('noCoursesB')} /> : (
              <div style={{ display:'grid', gap:12 }}>
                {myCourses.map(c=><CourseCard key={c.id} course={c} lang={lang} db={db} showTeachers />)}
              </div>
            )}
          </div>
        )}

        {active==='schedule' && (
          <div style={{ maxWidth:820, margin:'0 auto' }}>
            <Section icon="calendar" title={t('mySchedule')} />
            {scheduleItem ? (
              <Card pad={22}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <h3 style={{ fontSize:16, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{scheduleItem.itemName}</h3>
                  <Btn size="sm" variant="soft" icon="download" onClick={()=>downloadScheduleCSV(scheduleItem)}>{t('downloadExcel')}</Btn>
                </div>
                <ScheduleTable data={scheduleItem.scheduleData} />
              </Card>
            ) : <EmptyState icon="calendar" title={lang==='ar'?'لا يوجد جدول بعد':'No schedule yet'} body={lang==='ar'?'سيظهر جدولك هنا عند إرساله من الإدارة':'Your schedule will appear here once sent'} />}
          </div>
        )}

        {active==='grades' && (
          <div style={{ maxWidth:820, margin:'0 auto' }}>
            <Section icon="book" title={t('myGrades')} extra={grades.length>0 && <Badge tone="neutral">{grades.length} {t('course')}</Badge>} />
            {grades.length===0 ? <EmptyState icon="award" title={t('notApprovedYet')} body={t('notApprovedYetB')} /> : (
              <div style={{ display:'grid', gap:12 }}>
                {grades.map(g=>{
                  const c = course(g.courseId);
                  return (
                    <Card key={g.id} pad={18}>
                      <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:13, flexWrap:'wrap' }}>
                        <div style={{ width:40, height:40, borderRadius:11, background:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="book" size={18} color={theme.primaryDeep} /></div>
                        {c && <span style={{ fontSize:11.5, fontWeight:700, color:theme.muted }} dir="rtl">{c.code}</span>}
                        <h3 style={{ flex:1, fontSize:16, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{c?c.name:'—'}</h3>
                        <Badge tone="ok">{t('approved')}</Badge>
                      </div>
                      <GradeBreakdown grade={g} lang={lang} />
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {active==='assignments' && (
          <div style={{ maxWidth:760, margin:'0 auto' }}>
            <Section icon="fileText" title={t('myAssignments')} extra={assignments.length>0 && <Badge tone="gold">{assignments.length}</Badge>} />
            {assignments.length===0 ? <EmptyState icon="fileText" title={t('noAssignments')} body={t('noAssignmentsB')} /> : (
              <div style={{ display:'grid', gap:12 }}>
                {[...assignments].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(a=>{
                  const teacher = db.users.find(u=>u.accessKey===a.assignedBy);
                  return (
                    <Card key={a.id} pad={20} style={{ display:'flex', gap:15, alignItems:'flex-start' }}>
                      <div style={{ width:44, height:44, borderRadius:13, background:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon name="clipboard" size={20} color={theme.primaryDeep} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <h3 style={{ fontSize:15.5, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif', marginBottom:6 }}>{a.title}</h3>
                        {a.description && <p style={{ fontSize:13.5, color:theme.brown, lineHeight:1.7, marginBottom:10 }}>{a.description}</p>}
                        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', fontSize:12.5, color:theme.muted }}>
                          {a.dueDate && <span style={{ display:'flex', alignItems:'center', gap:5 }}><Icon name="clock" size={13} color={theme.primary} /> {t('due')}: {fmtDate(a.dueDate, lang)}</span>}
                          {teacher && <span style={{ display:'flex', alignItems:'center', gap:5 }}><Icon name="gradCap" size={13} color={theme.primary} /> {teacher.name}</span>}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {active==='profile' && (
          <div style={{ maxWidth:760, margin:'0 auto' }}>
            <Section icon="user" title={t('myProfile')} />
            <Card pad={26} style={{ marginBottom:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24 }}>
                <Avatar name={user.name} img={user.img} size={84} accent={theme.gold} />
                <div>
                  <h3 style={{ fontSize:22, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{user.name}</h3>
                  <p style={{ fontSize:14, color:theme.muted }} dir="ltr">{uid}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                    <Badge tone="gold">{t('student')}</Badge>
                    <StatusBadge status={user.status} lang={lang} />
                  </div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="tc-form-grid">
                {[['mail',t('email'),user.email,'ltr'],['phone',t('phone'),user.phone,'ltr'],['book',t('academicYear'),user.academicYear||t('notSet')],['calendar',t('joined'),fmtDate(user.createdAt||Date.now(),lang)]].map(([ic,lab,val,dir],i)=>(
                  <div key={i} style={{ padding:14, borderRadius:12, background:theme.paperAlt }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}><Icon name={ic} size={14} color={theme.primary} /><span style={{ fontSize:12, color:theme.muted }}>{lab}</span></div>
                    <p style={{ fontSize:14, fontWeight:600, color:theme.ink }} dir={dir}>{val||'—'}</p>
                  </div>
                ))}
              </div>
            </Card>
            <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:14 }} className="tc-stats-grid">
              <Card pad={20} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <ScoreRing value={behavior} size={104} label={t('behavior')} />
              </Card>
              <Card pad={20} style={{ textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <Icon name="book" size={24} color={theme.primary} style={{ margin:'0 auto 8px' }} />
                <p style={{ fontSize:28, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{grades.length}</p>
                <p style={{ fontSize:12.5, color:theme.muted }}>{t('grades')}</p>
              </Card>
              <Card pad={20} style={{ textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <Icon name="fileText" size={24} color={theme.primary} style={{ margin:'0 auto 8px' }} />
                <p style={{ fontSize:28, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{assignments.length}</p>
                <p style={{ fontSize:12.5, color:theme.muted }}>{t('assignments')}</p>
              </Card>
            </div>
          </div>
        )}
      </DashShell>
    );
  }

  window.Dashboards = window.Dashboards || {};
  window.Dashboards.StudentDashboard = StudentDashboard;
})();
