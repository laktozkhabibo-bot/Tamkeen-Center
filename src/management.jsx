/* =========================================================================
   Management / Director dashboard — window.Dashboards.ManagementDashboard
   ========================================================================= */
(function () {
  const { theme, L, Icon } = window.TC;
  const { Avatar, AvatarUpload, Btn, Badge, Card, EmptyState, Field, Input, Select, Modal } = window.UI;
  const { DashShell, InboxView, downloadScheduleCSV, CloudView } = window.Dash;
  const { SchedulesTab, AnnouncementsTab, LookupTab } = window.MgmtTools;
  const { CurriculumTab, ApprovalTab, TeacherAssignPanel } = window.MgmtCurriculum;
  const X = window.TCX;
  const { useState } = React;
  const tr = (o, lang) => X.tr(o, lang);

  function PeopleList({ lang, list, accent, onAdd, onDelete, role, db, onSelect, selId, t }) {
    const [q, setQ] = useState('');
    const filtered = list.filter(u=>u.name.includes(q)||u.accessKey.includes(q.toUpperCase()));
    return (
      <div>
        <div style={{ position:'relative', marginBottom:12 }}>
          <Icon name="search" size={15} color={theme.muted} style={{ position:'absolute', insetInlineStart:12, top:'50%', transform:'translateY(-50%)' }} />
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('search')} style={{ paddingInlineStart:36 }} />
        </div>
        <div style={{ display:'grid', gap:8 }}>
          {filtered.length===0 ? <p style={{ textAlign:'center', fontSize:13, color:theme.muted, padding:'24px 0' }}>{role==='teacher'?t('noTeachers'):t('noAdmins')}</p> :
            filtered.map(u=>{
              const on = onSelect && selId===u.accessKey;
              return (
                <Card key={u.accessKey} pad={12} onClick={onSelect?()=>onSelect(u.accessKey):undefined} style={{ background:on?theme.creamDeep:theme.paper }}>
                  <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                    <Avatar name={u.name} img={u.img} size={38} accent={accent} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13.5, fontWeight:600, color:theme.ink }}>{u.name}</p>
                      <span style={{ fontSize:11.5, color:theme.muted }} dir="ltr">{u.accessKey}</span>
                    </div>
                    <button onClick={(e)=>{e.stopPropagation();onDelete(u.accessKey);}} style={{ background:'none', border:'none', cursor:'pointer', color:theme.bad, padding:5 }}><Icon name="trash" size={15} /></button>
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    );
  }

  function ManagementDashboard({ user, lang, setLang, db, actions, onLogout, onHome }) {
    const t = L(lang);
    const isDirector = user.role==='director';
    const [active, setActive] = useState('teachers');
    const uid = user.accessKey;

    const inbox = db.sharedItems.filter(i=>i.toUserId===uid);
    const unread = inbox.filter(i=>!i.isRead).length;
    const teachers = db.users.filter(u=>u.role==='teacher');
    const admins = db.users.filter(u=>u.role==='management');
    const students = db.users.filter(u=>u.role==='student');
    const pendingGrades = (db.courseGrades||[]).filter(g=>g.status==='confirmed').length;

    const [addModal, setAddModal] = useState(null); // 'teacher'|'management'|'student'
    const emptyForm = { name:'', accessKey:'', password:'', phone:'', email:'', img:null, specsText:'', diploma:'sunnah', attendanceGroup:'weekend', academicYear:'' };
    const [form, setForm] = useState(emptyForm);
    const [selTeacher, setSelTeacher] = useState(null);

    const tabs = [
      { id:'inbox', label:t('inbox'), icon:'inbox', badge:unread },
      ...(isDirector ? [{ id:'admins', label:t('admins'), icon:'briefcase', badge:0 }] : []),
      { id:'teachers', label:t('teachers'), icon:'users', badge:0 },
      { id:'students', label:t('students'), icon:'gradCap', badge:0 },
      { id:'curriculum', label:t('curriculum'), icon:'book', badge:0 },
      { id:'approval', label:t('gradeApproval'), icon:'checkCircle', badge:pendingGrades },
      { id:'schedules', label:t('createSchedules'), icon:'calendar', badge:0 },
      { id:'announcements', label:t('createAnnouncements'), icon:'megaphone', badge:0 },
      { id:'cloud', label:t('cloudSystem'), icon:'cloud', badge:0 },
    ];

    const openAdd = (role)=>{ setForm({ ...emptyForm }); setAddModal(role); };
    const saveAdd = ()=>{
      if(!form.name||!form.accessKey||!form.password) return;
      const payload = { name:form.name, accessKey:form.accessKey, password:form.password, phone:form.phone, email:form.email, img:form.img };
      if(addModal==='teacher') payload.specializations = form.specsText.split(/[،,]/).map(s=>s.trim()).filter(Boolean);
      if(addModal==='student'){ payload.diploma = form.diploma; payload.attendanceGroup = form.attendanceGroup; payload.academicYear = tr(X.diploma(form.diploma)&&X.diploma(form.diploma).name, lang); }
      actions.addUser(addModal, payload);
      setAddModal(null);
    };

    const selectedTeacher = teachers.find(x=>x.accessKey===selTeacher);

    return (
      <DashShell user={user} lang={lang} setLang={setLang} panelLabel={isDirector?t('directorPanel'):t('adminPanel')} accent={theme.primaryDeep}
        tabs={tabs} active={active} setActive={setActive} onLogout={onLogout} onHome={onHome}
        onEditAvatar={(url)=>actions.setUserImage(uid, url)}>

        {active==='inbox' && <InboxView items={inbox} users={db.users} lang={lang} onMarkRead={actions.markRead} onDownloadSchedule={downloadScheduleCSV} />}

        {active==='admins' && isDirector && (
          <div style={{ maxWidth:560, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}><Icon name="briefcase" size={19} color={theme.primary} /><h2 style={{ fontSize:18, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('admins')}</h2><Badge tone="neutral">{admins.length}</Badge></div>
              <Btn size="sm" variant="primary" icon="plus" onClick={()=>openAdd('management')}>{t('addAdmin')}</Btn>
            </div>
            <PeopleList lang={lang} list={admins} accent={theme.primaryDeep} role="management" onDelete={actions.deleteUser} db={db} t={t} />
          </div>
        )}

        {active==='teachers' && (
          <div style={{ display:'flex', gap:24 }} className="tc-split">
            <div style={{ width:300, flexShrink:0 }} className="tc-split-aside">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}><Icon name="users" size={18} color={theme.primary} /><h3 style={{ fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{t('teachers')}</h3><Badge tone="neutral">{teachers.length}</Badge></div>
                <Btn size="sm" variant="primary" icon="plus" onClick={()=>openAdd('teacher')}>{t('add')}</Btn>
              </div>
              <PeopleList lang={lang} list={teachers} accent={theme.tan} role="teacher" onDelete={actions.deleteUser} db={db} t={t} onSelect={setSelTeacher} selId={selTeacher} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {selectedTeacher ? (
                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <AvatarUpload name={selectedTeacher.name} img={selectedTeacher.img} size={56} accent={theme.tan} onPick={(url)=>actions.setUserImage(selectedTeacher.accessKey, url)} />
                      <div><h2 style={{ fontSize:19, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{selectedTeacher.name}</h2><p style={{ fontSize:13, color:theme.muted }}>{(selectedTeacher.specializations||[]).join('، ')}</p></div>
                    </div>
                    <Btn variant="primary" icon="briefcase" onClick={()=>setActive('curriculum')}>{t('curriculum')}</Btn>
                  </div>
                  <TeacherAssignPanel teacher={selectedTeacher} lang={lang} db={db} actions={actions} />
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:360, color:theme.muted }}>
                  <Icon name="users" size={40} color={theme.mutedSoft} style={{ marginBottom:12 }} />
                  <p style={{ fontSize:14 }}>{lang==='ar'?'اختر معلماً لإدارة توكيلاته':'Select a teacher to manage delegations'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {active==='schedules' && <SchedulesTab lang={lang} db={db} actions={actions} uid={uid} />}
        {active==='announcements' && <AnnouncementsTab lang={lang} db={db} actions={actions} uid={uid} />}
        {active==='cloud' && <CloudView lang={lang} db={db} actions={actions} uid={uid} canShare schedules={db.schedules} />}
        {active==='students' && <LookupTab lang={lang} db={db} actions={actions} onAdd={()=>openAdd('student')} />}
        {active==='curriculum' && <CurriculumTab lang={lang} db={db} actions={actions} uid={uid} />}
        {active==='approval' && <ApprovalTab lang={lang} db={db} actions={actions} uid={uid} />}

        {/* add user modal */}
        {addModal && (
          <Modal title={addModal==='teacher'?t('addTeacher'):addModal==='student'?t('addStudent'):t('addAdmin')} onClose={()=>setAddModal(null)} width={440}>
            <div style={{ display:'grid', gap:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <AvatarUpload name={form.name||'?'} img={form.img} size={60} accent={addModal==='teacher'?theme.tan:addModal==='student'?theme.gold:theme.primaryDeep} onPick={(url)=>setForm({...form,img:url})} />
                <div style={{ fontSize:12.5, color:theme.muted, lineHeight:1.6 }}>{t('photo')}<br/><span style={{ color:theme.mutedSoft }}>{lang==='ar'?'انقر على الصورة للاختيار من الجهاز':'Click the photo to choose from device'}</span></div>
              </div>
              <Field label={t('name')} required><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label={t('accessKey')} required><Input value={form.accessKey} onChange={e=>setForm({...form,accessKey:e.target.value})} placeholder={addModal==='teacher'?'T102':addModal==='student'?'S160':'K102'} dir="ltr" /></Field>
                <Field label={t('password')} required><Input value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="****" dir="ltr" /></Field>
              </div>
              {addModal==='teacher' && (
                <Field label={t('specializations')} hint={t('specsHint')}><Input value={form.specsText} onChange={e=>setForm({...form,specsText:e.target.value})} placeholder={lang==='ar'?'العقيدة، علم الرجال':'Aqidah, Rijal'} /></Field>
              )}
              {addModal==='student' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Field label={t('diploma')}><Select value={form.diploma} onChange={e=>setForm({...form,diploma:e.target.value})}>{X.DIPLOMAS.map(d=><option key={d.id} value={d.id}>{tr(d.name,lang)}</option>)}</Select></Field>
                  <Field label={t('attendanceGroup')}>
                    <div style={{ display:'flex', gap:6 }}>
                      {[['weekend',t('weekend')],['weekday',t('weekday')]].map(([v,lab])=>{
                        const on=form.attendanceGroup===v;
                        return <button key={v} type="button" onClick={()=>setForm({...form,attendanceGroup:v})} style={{ flex:1, padding:'10px 6px', borderRadius:10, border:`1.5px solid ${on?theme.primary:theme.line}`, background:on?theme.creamDeep:theme.paper, cursor:'pointer', fontFamily:'Cairo, sans-serif', fontWeight:700, fontSize:12.5, color:on?theme.ink:theme.brown }}>{lab}</button>;
                      })}
                    </div>
                  </Field>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label={t('phone')}><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} dir="ltr" /></Field>
                <Field label={t('email')}><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} dir="ltr" /></Field>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <Btn full variant="soft" onClick={()=>setAddModal(null)}>{t('cancel')}</Btn>
                <Btn full variant="primary" onClick={saveAdd}>{t('add')}</Btn>
              </div>
            </div>
          </Modal>
        )}
      </DashShell>
    );
  }

  window.Dashboards = window.Dashboards || {};
  window.Dashboards.ManagementDashboard = ManagementDashboard;
})();
