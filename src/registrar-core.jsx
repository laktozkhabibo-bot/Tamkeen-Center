/* =========================================================================
   التسجيل والقبول — الأساس: نصوص، حالات، لوحة الإحصائيات،
   قائمة الطلبات وبطاقاتها، نافذة تفاصيل الطلب.  window.RegCore
   ========================================================================= */
(function () {
  const { theme, L, Icon, fmtDate, pick, diplomas } = window.TC;
  const { Btn, Badge, Card, EmptyState, Field, Input, Select, Textarea, Modal, Avatar } = window.UI;
  const { useState } = React;

  // نصوص ثنائية اللغة خاصة بالقسم
  const STR = {
    panel:{ar:'لوحة التسجيل والقبول',en:'Admissions Panel'},
    dashboard:{ar:'لوحة المعلومات',en:'Dashboard'},
    requests:{ar:'طلبات التسجيل',en:'Applications'},
    accepted:{ar:'المقبولون',en:'Accepted'},
    suspended:{ar:'المعلّقون',en:'Suspended'},
    rejected:{ar:'المرفوضون',en:'Rejected'},
    exams:{ar:'اختبارات القبول',en:'Admission Exams'},
    results:{ar:'النتائج',en:'Results'},
    recordings:{ar:'الفيديوهات المسجلة',en:'Recordings'},
    messages:{ar:'الرسائل والإشعارات',en:'Messages'},
    reports:{ar:'التقارير',en:'Reports'},
    total:{ar:'إجمالي الطلبات',en:'Total applications'},
    newReq:{ar:'طلبات جديدة',en:'New'},
    review:{ar:'قيد المراجعة',en:'Under review'},
    awaitingExam:{ar:'بانتظار الاختبار',en:'Awaiting exam'},
    passed:{ar:'الناجحون',en:'Passed'},
    failed:{ar:'الراسبون',en:'Failed'},
    enrolled:{ar:'تم تسجيلهم',en:'Enrolled'},
    recentActivity:{ar:'أحدث الطلبات',en:'Recent applications'},
    all:{ar:'الكل',en:'All'},
    search:{ar:'بحث بالاسم أو الهاتف أو الرقم…',en:'Search name, phone or ID…'},
    program:{ar:'البرنامج',en:'Program'},
    submittedAt:{ar:'تاريخ التقديم',en:'Submitted'},
    viewDetails:{ar:'عرض التفاصيل',en:'View details'},
    noReq:{ar:'لا توجد طلبات',en:'No applications'},
    noReqB:{ar:'ستظهر هنا الطلبات الواردة من نموذج التسجيل',en:'Applications submitted from the registration form appear here'},
    applicant:{ar:'بيانات المتقدّم',en:'Applicant'},
    contact:{ar:'بيانات التواصل',en:'Contact'},
    academic:{ar:'المؤهل والبرنامج',en:'Qualification & program'},
    timeline:{ar:'سجل الإجراءات',en:'Activity log'},
    actions:{ar:'الإجراءات',en:'Actions'},
    accept:{ar:'قبول الطلب',en:'Accept'},
    suspend:{ar:'تعليق',en:'Suspend'},
    reject:{ar:'رفض',en:'Reject'},
    toReview:{ar:'إلى المراجعة',en:'Move to review'},
    sendAcceptance:{ar:'رسالة قبول',en:'Acceptance message'},
    setAppt:{ar:'موعد الحضور',en:'Attendance date'},
    sendExam:{ar:'رابط الاختبار',en:'Exam link'},
    toStudent:{ar:'تحويل إلى طالب',en:'Convert to student'},
    gender:{ar:'الجنس',en:'Gender'},male:{ar:'ذكر',en:'Male'},female:{ar:'أنثى',en:'Female'},
    idNumber:{ar:'رقم الهوية',en:'ID number'},
    nationality:{ar:'الجنسية',en:'Nationality'},
    residence:{ar:'الإقامة',en:'Residence'},
    phone:{ar:'الجوال',en:'Phone'},
    email:{ar:'البريد',en:'Email'},
    lastQual:{ar:'المؤهل',en:'Qualification'},
    specialization:{ar:'التخصص',en:'Specialization'},
    studyDays:{ar:'أيام الدراسة',en:'Study days'},
    notes:{ar:'ملاحظات',en:'Notes'},
    appointmentSet:{ar:'موعد الحضور',en:'Appointment'},
    examLinkSent:{ar:'اختبار القبول',en:'Admission exam'},
    chooseExam:{ar:'اختر اختبار القبول',en:'Choose an exam'},
    send:{ar:'إرسال',en:'Send'},
    save:{ar:'حفظ',en:'Save'},
    cancel:{ar:'إلغاء',en:'Cancel'},
    channel:{ar:'القناة',en:'Channel'},
    subject:{ar:'العنوان',en:'Subject'},
    body:{ar:'نص الرسالة',en:'Message'},
    emailCh:{ar:'بريد إلكتروني',en:'Email'},
    smsCh:{ar:'رسالة نصية',en:'SMS'},
    waCh:{ar:'واتساب',en:'WhatsApp'},
    sent:{ar:'تم الإرسال',en:'Sent'},
    convertHint:{ar:'يُولَّد مفتاح دخول وكلمة مرور للطالب. سلّمها له لتسجيل الدخول لبوابة الطالب.',en:'A login key and password are generated for the student.'},
    credentials:{ar:'بيانات دخول الطالب',en:'Student credentials'},
    accessKey:{ar:'مفتاح الدخول',en:'Access key'},
    passwordL:{ar:'كلمة المرور',en:'Password'},
    copy:{ar:'نسخ',en:'Copy'},
    copied:{ar:'تم النسخ',en:'Copied'},
    deleteReq:{ar:'حذف الطلب',en:'Delete'},
    attachments:{ar:'المرفقات',en:'Attachments'},
    noAttachments:{ar:'لم يرفق المتقدّم أي ملفات',en:'No files attached'},
    viewFile:{ar:'عرض',en:'View'},
    downloadFile:{ar:'تحميل',en:'Download'},
    converting:{ar:'جارٍ إنشاء حساب الطالب…',en:'Creating student account…'},
    acceptMsgDefault:{ar:'يسرّنا إبلاغكم بقبول طلب التحاقكم بمركز تمكين. نرحب بكم وسنوافيكم بموعد الحضور وتفاصيل البدء قريبًا.',en:'We are pleased to inform you that your application to Tamkeen Center has been accepted.'},
  };
  const T = (lang) => (k) => (STR[k] && STR[k][lang]) || k;

  // حالات الطلب + ألوانها
  const STATUS = {
    new:        { ar:'طلب جديد', en:'New', tone:'info', icon:'inbox' },
    review:     { ar:'قيد المراجعة', en:'Under review', tone:'warn', icon:'search' },
    accepted:   { ar:'مقبول', en:'Accepted', tone:'ok', icon:'checkCircle' },
    suspended:  { ar:'معلّق', en:'Suspended', tone:'gold', icon:'clock' },
    rejected:   { ar:'مرفوض', en:'Rejected', tone:'bad', icon:'x' },
    awaiting_exam:{ ar:'بانتظار الاختبار', en:'Awaiting exam', tone:'neutral', icon:'fileText' },
    passed:     { ar:'ناجح', en:'Passed', tone:'ok', icon:'award' },
    failed:     { ar:'راسب', en:'Failed', tone:'bad', icon:'alert' },
    enrolled:   { ar:'طالب مُسجّل', en:'Enrolled', tone:'ok', icon:'gradCap' },
  };
  const statusLabel = (s, lang) => (STATUS[s] ? STATUS[s][lang] : s);
  const programLabel = (id, lang) => { const d = diplomas.find((x) => x.id === id); return d ? pick(d.name, lang) : (id || '—'); };

  // رابط صفحة الاختبار الكامل (exam.html بجانب index.html)
  const examUrl = (link) => {
    const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    return base + 'exam.html?e=' + encodeURIComponent(link);
  };

  function SectionHead({ icon, title, count, action, color }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:theme.goldSoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name={icon} size={20} color={color || theme.primaryDeep} />
          </div>
          <h2 style={{ fontSize:19, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif' }}>{title}</h2>
          {count != null && <Badge tone="neutral">{count}</Badge>}
        </div>
        {action}
      </div>
    );
  }

  function StatCard({ icon, label, value, tone }) {
    const c = tone || theme.primary;
    const bg = { ok:theme.okBg, warn:theme.warnBg, bad:theme.badBg, info:theme.infoBg, gold:theme.goldSoft }[tone] || theme.creamDeep;
    const fg = { ok:theme.ok, warn:theme.warn, bad:theme.bad, info:theme.info, gold:theme.primaryDeep }[tone] || theme.primary;
    return (
      <Card pad={18}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:46, height:46, borderRadius:13, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name={icon} size={22} color={fg} />
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:28, fontWeight:800, color:theme.ink, fontFamily:'Cairo, sans-serif', lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:12.5, color:theme.muted, marginTop:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</div>
          </div>
        </div>
      </Card>
    );
  }

  function StatsTab({ db, lang, onOpen, goTab }) {
    const t = T(lang);
    const reqs = db.requests;
    const count = (s) => reqs.filter((r) => r.status === s).length;
    const stats = [
      { icon:'inbox', label:t('newReq'), value:count('new'), tone:'info', go:'requests' },
      { icon:'search', label:t('review'), value:count('review'), tone:'warn', go:'requests' },
      { icon:'checkCircle', label:t('accepted'), value:count('accepted')+count('enrolled'), tone:'ok', go:'accepted' },
      { icon:'clock', label:t('suspended'), value:count('suspended'), tone:'gold', go:'suspended' },
      { icon:'x', label:t('rejected'), value:count('rejected'), tone:'bad', go:'rejected' },
      { icon:'fileText', label:t('awaitingExam'), value:count('awaiting_exam'), tone:'neutral', go:'results' },
      { icon:'award', label:t('passed'), value:count('passed'), tone:'ok', go:'results' },
      { icon:'alert', label:t('failed'), value:count('failed'), tone:'bad', go:'results' },
    ];
    const recent = [...reqs].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6);
    return (
      <div>
        <SectionHead icon="grid" title={t('dashboard')} />
        <Card pad={18} style={{ marginBottom:16, background:`linear-gradient(135deg, ${theme.primary}, ${theme.primaryDeep})`, border:'none' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div>
              <p style={{ color:theme.goldSoft, fontSize:13, fontWeight:600, marginBottom:4 }}>{t('total')}</p>
              <p style={{ color:'#fff', fontSize:38, fontWeight:800, fontFamily:'Cairo, sans-serif', lineHeight:1 }}>{reqs.length}</p>
            </div>
            <Btn variant="soft" icon="inbox" onClick={()=>goTab('requests')} style={{ background:'rgba(255,255,255,.16)', color:'#fff', border:'1px solid rgba(255,255,255,.32)' }}>{t('requests')}</Btn>
          </div>
        </Card>
        <div className="tc-reg-stats" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:26 }}>
          {stats.map((s,k)=>(
            <div key={k} onClick={()=>goTab(s.go)} style={{ cursor:'pointer' }}><StatCard {...s} /></div>
          ))}
        </div>
        <SectionHead icon="clock" title={t('recentActivity')} />
        {recent.length===0 ? <EmptyState icon="inbox" title={t('noReq')} body={t('noReqB')} /> : (
          <div style={{ display:'grid', gap:10 }}>
            {recent.map((r)=><RequestRow key={r.id} r={r} lang={lang} onOpen={onOpen} />)}
          </div>
        )}
      </div>
    );
  }

  function RequestRow({ r, lang, onOpen }) {
    const t = T(lang);
    const st = STATUS[r.status] || STATUS.new;
    return (
      <Card pad={0} hover onClick={()=>onOpen(r.id)} style={{ overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:13, padding:'13px 15px' }}>
          <Avatar name={r.full_name} size={42} accent={r.gender==='female'?theme.gold:theme.primary} />
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:14.5, fontWeight:700, color:theme.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.full_name}</p>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', fontSize:12, color:theme.muted, marginTop:3 }}>
              <span>{programLabel(r.program, lang)}</span>
              <span style={{ color:theme.line }}>•</span>
              <span dir="ltr">{r.phone}</span>
              <span style={{ color:theme.line }}>•</span>
              <span>{fmtDate(r.createdAt, lang)}</span>
            </div>
          </div>
          <Badge tone={st.tone}><Icon name={st.icon} size={12} /> {statusLabel(r.status, lang)}</Badge>
          <Icon name={lang==='ar'?'chevronLeft':'chevronRight'} size={18} color={theme.mutedSoft} />
        </div>
      </Card>
    );
  }

  // قائمة طلبات حسب نطاق (inbox = جديد+مراجعة، أو حالة محددة)
  function RequestList({ db, lang, scope, onOpen }) {
    const t = T(lang);
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState('all');
    let base;
    if (scope === 'inbox') base = db.requests.filter((r)=>['new','review','awaiting_exam','passed','failed'].includes(r.status));
    else if (scope === 'accepted') base = db.requests.filter((r)=>['accepted','enrolled'].includes(r.status));
    else if (scope === 'suspended') base = db.requests.filter((r)=>r.status==='suspended');
    else if (scope === 'rejected') base = db.requests.filter((r)=>r.status==='rejected');
    else base = db.requests;

    const chips = scope==='inbox' ? [
      { id:'all', label:t('all') },
      { id:'new', label:STATUS.new[lang] },
      { id:'review', label:STATUS.review[lang] },
      { id:'awaiting_exam', label:STATUS.awaiting_exam[lang] },
      { id:'passed', label:STATUS.passed[lang] },
      { id:'failed', label:STATUS.failed[lang] },
    ] : null;

    let list = base;
    if (chips && filter !== 'all') list = list.filter((r)=>r.status===filter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((r)=>(r.full_name||'').toLowerCase().includes(s) || (r.phone||'').includes(q) || (r.national_id||'').toLowerCase().includes(s) || (r.email||'').toLowerCase().includes(s));
    }
    list = [...list].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

    const headIcon = { inbox:'inbox', accepted:'checkCircle', suspended:'clock', rejected:'x' }[scope] || 'inbox';
    const headTitle = { inbox:t('requests'), accepted:t('accepted'), suspended:t('suspended'), rejected:t('rejected') }[scope] || t('requests');

    return (
      <div>
        <SectionHead icon={headIcon} title={headTitle} count={list.length} />
        <div style={{ position:'relative', marginBottom:12 }}>
          <Icon name="search" size={15} color={theme.muted} style={{ position:'absolute', insetInlineStart:12, top:'50%', transform:'translateY(-50%)' }} />
          <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={t('search')} style={{ paddingInlineStart:36 }} />
        </div>
        {chips && (
          <div className="tc-tabscroll" style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:2 }}>
            {chips.map((c)=>{
              const on = filter===c.id;
              return (
                <button key={c.id} onClick={()=>setFilter(c.id)} style={{ whiteSpace:'nowrap', padding:'7px 14px', borderRadius:999, border:`1px solid ${on?theme.primary:theme.line}`, background:on?theme.primary:theme.paper, color:on?'#fff':theme.brown, cursor:'pointer', fontFamily:'Cairo, sans-serif', fontWeight:600, fontSize:13, flexShrink:0 }}>{c.label}</button>
              );
            })}
          </div>
        )}
        {list.length===0 ? <EmptyState icon={headIcon} title={t('noReq')} body={t('noReqB')} /> : (
          <div style={{ display:'grid', gap:10 }}>
            {list.map((r)=><RequestRow key={r.id} r={r} lang={lang} onOpen={onOpen} />)}
          </div>
        )}
      </div>
    );
  }

  // ---- نافذة تفاصيل الطلب + الإجراءات ----
  function RequestDetail({ id, db, lang, actions, onClose }) {
    const t = T(lang);
    const r = db.requests.find((x)=>x.id===id);
    const [panel, setPanel] = useState(null); // 'accept-msg' | 'appt' | 'exam' | 'convert'
    const [toast, setToast] = useState('');
    if (!r) return null;
    const st = STATUS[r.status] || STATUS.new;
    const flash = (m)=>{ setToast(m); setTimeout(()=>setToast(''), 2200); };

    const info = (label, value, dir) => value ? (
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'8px 0', borderBottom:`1px solid ${theme.lineSoft}` }}>
        <span style={{ fontSize:13, color:theme.muted }}>{label}</span>
        <span style={{ fontSize:13.5, fontWeight:600, color:theme.ink, textAlign:'end' }} dir={dir}>{value}</span>
      </div>
    ) : null;

    const genderTxt = r.gender==='female'?t('female'):r.gender==='male'?t('male'):r.gender;

    return (
      <Modal title={r.full_name} onClose={onClose} width={560}>
        {toast && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', borderRadius:11, background:theme.okBg, color:theme.ok, fontWeight:700, fontSize:13.5, marginBottom:14 }}><Icon name="checkCircle" size={16} />{toast}</div>}

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <Badge tone={st.tone}><Icon name={st.icon} size={13} /> {statusLabel(r.status, lang)}</Badge>
          <Badge tone="neutral">{programLabel(r.program, lang)}</Badge>
          <span style={{ fontSize:12, color:theme.muted }}>{t('submittedAt')}: {fmtDate(r.createdAt, lang)}</span>
        </div>

        {/* الإجراءات السريعة للحالة */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
          <Btn size="sm" variant="primary" icon="checkCircle" onClick={()=>{ actions.setStatus(r.id,'accepted'); flash(t('sent')); }}>{t('accept')}</Btn>
          <Btn size="sm" variant="soft" icon="clock" onClick={()=>{ actions.setStatus(r.id,'suspended'); flash(t('sent')); }}>{t('suspend')}</Btn>
          <Btn size="sm" variant="danger" icon="x" onClick={()=>{ actions.setStatus(r.id,'rejected'); flash(t('sent')); }}>{t('reject')}</Btn>
          {r.status!=='review' && r.status!=='new' && <Btn size="sm" variant="ghost" icon="search" onClick={()=>{ actions.setStatus(r.id,'review'); flash(t('sent')); }}>{t('toReview')}</Btn>}
        </div>

        {/* أدوات القبول */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18, padding:14, borderRadius:14, background:theme.paperAlt, border:`1px solid ${theme.lineSoft}` }}>
          <Btn size="sm" variant="ghost" icon="mail" onClick={()=>setPanel(panel==='accept-msg'?null:'accept-msg')}>{t('sendAcceptance')}</Btn>
          <Btn size="sm" variant="ghost" icon="calendar" onClick={()=>setPanel(panel==='appt'?null:'appt')}>{t('setAppt')}</Btn>
          <Btn size="sm" variant="ghost" icon="fileText" onClick={()=>setPanel(panel==='exam'?null:'exam')}>{t('sendExam')}</Btn>
          {(r.status==='passed'||r.status==='accepted') && !r.account && <Btn size="sm" variant="gold" icon="gradCap" onClick={()=>setPanel('convert')}>{t('toStudent')}</Btn>}
        </div>

        {panel==='accept-msg' && <MessageComposer lang={lang} request={r} defaultBody={t('acceptMsgDefault')} defaultSubject={lang==='ar'?'قبول طلب الالتحاق':'Application accepted'} onSend={(m)=>{ actions.sendMessage(r.id, m); if(r.status==='new'||r.status==='review') actions.setStatus(r.id,'accepted'); setPanel(null); flash(t('sent')); }} onCancel={()=>setPanel(null)} />}
        {panel==='appt' && <ApptPicker lang={lang} value={r.appointment} onSave={(v)=>{ actions.setAppointment(r.id, v); setPanel(null); flash(t('sent')); }} onCancel={()=>setPanel(null)} />}
        {panel==='exam' && <ExamPicker lang={lang} exams={db.exams} onSend={(eid)=>{ actions.assignExam(r.id, eid); setPanel(null); flash(t('sent')); }} onCancel={()=>setPanel(null)} />}
        {panel==='convert' && <ConvertPanel lang={lang} request={r} onConvert={()=>actions.convertToStudent(r.id)} onDone={()=>setPanel(null)} onCancel={()=>setPanel(null)} />}

        {r.account && (
          <Card pad={14} style={{ marginBottom:18, border:`1.5px solid ${theme.ok}`, background:theme.okBg }}>
            <p style={{ fontSize:13, fontWeight:800, color:theme.ok, marginBottom:8, display:'flex', alignItems:'center', gap:7 }}><Icon name="gradCap" size={16} />{t('credentials')}</p>
            <div style={{ display:'flex', gap:18, flexWrap:'wrap', fontSize:13.5 }}>
              <span>{t('accessKey')}: <strong dir="ltr" style={{ fontFamily:'monospace', color:theme.ink }}>{r.account.accessKey}</strong></span>
              <span>{t('passwordL')}: <strong dir="ltr" style={{ fontFamily:'monospace', color:theme.ink }}>{r.account.password}</strong></span>
            </div>
          </Card>
        )}

        {r.appointment && <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:theme.brown, marginBottom:14 }}><Icon name="calendar" size={15} color={theme.primary} />{t('appointmentSet')}: <strong>{r.appointment}</strong></div>}

        {/* البيانات */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }} className="tc-form-grid">
          <div>
            <p style={{ fontSize:12.5, fontWeight:800, color:theme.primary, marginBottom:6 }}>{t('applicant')}</p>
            {info(t('gender'), genderTxt)}
            {info(t('idNumber'), r.national_id, 'ltr')}
            {info(t('nationality'), r.nationality)}
            {info(t('residence'), r.residence)}
          </div>
          <div>
            <p style={{ fontSize:12.5, fontWeight:800, color:theme.primary, marginBottom:6 }}>{t('contact')}</p>
            {info(t('phone'), r.phone, 'ltr')}
            {info(t('email'), r.email, 'ltr')}
            <p style={{ fontSize:12.5, fontWeight:800, color:theme.primary, margin:'14px 0 6px' }}>{t('academic')}</p>
            {info(t('lastQual'), r.last_qual)}
            {info(t('specialization'), r.specialization)}
            {info(t('studyDays'), r.study_days)}
          </div>
        </div>
        {r.notes && <Card pad={12} style={{ marginBottom:18, background:theme.paperAlt }}><p style={{ fontSize:12, color:theme.muted, marginBottom:4 }}>{t('notes')}</p><p style={{ fontSize:13.5, color:theme.brown, lineHeight:1.7 }}>{r.notes}</p></Card>}

        {/* المرفقات */}
        <p style={{ fontSize:12.5, fontWeight:800, color:theme.primary, marginBottom:10 }}>{t('attachments')}</p>
        <Attachments atts={r.attachments} lang={lang} t={t} />

        {/* السجل */}
        <p style={{ fontSize:12.5, fontWeight:800, color:theme.primary, marginBottom:10 }}>{t('timeline')}</p>
        <div style={{ display:'grid', gap:0, marginBottom:8 }}>
          {[...(r.history||[])].reverse().map((h,k)=>(
            <div key={k} style={{ display:'flex', gap:11, paddingBottom:14, position:'relative' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:theme.primary, flexShrink:0, marginTop:4 }} />
                {k < (r.history.length-1) && <span style={{ width:2, flex:1, background:theme.line, marginTop:3 }} />}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, color:theme.ink, fontWeight:600 }}>{h.note}</p>
                <p style={{ fontSize:11, color:theme.muted, marginTop:2 }}>{fmtDate(h.at, lang)}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', borderTop:`1px solid ${theme.lineSoft}`, paddingTop:14 }}>
          <Btn size="sm" variant="danger" icon="trash" onClick={async ()=>{ const ok = await window.UI.confirm({ title:t('deleteReq'), message: lang==='ar'?'سيُحذف الطلب نهائيًا. متابعة؟':'Delete this application permanently?', confirmText:t('deleteReq'), icon:'trash' }); if(ok){ actions.deleteRequest(r.id); onClose(); } }}>{t('deleteReq')}</Btn>
        </div>
      </Modal>
    );
  }

  // عرض المرفقات لمسؤول القبول (صور مصغّرة / روابط تحميل)
  function Attachments({ atts, lang, t }) {
    const items = atts ? Object.keys(atts).map((k) => atts[k]).filter((a) => a && (a.dataUrl || a.name)) : [];
    if (items.length === 0) return (
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:theme.muted, padding:'12px 14px', borderRadius:12, background:theme.paperAlt, marginBottom:18 }}>
        <Icon name="info" size={15} color={theme.mutedSoft} />{t('noAttachments')}
      </div>
    );
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px,1fr))', gap:10, marginBottom:18 }}>
        {items.map((a, k) => (
          <div key={k} style={{ border:`1px solid ${theme.line}`, borderRadius:13, overflow:'hidden', background:theme.paper }}>
            {a.isImage && a.dataUrl
              ? <a href={a.dataUrl} target="_blank" rel="noreferrer"><img src={a.dataUrl} alt={a.label||a.name} style={{ width:'100%', height:96, objectFit:'cover', display:'block' }} /></a>
              : <div style={{ height:96, background:theme.creamDeep, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="fileText" size={30} color={theme.primary} /></div>}
            <div style={{ padding:'9px 11px' }}>
              <p style={{ fontSize:12, fontWeight:700, color:theme.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.label || a.name}</p>
              {a.name && a.label && <p style={{ fontSize:10.5, color:theme.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} dir="ltr">{a.name}</p>}
              {a.dataUrl && (
                <a href={a.dataUrl} download={a.name||'file'} style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:6, fontSize:11.5, fontWeight:700, color:theme.primary, textDecoration:'none' }}>
                  <Icon name="download" size={13} />{a.isImage?t('viewFile'):t('downloadFile')}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---- لوحات فرعية ----
  function MessageComposer({ lang, request, onSend, onCancel, defaultBody='', defaultSubject='' }) {
    const t = T(lang);
    const [channel, setChannel] = useState('email');
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    return (
      <Card pad={14} style={{ marginBottom:18, border:`1px solid ${theme.line}` }}>
        <div style={{ display:'grid', gap:12 }}>
          <Field label={t('channel')}>
            <Select value={channel} onChange={(e)=>setChannel(e.target.value)}>
              <option value="email">{t('emailCh')}</option>
              <option value="sms">{t('smsCh')}</option>
              <option value="whatsapp">{t('waCh')}</option>
            </Select>
          </Field>
          <Field label={t('subject')}><Input value={subject} onChange={(e)=>setSubject(e.target.value)} /></Field>
          <Field label={t('body')}><Textarea value={body} onChange={(e)=>setBody(e.target.value)} rows={4} /></Field>
          <div style={{ display:'flex', gap:10 }}>
            <Btn full variant="soft" onClick={onCancel}>{t('cancel')}</Btn>
            <Btn full variant="primary" icon="send" disabled={!body.trim()} onClick={()=>onSend({ channel, subject, body })}>{t('send')}</Btn>
          </div>
        </div>
      </Card>
    );
  }

  function ApptPicker({ lang, value, onSave, onCancel }) {
    const t = T(lang);
    const [v, setV] = useState(value || '');
    return (
      <Card pad={14} style={{ marginBottom:18, border:`1px solid ${theme.line}` }}>
        <Field label={t('setAppt')}>
          <input type="datetime-local" value={v} onChange={(e)=>setV(e.target.value)} style={{ ...window.UI.inputBase }} />
        </Field>
        <div style={{ display:'flex', gap:10, marginTop:12 }}>
          <Btn full variant="soft" onClick={onCancel}>{t('cancel')}</Btn>
          <Btn full variant="primary" icon="calendar" disabled={!v} onClick={()=>onSave(v)}>{t('save')}</Btn>
        </div>
      </Card>
    );
  }

  function ExamPicker({ lang, exams, onSend, onCancel }) {
    const t = T(lang);
    const pubExams = exams.filter((e)=>e.published);
    const [eid, setEid] = useState(pubExams[0] ? pubExams[0].id : '');
    const [copied, setCopied] = useState(false);
    const ex = pubExams.find((e)=>e.id===eid);
    const url = ex ? examUrl(ex.link) : '';
    const copy = () => { try { navigator.clipboard.writeText(url); } catch(_){} setCopied(true); setTimeout(()=>setCopied(false), 1600); };
    return (
      <Card pad={14} style={{ marginBottom:18, border:`1px solid ${theme.line}` }}>
        <Field label={t('chooseExam')}>
          <Select value={eid} onChange={(e)=>setEid(e.target.value)} placeholder={t('chooseExam')}>
            {pubExams.map((e)=><option key={e.id} value={e.id}>{e.title} · {e.durationMin}د</option>)}
          </Select>
        </Field>
        {pubExams.length===0 && <p style={{ fontSize:12.5, color:theme.bad, marginTop:8 }}>{lang==='ar'?'لا توجد اختبارات منشورة. انشر اختبارًا أولًا من قسم الاختبارات.':'No published exams. Publish one first.'}</p>}
        {ex && (
          <div style={{ marginTop:12 }}>
            <p style={{ fontSize:11.5, color:theme.muted, marginBottom:5 }}>{lang==='ar'?'رابط الاختبار (مع تسجيل الشاشة):':'Exam link (with screen recording):'}</p>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 11px', borderRadius:10, background:theme.paperAlt, border:`1px solid ${theme.line}` }}>
              <Icon name="link" size={14} color={theme.primary} />
              <span dir="ltr" style={{ flex:1, fontFamily:'monospace', fontSize:11.5, color:theme.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</span>
              <button type="button" onClick={copy} style={{ background:'none', border:'none', cursor:'pointer', color:copied?theme.ok:theme.primary, display:'flex', flexShrink:0 }}>{copied?<Icon name="check" size={15} />:<Icon name="clipboard" size={15} />}</button>
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:10, marginTop:12 }}>
          <Btn full variant="soft" onClick={onCancel}>{t('cancel')}</Btn>
          <Btn full variant="primary" icon="send" disabled={!eid} onClick={()=>onSend(eid)}>{t('send')}</Btn>
        </div>
      </Card>
    );
  }

  function ConvertPanel({ lang, request, onConvert, onDone, onCancel }) {
    const t = T(lang);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const go = async () => {
      setLoading(true); setErr('');
      try {
        const ok = await onConvert();
        setLoading(false);
        if (ok) { onDone && onDone(); }
        else setErr(lang==='ar'?'تعذّر إنشاء الحساب. حاول مجددًا.':'Could not create the account.');
      } catch (e) { setLoading(false); setErr((e && e.message) || String(e)); }
    };
    return (
      <Card pad={14} style={{ marginBottom:18, border:`1px solid ${theme.gold}`, background:theme.paperAlt }}>
        <p style={{ fontSize:13, color:theme.brown, lineHeight:1.7, marginBottom:12 }}>{t('convertHint')}</p>
        {err && <div style={{ fontSize:12.5, color:theme.bad, background:theme.badBg, padding:'8px 12px', borderRadius:9, marginBottom:12 }}>{err}</div>}
        <div style={{ display:'flex', gap:10 }}>
          <Btn full variant="soft" onClick={onCancel} disabled={loading}>{t('cancel')}</Btn>
          <Btn full variant="gold" icon="gradCap" disabled={loading} onClick={go}>{loading?t('converting'):t('toStudent')}</Btn>
        </div>
      </Card>
    );
  }

  window.RegCore = { STR, T, STATUS, statusLabel, programLabel, examUrl, SectionHead, StatCard, StatsTab, RequestList, RequestRow, RequestDetail, MessageComposer };
})();
