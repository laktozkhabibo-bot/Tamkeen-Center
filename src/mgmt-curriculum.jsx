/* =========================================================================
   أدوات الإدارة للمنهج — window.MgmtCurriculum
   • CurriculumTab : الفصل الحالي + المقررات (CRUD) + إسناد المعلمين + تسجيل الطلاب
   • ApprovalTab   : جدول اعتماد الدرجات
   • TeacherAssignPanel : لوحة (المواد الموكلة + الطلاب الموكلون) داخل تبويب المعلمين
   ========================================================================= */
(function () {
  const { theme, L, Icon } = window.TC;
  const { Avatar, AvatarUpload, Btn, Badge, Card, EmptyState, Field, Input, Select, Modal, readFileAsDataURL } = window.UI;
  const { SemesterBanner, GradeBreakdown, StatusBadge } = window.CoursesUI;
  const X = window.TCX;
  const { useState } = React;
  const tr = (o, lang) => X.tr(o, lang);

  // ============================================================ المنهج والمقررات
  function CurriculumTab({ lang, db, actions, uid }) {
    const t = L(lang);
    const cur = (db.settings && db.settings.current_semester) || 'y1s1';
    const [dip, setDip] = useState('sunnah');
    const [sem, setSem] = useState(cur);
    const [courseModal, setCourseModal] = useState(null); // null | {} new | course edit
    const [form, setForm] = useState({ name:'', code:'', link:'', fileData:'', fileName:'', diploma:'sunnah', semester:cur });
    const [enrollFor, setEnrollFor] = useState(null); // course being enrolled

    const teachers = db.users.filter(u=>u.role==='teacher');
    const courses = (db.courses||[]).filter(c=>c.diploma===dip && c.semester===sem);

    const openNew = ()=>{ setForm({ name:'', code:X.nextCode(db.courses||[], dip, sem), link:'', fileData:'', fileName:'', diploma:dip, semester:sem }); setCourseModal({}); };
    const openEdit = (c)=>{ setForm({ name:c.name, code:c.code, link:c.link||'', fileData:c.fileData||'', fileName:c.fileName||'', diploma:c.diploma, semester:c.semester }); setCourseModal(c); };
    const saveCourse = ()=>{
      if(!form.name.trim()||!form.code.trim()) return;
      if(courseModal && courseModal.id) actions.editCourse(courseModal.id, form);
      else actions.addCourse(form);
      setCourseModal(null);
    };

    const courseTeachers = (cid)=> (db.courseTeachers||[]).filter(ct=>ct.courseId===cid);
    const courseEnrollCount = (cid)=> (db.enrollments||[]).filter(e=>e.courseId===cid).length;

    return (
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        {/* الفصل الحالي */}
        <Card pad={18} style={{ marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:theme.primary, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="calendar" size={20} color="#fff" /></div>
              <div>
                <p style={{ fontSize:12.5, color:theme.muted, fontWeight:600 }}>{t('currentSemester')}</p>
                <p style={{ fontSize:16, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{tr(X.semester(cur).name, lang)} · {tr(X.semester(cur).yearName, lang)}</p>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Select value={cur} onChange={e=>actions.setSetting('current_semester', e.target.value)} style={{ width:180 }}>
                {X.SEMESTERS.map(s=><option key={s.id} value={s.id}>{tr(s.name, lang)} — {tr(s.yearName, lang)}</option>)}
              </Select>
            </div>
          </div>
          <p style={{ fontSize:12, color:theme.muted, marginTop:10 }}>{lang==='ar'?'الفصل المختار يظهر لكل المعلمين والطلاب، وعليه تُسجَّل المقررات.':'The selected semester is shown to all teachers and students.'}</p>
        </Card>

        {/* مرشّحات الدبلومة والفصل لعرض/إدارة المقررات */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <Icon name="book" size={19} color={theme.primary} />
            <h2 style={{ fontSize:18, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('courses')}</h2>
            <Badge tone="neutral">{courses.length}</Badge>
          </div>
          <div style={{ flex:1 }} />
          <Select value={dip} onChange={e=>setDip(e.target.value)} style={{ width:'auto' }}>
            {X.DIPLOMAS.map(d=><option key={d.id} value={d.id}>{tr(d.name, lang)}</option>)}
          </Select>
          <Select value={sem} onChange={e=>setSem(e.target.value)} style={{ width:'auto' }}>
            {X.SEMESTERS.map(s=><option key={s.id} value={s.id}>{tr(s.name, lang)}</option>)}
          </Select>
          <Btn size="sm" variant="primary" icon="plus" onClick={openNew}>{t('addCourse')}</Btn>
        </div>

        {courses.length===0 ? <EmptyState icon="book" title={t('noCourses')} /> : (
          <div style={{ display:'grid', gap:12 }}>
            {courses.map(c=>{
              const cts = courseTeachers(c.id);
              return (
                <Card key={c.id} pad={16}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:theme.primaryDeep, background:theme.creamDeep, padding:'2px 9px', borderRadius:7 }} dir="rtl">{c.code}</span>
                        <h4 style={{ fontSize:15.5, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{c.name}</h4>
                      </div>
                      {/* المعلمون المسندون */}
                      <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:8 }}>
                        <span style={{ fontSize:12, color:theme.muted, fontWeight:600 }}>{t('assignedTeachers')}:</span>
                        {cts.length===0 && <span style={{ fontSize:12, color:theme.mutedSoft }}>{t('none')}</span>}
                        {cts.map(ct=>{
                          const tu = teachers.find(u=>u.accessKey===ct.teacherId);
                          return (
                            <span key={ct.id} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, padding:'3px 8px 3px 10px', borderRadius:999, background:theme.goldSoft, color:theme.primaryDeep, fontWeight:600 }}>
                              {tu?tu.name:ct.teacherId}
                              <button onClick={()=>actions.unassignCourseTeacher(ct.id)} style={{ background:'none', border:'none', cursor:'pointer', color:theme.primaryDeep, display:'flex', padding:0 }}><Icon name="x" size={12} /></button>
                            </span>
                          );
                        })}
                        <TeacherPicker teachers={teachers} assigned={cts.map(x=>x.teacherId)} onPick={tid=>actions.assignCourseTeacher(c.id, tid)} lang={lang} />
                      </div>
                      {/* الطلاب */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12.5, color:theme.brown, fontWeight:600 }}><Icon name="users" size={14} color={theme.primary} /> {courseEnrollCount(c.id)} {t('students')}</span>
                        <button onClick={()=>setEnrollFor(c)} style={{ fontSize:12, fontWeight:600, color:theme.primary, background:theme.creamDeep, border:'none', borderRadius:8, padding:'4px 10px', cursor:'pointer', fontFamily:'Cairo, sans-serif' }}>{t('assignStudents')}</button>
                        {(c.fileData||c.link) && <a href={c.fileData||c.link} download={c.fileName||undefined} target="_blank" rel="noopener" style={{ fontSize:12, color:theme.primary, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}><Icon name="download" size={13} />{c.fileName||t('openFile')}</a>}
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <button onClick={()=>openEdit(c)} title={t('edit')} style={iconBtn(theme.creamDeep, theme.primary)}><Icon name="edit" size={15} /></button>
                      <button onClick={()=>actions.deleteCourse(c.id)} title={t('delete')} style={iconBtn(theme.badBg, theme.bad)}><Icon name="trash" size={15} /></button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* نافذة المقرر */}
        {courseModal && (
          <Modal title={courseModal.id?t('editCourse'):t('addCourse')} onClose={()=>setCourseModal(null)} width={460}>
            <div style={{ display:'grid', gap:14 }}>
              <Field label={t('courseName')} required><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={lang==='ar'?'مثال: فقه العبادات':'e.g. Fiqh'} /></Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label={t('diploma')}><Select value={form.diploma} onChange={e=>setForm({...form,diploma:e.target.value})}>{X.DIPLOMAS.map(d=><option key={d.id} value={d.id}>{tr(d.name,lang)}</option>)}</Select></Field>
                <Field label={t('semester')}><Select value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})}>{X.SEMESTERS.map(s=><option key={s.id} value={s.id}>{tr(s.name,lang)}</option>)}</Select></Field>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12 }}>
                <Field label={t('courseCode')} required><Input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} dir="rtl" /></Field>
                <Field label={t('courseFile')}>
                  <CourseFilePicker form={form} setForm={setForm} t={t} lang={lang} />
                </Field>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <Btn full variant="soft" onClick={()=>setCourseModal(null)}>{t('cancel')}</Btn>
                <Btn full variant="primary" onClick={saveCourse}>{t('save')}</Btn>
              </div>
            </div>
          </Modal>
        )}

        {/* نافذة تسجيل الطلاب */}
        {enrollFor && <EnrollModal course={enrollFor} db={db} actions={actions} lang={lang} onClose={()=>setEnrollFor(null)} />}
      </div>
    );
  }

  const iconBtn = (bg, col) => ({ width:32, height:32, borderRadius:9, background:bg, border:'none', color:col, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' });

  // اختيار ملف المقرر من الجهاز (يُخزَّن كـ Data URL)
  function CourseFilePicker({ form, setForm, t, lang }) {
    const ref = React.useRef(null);
    const onChange = async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try { const data = await readFileAsDataURL(f); setForm({ ...form, fileData:data, fileName:f.name }); } catch {}
      e.target.value = '';
    };
    if (form.fileData || form.fileName) {
      return (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:11, background:theme.goldSoft }}>
          <Icon name="fileText" size={16} color={theme.primaryDeep} />
          <span style={{ flex:1, minWidth:0, fontSize:12.5, fontWeight:600, color:theme.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{form.fileName||t('courseFile')}</span>
          <button type="button" onClick={()=>ref.current&&ref.current.click()} title={t('replaceFile')} style={iconBtn('transparent', theme.primary)}><Icon name="upload" size={15} /></button>
          <button type="button" onClick={()=>setForm({ ...form, fileData:'', fileName:'' })} title={t('removeFile')} style={iconBtn('transparent', theme.bad)}><Icon name="x" size={15} /></button>
          <input ref={ref} type="file" onChange={onChange} style={{ display:'none' }} />
        </div>
      );
    }
    return (
      <React.Fragment>
        <button type="button" onClick={()=>ref.current&&ref.current.click()} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'11px', borderRadius:11, border:`1.5px dashed ${theme.line}`, background:theme.paper, cursor:'pointer', color:theme.primary, fontFamily:'Cairo, sans-serif', fontWeight:600, fontSize:13 }}>
          <Icon name="upload" size={16} /> {t('chooseFile')}
        </button>
        <input ref={ref} type="file" onChange={onChange} style={{ display:'none' }} />
      </React.Fragment>
    );
  }

  // قائمة منسدلة لاختيار معلم لإسناده للمقرر
  function TeacherPicker({ teachers, assigned, onPick, lang }) {
    const [open, setOpen] = useState(false);
    const avail = teachers.filter(t=>!assigned.includes(t.accessKey));
    return (
      <div style={{ position:'relative' }}>
        <button onClick={()=>setOpen(!open)} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color:theme.primary, background:theme.paper, border:`1px dashed ${theme.line}`, borderRadius:999, padding:'3px 10px', cursor:'pointer', fontFamily:'Cairo, sans-serif' }}>
          <Icon name="plus" size={12} /> {lang==='ar'?'معلم':'Teacher'}
        </button>
        {open && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', insetInlineStart:0, zIndex:20, background:theme.paper, border:`1px solid ${theme.line}`, borderRadius:12, boxShadow:'0 14px 34px -16px rgba(71,60,40,.4)', padding:6, minWidth:190, maxHeight:240, overflowY:'auto' }}>
            {avail.length===0 ? <p style={{ fontSize:12, color:theme.muted, padding:'8px 10px' }}>{lang==='ar'?'لا مزيد':'No more'}</p> :
              avail.map(t=>(
                <button key={t.accessKey} onClick={()=>{onPick(t.accessKey);setOpen(false);}} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 9px', borderRadius:9, background:'none', border:'none', cursor:'pointer', textAlign:lang==='ar'?'right':'left', fontFamily:'Cairo, sans-serif' }}>
                  <Avatar name={t.name} img={t.img} size={26} accent={theme.tan} />
                  <span style={{ fontSize:12.5, fontWeight:600, color:theme.ink }}>{t.name}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    );
  }

  // نافذة تسجيل/سحب طلاب في مقرر
  function EnrollModal({ course, db, actions, lang, onClose }) {
    const t = L(lang);
    const [q, setQ] = useState('');
    const studs = db.users.filter(u=>u.role==='student' && (!course.diploma || u.diploma===course.diploma));
    const enrolled = (db.enrollments||[]).filter(e=>e.courseId===course.id);
    const enrolledIds = enrolled.map(e=>e.studentId);
    const filtered = studs.filter(s=>s.name.includes(q)||s.accessKey.includes(q.toUpperCase()));
    const toggle = (s)=>{
      const rec = enrolled.find(e=>e.studentId===s.accessKey);
      if(rec) actions.unenroll(rec.id); else actions.enrollStudent(course.id, s.accessKey);
    };
    const enrollAll = ()=>{ studs.filter(s=>!enrolledIds.includes(s.accessKey)).forEach(s=>actions.enrollStudent(course.id, s.accessKey)); };
    return (
      <Modal title={`${t('assignStudents')} — ${course.name}`} onClose={onClose} width={460}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Icon name="search" size={15} color={theme.muted} style={{ position:'absolute', insetInlineStart:12, top:'50%', transform:'translateY(-50%)' }} />
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('search')} style={{ paddingInlineStart:36 }} />
          </div>
          <Btn size="sm" variant="soft" onClick={enrollAll}>{lang==='ar'?'تسجيل الكل':'Enroll all'}</Btn>
        </div>
        <div style={{ display:'grid', gap:6, maxHeight:340, overflowY:'auto' }}>
          {filtered.map(s=>{
            const on = enrolledIds.includes(s.accessKey);
            return (
              <button key={s.accessKey} onClick={()=>toggle(s)} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:11, background:on?theme.goldSoft:theme.paperAlt, border:'none', cursor:'pointer', textAlign:lang==='ar'?'right':'left' }}>
                <Avatar name={s.name} img={s.img} size={30} accent={theme.gold} />
                <div style={{ flex:1, minWidth:0 }}><p style={{ fontSize:13, fontWeight:600, color:theme.ink }}>{s.name}</p><span style={{ fontSize:11, color:theme.muted }} dir="ltr">{s.accessKey}</span></div>
                <span style={{ width:20, height:20, borderRadius:6, border:`1.5px solid ${on?theme.primary:theme.line}`, background:on?theme.primary:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>{on && <Icon name="check" size={13} color="#fff" />}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    );
  }

  // ============================================================ اعتماد الدرجات
  function ApprovalTab({ lang, db, actions, uid }) {
    const t = L(lang);
    const [view, setView] = useState('confirmed'); // confirmed | approved | all
    const [dip, setDip] = useState('all');
    const course = (id)=> (db.courses||[]).find(c=>c.id===id);
    const student = (id)=> db.users.find(u=>u.accessKey===id);

    let rows = (db.courseGrades||[]).filter(g=>g.status!=='draft');
    rows = rows.filter(g=>{
      if(view==='confirmed' && g.status!=='confirmed') return false;
      if(view==='approved' && g.status!=='approved') return false;
      if(dip!=='all'){ const c=course(g.courseId); if(!c||c.diploma!==dip) return false; }
      return true;
    });
    // ترتيب: بانتظار الاعتماد أولاً
    rows = rows.sort((a,b)=> (a.status==='confirmed'?0:1)-(b.status==='confirmed'?0:1));
    const pendingCount = (db.courseGrades||[]).filter(g=>g.status==='confirmed').length;
    const approveAll = ()=>{ rows.filter(g=>g.status==='confirmed').forEach(g=>actions.approveCourseGrade(g.id)); };

    return (
      <div style={{ maxWidth:1000, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <Icon name="checkCircle" size={20} color={theme.primary} />
            <h2 style={{ fontSize:18, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('gradeApproval')}</h2>
            {pendingCount>0 && <Badge tone="warn">{pendingCount} {t('awaitingApproval')}</Badge>}
          </div>
          <div style={{ flex:1 }} />
          <Select value={dip} onChange={e=>setDip(e.target.value)} style={{ width:'auto' }}>
            <option value="all">{t('allDiplomas')}</option>
            {X.DIPLOMAS.map(d=><option key={d.id} value={d.id}>{tr(d.short,lang)}</option>)}
          </Select>
          <div style={{ display:'flex', gap:2, background:theme.creamDeep, borderRadius:11, padding:3 }}>
            {[['confirmed',t('awaitingApproval')],['approved',t('approved')],['all',lang==='ar'?'الكل':'All']].map(([v,lab])=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:'7px 13px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12.5, fontWeight:700, fontFamily:'Cairo, sans-serif', background:view===v?theme.paper:'transparent', color:view===v?theme.ink:theme.muted, boxShadow:view===v?'0 1px 3px rgba(71,60,40,.12)':'none' }}>{lab}</button>
            ))}
          </div>
          {view==='confirmed' && pendingCount>0 && <Btn size="sm" variant="primary" icon="check" onClick={approveAll}>{t('approveAll')}</Btn>}
        </div>

        {rows.length===0 ? <EmptyState icon="checkCircle" title={t('noPending')} /> : (
          <Card pad={0} style={{ overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:theme.creamDeep }}>
                    {[t('students'),t('studentNumber'),t('course'),'مشاركة','نصفي','نهائي',t('total'),t('statusLabel'),''].map((h,i)=>(
                      <th key={i} style={{ padding:'11px 13px', textAlign:i<3?'start':'center', fontWeight:700, color:theme.ink, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g,idx)=>{
                    const c=course(g.courseId); const s=student(g.studentId);
                    const total=X.gradeTotal(g); const pct=X.gradePct(g); const col=theme[X.scoreTone(pct)];
                    const gs=X.GRADE_STATUS[g.status];
                    return (
                      <tr key={g.id} style={{ borderTop:`1px solid ${theme.lineSoft}` }}>
                        <td style={{ padding:'10px 13px', fontWeight:600, color:theme.ink, whiteSpace:'nowrap' }}>{s?s.name:g.studentId}</td>
                        <td style={{ padding:'10px 13px', color:theme.muted }} dir="ltr">{g.studentId}</td>
                        <td style={{ padding:'10px 13px', color:theme.brown, whiteSpace:'nowrap' }}>{c?<span><span style={{ fontSize:11, color:theme.muted }} dir="rtl">{c.code} · </span>{c.name}</span>:'—'}</td>
                        <td style={{ padding:'10px 13px', textAlign:'center', fontWeight:700, color:theme.brown }}>{g.participation}</td>
                        <td style={{ padding:'10px 13px', textAlign:'center', fontWeight:700, color:theme.brown }}>{g.midterm}</td>
                        <td style={{ padding:'10px 13px', textAlign:'center', fontWeight:700, color:theme.brown }}>{g.final}</td>
                        <td style={{ padding:'10px 13px', textAlign:'center', fontWeight:800, color:col, fontFamily:'Cairo, sans-serif' }}>{total}</td>
                        <td style={{ padding:'10px 13px', textAlign:'center' }}><Badge tone={gs.tone}>{tr(gs.name,lang)}</Badge></td>
                        <td style={{ padding:'10px 13px', textAlign:'center', whiteSpace:'nowrap' }}>
                          {g.status==='confirmed'
                            ? <Btn size="sm" variant="primary" icon="check" onClick={()=>actions.approveCourseGrade(g.id)}>{t('approve')}</Btn>
                            : <button onClick={()=>actions.revertCourseGrade(g.id)} title={lang==='ar'?'إلغاء الاعتماد':'Revert'} style={iconBtn(theme.badBg, theme.bad)}><Icon name="x" size={15} /></button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ============================================ لوحة إسناد المعلم (داخل تبويب المعلمين)
  function TeacherAssignPanel({ teacher, lang, db, actions }) {
    const t = L(lang);
    const [pickStud, setPickStud] = useState(false);
    const myCourses = (db.courseTeachers||[]).filter(ct=>ct.teacherId===teacher.accessKey)
      .map(ct=>(db.courses||[]).find(c=>c.id===ct.courseId)).filter(Boolean);
    const myStuds = (db.teacherStudents||[]).filter(ts=>ts.teacherId===teacher.accessKey);

    return (
      <div>
        {/* المواد الموكلة */}
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}><Icon name="book" size={17} color={theme.primary} /><h3 style={{ fontSize:15, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('teachingCourses')}</h3><Badge tone="neutral">{myCourses.length}</Badge></div>
        {myCourses.length===0 ? <p style={{ fontSize:13, color:theme.muted, marginBottom:18 }}>{lang==='ar'?'لم تُسند له مواد بعد (تُسند من تبويب المنهج والمقررات).':'No courses assigned yet (assign from Curriculum tab).'}</p> : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
            {myCourses.map(c=>(
              <span key={c.id} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12.5, padding:'6px 11px', borderRadius:10, background:theme.paperAlt, color:theme.brown, fontWeight:600 }}>
                <span style={{ fontSize:11, color:theme.muted }} dir="rtl">{c.code}</span> {c.name}
              </span>
            ))}
          </div>
        )}

        {/* الطلاب الموكلون */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}><Icon name="users" size={17} color={theme.primary} /><h3 style={{ fontSize:15, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('myDelegatedStudents')}</h3><Badge tone="neutral">{myStuds.length}</Badge></div>
          <Btn size="sm" variant="primary" icon="plus" onClick={()=>setPickStud(true)}>{t('assignStudentsToTeacher')}</Btn>
        </div>
        {myStuds.length===0 ? <EmptyState icon="users" title={t('none')} /> : (
          <div style={{ display:'grid', gap:8 }}>
            {myStuds.map(ts=>{
              const s = db.users.find(u=>u.accessKey===ts.studentId);
              if(!s) return null;
              return (
                <div key={ts.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'9px 12px', borderRadius:11, background:theme.paperAlt }}>
                  <Avatar name={s.name} img={s.img} size={34} accent={theme.gold} />
                  <div style={{ flex:1, minWidth:0 }}><p style={{ fontSize:13.5, fontWeight:600, color:theme.ink }}>{s.name}</p><span style={{ fontSize:11.5, color:theme.muted }} dir="ltr">{s.accessKey}</span></div>
                  <StatusBadge status={s.status} lang={lang} />
                  <button onClick={()=>actions.unassignTeacherStudent(ts.id)} style={{ background:'none', border:'none', cursor:'pointer', color:theme.bad, padding:4 }}><Icon name="x" size={15} /></button>
                </div>
              );
            })}
          </div>
        )}

        {pickStud && <AssignStudentsModal teacher={teacher} db={db} actions={actions} lang={lang} onClose={()=>setPickStud(false)} />}
      </div>
    );
  }

  function AssignStudentsModal({ teacher, db, actions, lang, onClose }) {
    const t = L(lang);
    const [q, setQ] = useState('');
    const studs = db.users.filter(u=>u.role==='student');
    const assigned = (db.teacherStudents||[]).filter(ts=>ts.teacherId===teacher.accessKey);
    const assignedIds = assigned.map(ts=>ts.studentId);
    const filtered = studs.filter(s=>s.name.includes(q)||s.accessKey.includes(q.toUpperCase()));
    const toggle = (s)=>{
      const rec = assigned.find(ts=>ts.studentId===s.accessKey);
      if(rec) actions.unassignTeacherStudent(rec.id); else actions.assignTeacherStudent(teacher.accessKey, s.accessKey);
    };
    return (
      <Modal title={`${t('assignStudentsToTeacher')} — ${teacher.name}`} onClose={onClose} width={460}>
        <div style={{ position:'relative', marginBottom:12 }}>
          <Icon name="search" size={15} color={theme.muted} style={{ position:'absolute', insetInlineStart:12, top:'50%', transform:'translateY(-50%)' }} />
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('search')} style={{ paddingInlineStart:36 }} />
        </div>
        <div style={{ display:'grid', gap:6, maxHeight:360, overflowY:'auto' }}>
          {filtered.map(s=>{
            const on = assignedIds.includes(s.accessKey);
            return (
              <button key={s.accessKey} onClick={()=>toggle(s)} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:11, background:on?theme.goldSoft:theme.paperAlt, border:'none', cursor:'pointer', textAlign:lang==='ar'?'right':'left' }}>
                <Avatar name={s.name} img={s.img} size={30} accent={theme.gold} />
                <div style={{ flex:1, minWidth:0 }}><p style={{ fontSize:13, fontWeight:600, color:theme.ink }}>{s.name}</p><span style={{ fontSize:11, color:theme.muted }} dir="ltr">{s.accessKey}</span></div>
                {s.diploma && <Badge tone="neutral">{tr(X.diploma(s.diploma)?.short, lang)}</Badge>}
                <span style={{ width:20, height:20, borderRadius:6, border:`1.5px solid ${on?theme.primary:theme.line}`, background:on?theme.primary:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>{on && <Icon name="check" size={13} color="#fff" />}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    );
  }

  window.MgmtCurriculum = { CurriculumTab, ApprovalTab, TeacherAssignPanel };
})();
