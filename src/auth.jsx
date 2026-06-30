/* =========================================================================
   Auth flow — window.Auth.AuthFlow
   Stages: initial → student-login | student-register | staff-select → staff-login
   ========================================================================= */
(function () {
  const { theme, L, Icon, diplomas } = window.TC;
  const { Logo, Btn, Card, Field, Input, Select, Textarea, readImageAsDataURL, readFileAsDataURL } = window.UI;
  const { useState } = React;

  // خانة رفع ملف واحد — توضّح بجلاء أن الملف «تم استلامه»
  function FileSlot({ label, required, value, onPick, onRemove, lang }) {
    const ref = React.useRef(null);
    const [busy, setBusy] = useState(false);
    const onChange = async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      setBusy(true);
      try {
        const isImage = /^image\//.test(f.type || '');
        const dataUrl = isImage ? await readImageAsDataURL(f, 900) : await readFileAsDataURL(f);
        onPick({ label, name: f.name, size: f.size, isImage, dataUrl });
      } catch (err) { alert(lang==='ar'?'تعذّر قراءة الملف':'Could not read file'); }
      setBusy(false); if (ref.current) ref.current.value = '';
    };
    const kb = value && value.size ? (value.size > 1048576 ? (value.size/1048576).toFixed(1)+' MB' : Math.max(1, Math.round(value.size/1024))+' KB') : '';
    return (
      <Field label={label} required={required}>
        {value ? (
          <div style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 13px', borderRadius:12, border:`1.5px solid ${theme.ok}`, background:theme.okBg }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="checkCircle" size={18} color={theme.ok} /></div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12.5, fontWeight:700, color:theme.ok }}>{lang==='ar'?'تم استلام الملف':'File received'}</p>
              <p style={{ fontSize:11.5, color:theme.brown, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} dir="ltr">{value.name}{kb?' · '+kb:''}</p>
            </div>
            <button type="button" onClick={onRemove} title={lang==='ar'?'إزالة':'Remove'} style={{ width:30, height:30, borderRadius:8, background:'#fff', border:`1px solid ${theme.line}`, color:theme.bad, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="x" size={15} /></button>
          </div>
        ) : (
          <label style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:12, border:`1.5px dashed ${theme.line}`, cursor:'pointer', color:theme.muted, fontSize:13, background:theme.paperAlt }}>
            <Icon name={busy?'clock':'upload'} size={17} color={theme.primary} /> {busy ? (lang==='ar'?'جارٍ الرفع…':'Uploading…') : (lang==='ar'?'اختر ملفًا…':'Choose file…')}
            <input ref={ref} type="file" style={{ display:'none' }} onChange={onChange} />
          </label>
        )}
      </Field>
    );
  }

  function Shell({ lang, setLang, onBack, children, narrow }) {
    const t = L(lang);
    return (
      <div style={{ minHeight:'100vh', background:`linear-gradient(165deg, ${theme.cream}, ${theme.paperAlt})`, padding:'28px 18px 60px' }}>
        <div style={{ maxWidth:narrow?460:780, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32 }}>
            <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', color:theme.primary, cursor:'pointer', fontFamily:'Cairo, sans-serif', fontWeight:600, fontSize:14 }}>
              <Icon name={lang==='ar'?'arrowRight':'arrowLeft'} size={17} /> {t('back')}
            </button>
            <button onClick={()=>setLang(lang==='ar'?'en':'ar')} style={{ display:'flex', alignItems:'center', gap:7, background:theme.paper, border:`1px solid ${theme.line}`, borderRadius:10, padding:'7px 13px', color:theme.brown, cursor:'pointer', fontFamily:'Cairo, sans-serif', fontWeight:600, fontSize:13 }}>
              <Icon name="globe" size={15} /> {t('langLabel')}
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  function EntryCard({ icon, color, title, body, onClick, lang }) {
    return (
      <Card hover onClick={onClick} pad={20} style={{ display:'flex', alignItems:'center', gap:18 }}>
        <div style={{ width:54, height:54, borderRadius:15, background:color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name={icon} size={26} color="#fff" />
        </div>
        <div style={{ flex:1 }}>
          <h3 style={{ fontSize:18, fontWeight:700, color:theme.ink, fontFamily:'Cairo, sans-serif', marginBottom:3 }}>{title}</h3>
          <p style={{ fontSize:14, color:theme.muted }}>{body}</p>
        </div>
        <Icon name={lang==='ar'?'arrowLeft':'arrowRight'} size={20} color={theme.mutedSoft} />
      </Card>
    );
  }

  function LoginForm({ lang, role, title, icon, color, onLogin }) {
    const t = L(lang);
    const [key, setKey] = useState('');
    const [pwd, setPwd] = useState('');
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const submit = async (e) => {
      e.preventDefault();
      setErr(''); setLoading(true);
      const res = await onLogin(key, pwd, role);
      setLoading(false);
      if (res && res.error) setErr(res.error);
    };
    return (
      <div style={{ maxWidth:440, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:8 }}>
          <div style={{ width:46, height:46, borderRadius:13, background:color, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name={icon} size={22} color="#fff" /></div>
          <h1 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:26, color:theme.ink }}>{t('loginAs')} {title}</h1>
        </div>
        <p style={{ fontSize:14, color:theme.muted, marginBottom:26 }}>{t('enterCreds')}</p>
        <Card pad={26}>
          <form onSubmit={submit} style={{ display:'grid', gap:18 }}>
            <Field label={t('accessKey')} required>
              <Input value={key} onChange={e=>setKey(e.target.value)} placeholder={t('accessKeyPh')} dir="ltr" style={{ textAlign:lang==='ar'?'right':'left' }} />
            </Field>
            <Field label={t('passKey')} required>
              <div style={{ position:'relative' }}>
                <Input type={show?'text':'password'} value={pwd} onChange={e=>setPwd(e.target.value)} placeholder={t('passKeyPh')} dir="ltr" style={{ textAlign:lang==='ar'?'right':'left', paddingInlineEnd:42 }} />
                <button type="button" onClick={()=>setShow(!show)} style={{ position:'absolute', insetInlineEnd:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:theme.muted }}>
                  <Icon name={show?'eyeOff':'eye'} size={18} />
                </button>
              </div>
            </Field>
            {err && <div style={{ fontSize:13, color:theme.bad, background:theme.badBg, padding:'9px 13px', borderRadius:10 }}>{err}</div>}
            <Btn type="submit" full size="lg" variant="primary" disabled={loading}>{loading?t('loggingIn'):t('login')}</Btn>
          </form>
        </Card>
      </div>
    );
  }

  // ---- registration form
  function RegisterForm({ lang, onBack, onRegister }) {
    const t = L(lang);
    const [d, setD] = useState({ full_name:'', national_id:'', gender:'', birth_place:'', birth_y:'', birth_m:'', birth_d:'', marital:'', nationality:'', residence:'', phone:'', email:'', workplace:'', job_title:'', last_qual:'', specialization:'', provider:'', grad_year:'', program:'', study_days:'', how_heard:'', pledge:false, notes:'', attachments:{} });
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const set = (k,v) => setD(p=>({ ...p, [k]:v }));
    const setAttach = (key, val) => setD(p=>({ ...p, attachments:{ ...(p.attachments||{}), [key]: val } }));
    const removeAttach = (key) => setD(p=>{ const a={ ...(p.attachments||{}) }; delete a[key]; return { ...p, attachments:a }; });
    const submit = async (e) => {
      e.preventDefault();
      if (!d.full_name || !d.national_id || !d.gender || !d.phone || !d.program || !d.pledge) { alert(t('fillRequired')); return; }
      setBusy(true); setErr('');
      try {
        const res = await onRegister(d);
        if (res && res.ok === false) { setErr(res.error || (lang==='ar'?'تعذّر إرسال الطلب. حاول مجددًا.':'Could not submit. Try again.')); setBusy(false); return; }
        setSent(true);
      } catch (er) { setErr((er && er.message) || String(er)); }
      setBusy(false);
    };
    if (sent) return (
      <div style={{ maxWidth:480, margin:'40px auto 0', textAlign:'center' }}>
        <Card pad={40}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:theme.okBg, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px' }}><Icon name="checkCircle" size={42} color={theme.ok} /></div>
          <h2 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:26, color:theme.ink, marginBottom:12 }}>{lang==='ar'?'تم استلام طلبك':'Application Received'}</h2>
          <p style={{ fontSize:15, color:theme.brown, lineHeight:1.8, marginBottom:24 }}>{t('appSent')}</p>
          <Btn variant="primary" onClick={onBack}>{t('back')}</Btn>
        </Card>
      </div>
    );
    const sec = (title, icon, body) => (
      <Card pad={24} style={{ marginBottom:18 }}>
        <h3 style={{ display:'flex', alignItems:'center', gap:9, fontSize:16, fontWeight:700, color:theme.ink, marginBottom:18, fontFamily:'Cairo, sans-serif' }}><Icon name={icon} size={18} color={theme.primary} />{title}</h3>
        {body}
      </Card>
    );
    const g2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 };
    const months = lang==='ar' ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'] : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:6 }}>
          <div style={{ width:46, height:46, borderRadius:13, background:theme.gold, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="user" size={22} color="#fff" /></div>
          <h1 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:26, color:theme.ink }}>{t('regFormTitle')}</h1>
        </div>
        <p style={{ fontSize:14, color:theme.muted, marginBottom:26 }}>{t('regFormSub')}</p>
        <form onSubmit={submit}>
          {sec(t('secPersonal'), 'user', (
            <div style={g2} className="tc-form-grid">
              <Field label={t('fullName')} required><Input value={d.full_name} onChange={e=>set('full_name',e.target.value)} /></Field>
              <Field label={t('idNumber')} required><Input value={d.national_id} onChange={e=>set('national_id',e.target.value)} dir="ltr" style={{ textAlign:lang==='ar'?'right':'left' }} /></Field>
              <Field label={t('gender')} required>
                <Select value={d.gender} onChange={e=>set('gender',e.target.value)}><option value="">{t('chooseOpt')}</option><option value="male">{t('male')}</option><option value="female">{t('female')}</option></Select>
              </Field>
              <Field label={t('birthPlace')}><Input value={d.birth_place} onChange={e=>set('birth_place',e.target.value)} /></Field>
              <div style={{ gridColumn:'1 / -1' }}>
                <Field label={t('birthDate')}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                    <Select value={d.birth_d} onChange={e=>set('birth_d',e.target.value)}><option value="">{lang==='ar'?'اليوم':'Day'}</option>{Array.from({length:31},(_,i)=>i+1).map(x=><option key={x} value={x}>{x}</option>)}</Select>
                    <Select value={d.birth_m} onChange={e=>set('birth_m',e.target.value)}><option value="">{lang==='ar'?'الشهر':'Month'}</option>{months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</Select>
                    <Select value={d.birth_y} onChange={e=>set('birth_y',e.target.value)}><option value="">{lang==='ar'?'السنة':'Year'}</option>{Array.from({length:60},(_,i)=>2008-i).map(y=><option key={y} value={y}>{y}</option>)}</Select>
                  </div>
                </Field>
              </div>
              <Field label={t('maritalStatus')}><Select value={d.marital} onChange={e=>set('marital',e.target.value)}><option value="">{t('chooseOpt')}</option><option value="single">{t('single')}</option><option value="married">{t('married')}</option><option value="other">{t('other')}</option></Select></Field>
              <Field label={t('nationality')}><Input value={d.nationality} onChange={e=>set('nationality',e.target.value)} /></Field>
            </div>
          ))}
          {sec(t('secContact'), 'phone', (
            <div style={g2} className="tc-form-grid">
              <Field label={t('phone')} required><Input value={d.phone} onChange={e=>set('phone',e.target.value)} placeholder="05xxxxxxxx" dir="ltr" style={{ textAlign:lang==='ar'?'right':'left' }} /></Field>
              <Field label={t('email')}><Input type="email" value={d.email} onChange={e=>set('email',e.target.value)} dir="ltr" style={{ textAlign:lang==='ar'?'right':'left' }} /></Field>
              <Field label={t('residence')}><Input value={d.residence} onChange={e=>set('residence',e.target.value)} /></Field>
              <Field label={t('workplace')}><Input value={d.workplace} onChange={e=>set('workplace',e.target.value)} /></Field>
            </div>
          ))}
          {sec(t('secQual'), 'gradCap', (
            <div style={g2} className="tc-form-grid">
              <Field label={t('lastQual')}>
                <Select value={d.last_qual} onChange={e=>set('last_qual',e.target.value)}><option value="">{t('chooseOpt')}</option>{(lang==='ar'?['ثانوي','دبلوم','بكالوريوس','ماجستير','دكتوراه']:['High School','Diploma','Bachelor','Master','PhD']).map((x,i)=><option key={i} value={x}>{x}</option>)}</Select>
              </Field>
              <Field label={t('specialization')}><Input value={d.specialization} onChange={e=>set('specialization',e.target.value)} /></Field>
              <Field label={t('qualProvider')}><Input value={d.provider} onChange={e=>set('provider',e.target.value)} /></Field>
              <Field label={t('gradYear')}><Input value={d.grad_year} onChange={e=>set('grad_year',e.target.value)} dir="ltr" style={{ textAlign:lang==='ar'?'right':'left' }} /></Field>
            </div>
          ))}
          {sec(t('secProgram'), 'fileText', (
            <div style={g2} className="tc-form-grid">
              <Field label={t('programName')} required>
                <Select value={d.program} onChange={e=>set('program',e.target.value)}><option value="">{t('chooseOpt')}</option>{diplomas.map(dp=><option key={dp.id} value={dp.id}>{dp.name[lang]}</option>)}</Select>
              </Field>
              <Field label={t('studyDays')}><Select value={d.study_days} onChange={e=>set('study_days',e.target.value)}><option value="">{t('chooseOpt')}</option>{(lang==='ar'?['الاثنين - الأربعاء','الجمعة - الأحد']:['Mon-Wed','Fri-Sun']).map((x,i)=><option key={i} value={x}>{x}</option>)}</Select></Field>
              <div style={{ gridColumn:'1 / -1' }}>
                <Field label={t('howHeard')}><Select value={d.how_heard} onChange={e=>set('how_heard',e.target.value)}><option value="">{t('chooseOpt')}</option>{(lang==='ar'?['عبر الأصدقاء','وسائل التواصل الاجتماعي','موقع المركز','أخرى']:['Friends','Social media','Website','Other']).map((x,i)=><option key={i} value={x}>{x}</option>)}</Select></Field>
              </div>
            </div>
          ))}
          {sec(t('secAttach'), 'upload', (
            <div style={g2} className="tc-form-grid">
              {[['hsCert',t('hsCert')],['photo',t('personalPhoto')],['recommendation',t('recommendation')],['addCerts',t('addCerts')]].map(([key,lab],i)=>(
                <FileSlot key={key} label={lab} required={i<3} lang={lang}
                  value={(d.attachments||{})[key]}
                  onPick={(v)=>setAttach(key, v)} onRemove={()=>removeAttach(key)} />
              ))}
            </div>
          ))}
          <Card pad={24} style={{ marginBottom:22 }}>
            <label style={{ display:'flex', alignItems:'flex-start', gap:11, cursor:'pointer', marginBottom:16 }}>
              <input type="checkbox" checked={d.pledge} onChange={e=>set('pledge',e.target.checked)} style={{ marginTop:3, width:17, height:17, accentColor:theme.primary }} />
              <span style={{ fontSize:13.5, color:theme.brown, lineHeight:1.7 }}>{t('pledge')} <span style={{ color:theme.gold }}>*</span></span>
            </label>
            <Field label={t('notes')}><Textarea value={d.notes} onChange={e=>set('notes',e.target.value)} rows={3} /></Field>
          </Card>
          {err && <Card pad={14} style={{ marginBottom:16, border:`1px solid ${theme.bad}`, background:theme.badBg }}><p style={{ fontSize:13.5, color:theme.bad, display:'flex', alignItems:'center', gap:8 }}><Icon name="alert" size={16} />{err}</p></Card>}
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
            <Btn variant="soft" onClick={onBack} disabled={busy}>{t('cancel')}</Btn>
            <Btn type="submit" variant="primary" iconRight="send" disabled={busy}>{busy ? (lang==='ar'?'جارٍ الإرسال…':'Submitting…') : t('submitApp')}</Btn>
          </div>
        </form>
      </div>
    );
  }

  function AuthFlow({ lang, setLang, onBack, onLogin, onRegister, startStage='initial' }) {
    const t = L(lang);
    const [stage, setStage] = useState(startStage);
    const [role, setRole] = useState(null);
    const back = () => {
      if (stage==='staff-login') { setStage('staff-select'); setRole(null); }
      else if (['student-login','student-register','staff-select'].includes(stage)) setStage('initial');
      else onBack();
    };

    if (stage==='initial') return (
      <Shell lang={lang} setLang={setLang} onBack={onBack}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <Logo size={64} />
          <h1 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:'clamp(26px,4vw,38px)', color:theme.ink, margin:'18px 0 8px' }}>{t('welcome')}</h1>
          <p style={{ fontSize:15, color:theme.muted }}>{t('chooseOption')}</p>
        </div>
        <div style={{ display:'grid', gap:14, maxWidth:560, margin:'0 auto' }}>
          <EntryCard lang={lang} icon="users" color={theme.primary} title={t('regStudent')} body={t('regStudentB')} onClick={()=>{ setRole('student'); setStage('student-login'); }} />
          <EntryCard lang={lang} icon="user" color={theme.gold} title={t('newStudent')} body={t('newStudentB')} onClick={()=>setStage('student-register')} />
          <EntryCard lang={lang} icon="gradCap" color={theme.primaryDeep} title={t('staff')} body={t('staffB')} onClick={()=>setStage('staff-select')} />
        </div>
      </Shell>
    );

    if (stage==='student-login') return (
      <Shell lang={lang} setLang={setLang} onBack={back} narrow>
        <LoginForm lang={lang} role="student" title={t('student')} icon="users" color={theme.primary} onLogin={onLogin} />
      </Shell>
    );

    if (stage==='student-register') return (
      <Shell lang={lang} setLang={setLang} onBack={back}>
        <RegisterForm lang={lang} onBack={back} onRegister={onRegister} />
      </Shell>
    );

    if (stage==='staff-select') return (
      <Shell lang={lang} setLang={setLang} onBack={back}>
        <div style={{ marginBottom:30 }}>
          <h1 style={{ fontFamily:'Amiri, serif', fontWeight:700, fontSize:30, color:theme.ink, marginBottom:6 }}>{t('chooseAccount')}</h1>
          <p style={{ fontSize:14, color:theme.muted }}>{t('staff')}</p>
        </div>
        <div style={{ display:'grid', gap:14, maxWidth:560 }}>
          <EntryCard lang={lang} icon="gradCap" color={theme.primary} title={t('teacher')} body={t('teacherPortalDesc')} onClick={()=>{ setRole('teacher'); setStage('staff-login'); }} />
          <EntryCard lang={lang} icon="userCheck" color={theme.primaryDeep} title={t('admin')} body={t('adminPortalDesc')} onClick={()=>{ setRole('admin'); setStage('staff-login'); }} />
        </div>
      </Shell>
    );

    if (stage==='staff-login') {
      const info = role==='admin' ? { title:t('admin'), icon:'userCheck', color:theme.primaryDeep } : { title:t('teacher'), icon:'gradCap', color:theme.primary };
      return (
        <Shell lang={lang} setLang={setLang} onBack={back} narrow>
          <LoginForm lang={lang} role={role} title={info.title} icon={info.icon} color={info.color} onLogin={onLogin} />
        </Shell>
      );
    }
    return null;
  }

  window.Auth = { AuthFlow };
})();
