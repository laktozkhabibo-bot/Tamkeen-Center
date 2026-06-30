/* =========================================================================
   التسجيل والقبول — الاختبارات وبنك الأسئلة، النتائج، الرسائل، التقارير
   window.RegMore
   ========================================================================= */
(function () {
  const { theme, Icon, fmtDate } = window.TC;
  const { Btn, Badge, Card, EmptyState, Field, Input, Select, Textarea, Modal, Avatar } = window.UI;
  const { T, STATUS, statusLabel, programLabel, examUrl, SectionHead, StatCard } = window.RegCore;
  const { useState } = React;

  const ES = {
    examTitle:{ar:'عنوان الاختبار',en:'Exam title'},
    duration:{ar:'المدة (دقيقة)',en:'Duration (min)'},
    passMark:{ar:'درجة النجاح %',en:'Pass mark %'},
    questions:{ar:'الأسئلة',en:'Questions'},
    questionBank:{ar:'بنك الأسئلة',en:'Question bank'},
    newExam:{ar:'اختبار جديد',en:'New exam'},
    editExam:{ar:'تعديل الاختبار',en:'Edit exam'},
    addQuestion:{ar:'إضافة سؤال',en:'Add question'},
    editQuestion:{ar:'تعديل السؤال',en:'Edit question'},
    questionText:{ar:'نص السؤال',en:'Question'},
    qType:{ar:'النوع',en:'Type'},
    mcq:{ar:'اختيار من متعدد',en:'Multiple choice'},
    textq:{ar:'سؤال مقالي',en:'Open answer'},
    options:{ar:'الخيارات (الصحيح بالأعلى مؤشّر)',en:'Options'},
    correct:{ar:'الإجابة الصحيحة',en:'Correct answer'},
    points:{ar:'الدرجة',en:'Points'},
    publish:{ar:'نشر',en:'Publish'},
    unpublish:{ar:'إلغاء النشر',en:'Unpublish'},
    published:{ar:'منشور',en:'Published'},
    draft:{ar:'مسودة',en:'Draft'},
    link:{ar:'رابط الاختبار',en:'Exam link'},
    copyLink:{ar:'نسخ الرابط',en:'Copy link'},
    copied:{ar:'تم النسخ',en:'Copied'},
    pickQuestions:{ar:'اختر أسئلة الاختبار',en:'Select questions'},
    noExams:{ar:'لا توجد اختبارات بعد',en:'No exams yet'},
    noExamsB:{ar:'أنشئ اختبار قبول وأضف إليه أسئلة من البنك',en:'Create an exam and add questions'},
    save:{ar:'حفظ',en:'Save'},cancel:{ar:'إلغاء',en:'Cancel'},add:{ar:'إضافة',en:'Add'},
    recordResult:{ar:'تسجيل النتيجة',en:'Record result'},
    score:{ar:'الدرجة المحرزة',en:'Score'},
    outOf:{ar:'من',en:'out of'},
    approveResult:{ar:'اعتماد النتيجة',en:'Approve result'},
    approved:{ar:'معتمدة',en:'Approved'},
    toStudent:{ar:'تحويل إلى طالب',en:'To student'},
    noResults:{ar:'لا توجد اختبارات مُسندة',en:'No assigned exams'},
    noResultsB:{ar:'أرسل رابط اختبار لمتقدّم ليظهر هنا',en:'Send an exam link to an applicant'},
    resultFor:{ar:'نتائج المتقدّمين',en:'Applicant results'},
    pendingResult:{ar:'بانتظار النتيجة',en:'Pending result'},
    broadcast:{ar:'إرسال جماعي',en:'Broadcast'},
    recipient:{ar:'المستلم',en:'Recipient'},
    toGroup:{ar:'إلى فئة',en:'To a group'},
    channel:{ar:'القناة',en:'Channel'},
    subject:{ar:'العنوان',en:'Subject'},
    body:{ar:'نص الرسالة',en:'Message'},
    send:{ar:'إرسال',en:'Send'},
    sentLog:{ar:'سجل الرسائل المرسلة',en:'Sent messages'},
    noMsgs:{ar:'لا توجد رسائل مرسلة',en:'No messages sent'},
    noMsgsB:{ar:'ستظهر هنا كل الرسائل والإشعارات المرسلة للمتقدّمين',en:'Messages sent to applicants appear here'},
    msgSent:{ar:'تم إرسال الرسالة',en:'Message sent'},
    allAccepted:{ar:'كل المقبولين',en:'All accepted'},
    allNew:{ar:'كل الطلبات الجديدة',en:'All new applications'},
    allAwaiting:{ar:'بانتظار الاختبار',en:'Awaiting exam'},
    recipients:{ar:'مستلمون',en:'recipients'},
    byProgram:{ar:'حسب البرنامج',en:'By program'},
    byStatus:{ar:'حسب الحالة',en:'By status'},
    funnel:{ar:'مسار القبول',en:'Admission funnel'},
    recordingsTitle:{ar:'الفيديوهات المسجلة',en:'Recorded sessions'},
    noRecs:{ar:'لا توجد تسجيلات بعد',en:'No recordings yet'},
    noRecsB:{ar:'تظهر هنا تسجيلات شاشة الطلاب بعد دخولهم رابط الاختبار',en:'Student screen recordings appear here after they take an exam'},
    play:{ar:'تشغيل',en:'Play'},
    loadingVid:{ar:'جارٍ التحميل…',en:'Loading…'},
    duration:{ar:'المدة',en:'Duration'},
    answersLabel:{ar:'إجابات الطالب',en:'Student answers'},
    viewAnswers:{ar:'عرض الإجابات',en:'View answers'},
    conversionRate:{ar:'نسبة التحويل إلى طلاب',en:'Conversion to students'},
    passRate:{ar:'نسبة النجاح',en:'Pass rate'},
    summary:{ar:'ملخّص',en:'Summary'},
  };
  const E = (lang) => (k) => (ES[k] && ES[k][lang]) || (window.RegCore.STR[k] && window.RegCore.STR[k][lang]) || k;

  // ============ الاختبارات + بنك الأسئلة ============
  function ExamsTab({ db, lang, actions }) {
    const e = E(lang);
    const [examModal, setExamModal] = useState(null); // exam obj or 'new'
    const [qModal, setQModal] = useState(null); // question obj or 'new'
    const [copied, setCopied] = useState('');

    const copyLink = (link) => { try { navigator.clipboard.writeText(examUrl(link)); } catch(_){} setCopied(link); setTimeout(()=>setCopied(''), 1600); };

    return (
      <div>
        <SectionHead icon="fileText" title={e('exams')} count={db.exams.length}
          action={<Btn size="sm" variant="primary" icon="plus" onClick={()=>setExamModal('new')}>{e('newExam')}</Btn>} />

        {db.exams.length===0 ? <EmptyState icon="fileText" title={e('noExams')} body={e('noExamsB')} /> : (
          <div style={{ display:'grid', gap:12, marginBottom:30 }}>
            {db.exams.map((ex)=>(
              <Card key={ex.id} pad={16}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6, flexWrap:'wrap' }}>
                      <h3 style={{ fontSize:15.5, fontWeight:700, color:theme.ink }}>{ex.title}</h3>
                      <Badge tone={ex.published?'ok':'neutral'}>{ex.published?e('published'):e('draft')}</Badge>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', fontSize:12.5, color:theme.muted }}>
                      <span style={{ display:'flex', alignItems:'center', gap:5 }}><Icon name="clock" size={14} />{ex.durationMin} {lang==='ar'?'دقيقة':'min'}</span>
                      <span style={{ display:'flex', alignItems:'center', gap:5 }}><Icon name="award" size={14} />{e('passMark')}: {ex.passMark}%</span>
                      <span style={{ display:'flex', alignItems:'center', gap:5 }}><Icon name="fileText" size={14} />{(ex.questionIds||[]).length} {e('questions')}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:9, fontSize:12, color:theme.primary, background:theme.paperAlt, padding:'6px 10px', borderRadius:9, width:'fit-content', maxWidth:'100%' }}>
                      <Icon name="globe" size={13} /><span dir="ltr" style={{ fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>/{ex.link}</span>
                      <button onClick={()=>copyLink(ex.link)} style={{ background:'none', border:'none', cursor:'pointer', color:theme.primary, padding:0, display:'flex' }}>{copied===ex.link?<Icon name="check" size={13} color={theme.ok} />:<Icon name="clipboard" size={13} />}</button>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Btn size="sm" variant={ex.published?'soft':'gold'} onClick={()=>actions.updateExam(ex.id, { published: !ex.published })}>{ex.published?e('unpublish'):e('publish')}</Btn>
                    <button onClick={()=>setExamModal(ex)} title={e('editExam')} style={iconBtn(theme.primary)}><Icon name="edit" size={15} /></button>
                    <button onClick={async ()=>{ const ok=await window.UI.confirm({ title:e('editExam'), message:lang==='ar'?'حذف هذا الاختبار؟':'Delete this exam?', confirmText:lang==='ar'?'حذف':'Delete', icon:'trash' }); if(ok) actions.deleteExam(ex.id); }} style={iconBtn(theme.bad)}><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* بنك الأسئلة */}
        <SectionHead icon="book" title={e('questionBank')} count={db.questions.length}
          action={<Btn size="sm" variant="primary" icon="plus" onClick={()=>setQModal('new')}>{e('addQuestion')}</Btn>} />
        {db.questions.length===0 ? <EmptyState icon="book" title={e('questionBank')} body={lang==='ar'?'أضف أسئلة لاستخدامها في الاختبارات':'Add questions to use in exams'} /> : (
          <div style={{ display:'grid', gap:10 }}>
            {db.questions.map((q,i)=>(
              <Card key={q.id} pad={14}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:11 }}>
                  <span style={{ width:26, height:26, borderRadius:8, background:theme.creamDeep, color:theme.primaryDeep, fontWeight:800, fontSize:12.5, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'Cairo, sans-serif' }}>{i+1}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:600, color:theme.ink, lineHeight:1.6 }}>{q.text}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, flexWrap:'wrap' }}>
                      <Badge tone={q.type==='mcq'?'info':'gold'}>{q.type==='mcq'?e('mcq'):e('textq')}</Badge>
                      <Badge tone="neutral">{q.points} {lang==='ar'?'درجة':'pts'}</Badge>
                      {q.type==='mcq' && q.options && q.options[q.answer]!=null && <span style={{ fontSize:12, color:theme.ok, display:'flex', alignItems:'center', gap:4 }}><Icon name="check" size={13} />{q.options[q.answer]}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={()=>setQModal(q)} style={iconBtn(theme.primary)}><Icon name="edit" size={15} /></button>
                    <button onClick={async ()=>{ const ok=await window.UI.confirm({ title:e('editQuestion'), message:lang==='ar'?'حذف هذا السؤال؟':'Delete this question?', confirmText:lang==='ar'?'حذف':'Delete', icon:'trash' }); if(ok) actions.deleteQuestion(q.id); }} style={iconBtn(theme.bad)}><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {examModal && <ExamModal lang={lang} db={db} actions={actions} exam={examModal==='new'?null:examModal} onClose={()=>setExamModal(null)} />}
        {qModal && <QuestionModal lang={lang} actions={actions} q={qModal==='new'?null:qModal} onClose={()=>setQModal(null)} />}
      </div>
    );
  }

  const iconBtn = (color) => ({ width:32, height:32, borderRadius:9, background:'none', border:'none', cursor:'pointer', color, display:'flex', alignItems:'center', justifyContent:'center' });

  function ExamModal({ lang, db, actions, exam, onClose }) {
    const e = E(lang);
    const [title, setTitle] = useState(exam ? exam.title : '');
    const [duration, setDuration] = useState(exam ? exam.durationMin : 45);
    const [passMark, setPassMark] = useState(exam ? exam.passMark : 60);
    const [qids, setQids] = useState(exam ? [...(exam.questionIds||[])] : []);
    const toggle = (id) => setQids((p)=>p.includes(id)?p.filter((x)=>x!==id):[...p,id]);
    const save = () => {
      if (!title.trim()) return;
      const data = { title, durationMin: Number(duration)||45, passMark: Number(passMark)||60, questionIds: qids };
      if (exam) actions.updateExam(exam.id, data); else actions.addExam(data);
      onClose();
    };
    return (
      <Modal title={exam?e('editExam'):e('newExam')} onClose={onClose} width={520}>
        <div style={{ display:'grid', gap:14 }}>
          <Field label={e('examTitle')} required><Input value={title} onChange={(ev)=>setTitle(ev.target.value)} /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label={e('duration')}><Input type="number" value={duration} onChange={(ev)=>setDuration(ev.target.value)} dir="ltr" /></Field>
            <Field label={e('passMark')}><Input type="number" value={passMark} onChange={(ev)=>setPassMark(ev.target.value)} dir="ltr" /></Field>
          </div>
          <Field label={`${e('pickQuestions')} (${qids.length})`}>
            <div style={{ display:'grid', gap:7, maxHeight:260, overflowY:'auto', padding:4, border:`1px solid ${theme.line}`, borderRadius:12 }}>
              {db.questions.length===0 && <p style={{ fontSize:12.5, color:theme.muted, padding:'10px' }}>{lang==='ar'?'لا توجد أسئلة في البنك بعد':'No questions in the bank'}</p>}
              {db.questions.map((q)=>{
                const on = qids.includes(q.id);
                return (
                  <button key={q.id} type="button" onClick={()=>toggle(q.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:10, background:on?theme.goldSoft:theme.paperAlt, border:'none', cursor:'pointer', textAlign:'start', width:'100%' }}>
                    <span style={{ width:19, height:19, borderRadius:6, border:`1.5px solid ${on?theme.primary:theme.line}`, background:on?theme.primary:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{on && <Icon name="check" size={12} color="#fff" />}</span>
                    <span style={{ flex:1, fontSize:13, color:theme.ink, lineHeight:1.5 }}>{q.text}</span>
                    <Badge tone="neutral">{q.points}</Badge>
                  </button>
                );
              })}
            </div>
          </Field>
          <div style={{ display:'flex', gap:10 }}>
            <Btn full variant="soft" onClick={onClose}>{e('cancel')}</Btn>
            <Btn full variant="primary" icon="check" disabled={!title.trim()} onClick={save}>{e('save')}</Btn>
          </div>
        </div>
      </Modal>
    );
  }

  function QuestionModal({ lang, actions, q, onClose }) {
    const e = E(lang);
    const [text, setText] = useState(q ? q.text : '');
    const [type, setType] = useState(q ? q.type : 'mcq');
    const [points, setPoints] = useState(q ? q.points : 5);
    const [options, setOptions] = useState(q && q.options && q.options.length ? [...q.options] : ['', '', '', '']);
    const [answer, setAnswer] = useState(q ? (q.answer != null ? q.answer : 0) : 0);
    const setOpt = (i, v) => setOptions((p)=>p.map((o,k)=>k===i?v:o));
    const save = () => {
      if (!text.trim()) return;
      const data = { text, type, points: Number(points)||5 };
      if (type==='mcq') { data.options = options.map((o)=>o.trim()).filter(Boolean); data.answer = Math.min(answer, data.options.length-1); }
      else { data.options = []; data.answer = null; }
      if (q) actions.updateQuestion(q.id, data); else actions.addQuestion(data);
      onClose();
    };
    return (
      <Modal title={q?e('editQuestion'):e('addQuestion')} onClose={onClose} width={500}>
        <div style={{ display:'grid', gap:14 }}>
          <Field label={e('questionText')} required><Textarea value={text} onChange={(ev)=>setText(ev.target.value)} rows={2} /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
            <Field label={e('qType')}>
              <Select value={type} onChange={(ev)=>setType(ev.target.value)}>
                <option value="mcq">{e('mcq')}</option>
                <option value="text">{e('textq')}</option>
              </Select>
            </Field>
            <Field label={e('points')}><Input type="number" value={points} onChange={(ev)=>setPoints(ev.target.value)} dir="ltr" /></Field>
          </div>
          {type==='mcq' && (
            <Field label={e('options')}>
              <div style={{ display:'grid', gap:8 }}>
                {options.map((o,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <button type="button" onClick={()=>setAnswer(i)} title={e('correct')} style={{ width:24, height:24, borderRadius:'50%', border:`2px solid ${answer===i?theme.ok:theme.line}`, background:answer===i?theme.ok:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{answer===i && <Icon name="check" size={13} color="#fff" />}</button>
                    <Input value={o} onChange={(ev)=>setOpt(i,ev.target.value)} placeholder={(lang==='ar'?'الخيار ':'Option ')+(i+1)} />
                  </div>
                ))}
              </div>
            </Field>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <Btn full variant="soft" onClick={onClose}>{e('cancel')}</Btn>
            <Btn full variant="primary" icon="check" disabled={!text.trim()} onClick={save}>{e('save')}</Btn>
          </div>
        </div>
      </Modal>
    );
  }

  // ============ النتائج ============
  function ResultsTab({ db, lang, actions, onOpen }) {
    const e = E(lang);
    const list = db.requests.filter((r)=>r.examId || ['awaiting_exam','passed','failed'].includes(r.status));
    const sorted = [...list].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const [resultFor, setResultFor] = useState(null);
    return (
      <div>
        <SectionHead icon="award" title={e('resultFor')} count={sorted.length} />
        {sorted.length===0 ? <EmptyState icon="award" title={e('noResults')} body={e('noResultsB')} /> : (
          <div style={{ display:'grid', gap:11 }}>
            {sorted.map((r)=>{
              const exam = db.exams.find((x)=>x.id===r.examId);
              const st = STATUS[r.status] || STATUS.new;
              const hasScore = r.examScore != null;
              return (
                <Card key={r.id} pad={15}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <Avatar name={r.full_name} size={40} accent={r.gender==='female'?theme.gold:theme.primary} />
                    <div style={{ flex:1, minWidth:140 }}>
                      <p style={{ fontSize:14.5, fontWeight:700, color:theme.ink }}>{r.full_name}</p>
                      <p style={{ fontSize:12, color:theme.muted, marginTop:2 }}>{exam ? exam.title : programLabel(r.program, lang)}</p>
                    </div>
                    {hasScore ? (
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, color:r.status==='passed'?theme.ok:theme.bad, fontFamily:'Cairo, sans-serif', lineHeight:1 }}>{r.examScore}<span style={{ fontSize:13, color:theme.muted, fontWeight:600 }}>/{r.examMax}</span></div>
                        <Badge tone={st.tone} style={{ marginTop:5 }}>{statusLabel(r.status, lang)}</Badge>
                      </div>
                    ) : <Badge tone="neutral">{e('pendingResult')}</Badge>}
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <Btn size="sm" variant="ghost" icon="edit" onClick={()=>setResultFor(r)}>{e('recordResult')}</Btn>
                      {r.status==='passed' && !r.resultApproved && <Btn size="sm" variant="primary" icon="checkCircle" onClick={()=>actions.approveResult(r.id)}>{e('approveResult')}</Btn>}
                      {r.resultApproved && <Badge tone="ok"><Icon name="checkCircle" size={12} />{e('approved')}</Badge>}
                      {(r.status==='passed') && !r.account && <Btn size="sm" variant="gold" icon="gradCap" onClick={()=>actions.convertToStudent(r.id)}>{e('toStudent')}</Btn>}
                      {r.account && <Badge tone="ok" style={{ fontFamily:'monospace' }} >{r.account.accessKey}</Badge>}
                      <button onClick={()=>onOpen(r.id)} style={iconBtn(theme.muted)}><Icon name={lang==='ar'?'chevronLeft':'chevronRight'} size={17} /></button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {resultFor && <ResultModal lang={lang} request={resultFor} exam={db.exams.find((x)=>x.id===resultFor.examId)} actions={actions} onClose={()=>setResultFor(null)} />}
      </div>
    );
  }

  function ResultModal({ lang, request, exam, actions, onClose }) {
    const e = E(lang);
    const totalPoints = exam ? (exam.questionIds||[]).reduce((s,qid)=>{ return s; }, 0) : 0;
    const [max, setMax] = useState(request.examMax || 100);
    const [score, setScore] = useState(request.examScore != null ? request.examScore : '');
    const save = () => {
      const sc = Number(score); const mx = Number(max)||100;
      if (isNaN(sc)) return;
      actions.recordResult(request.id, { score: sc, max: mx, examId: request.examId });
      onClose();
    };
    return (
      <Modal title={`${e('recordResult')} — ${request.full_name}`} onClose={onClose} width={400}>
        <div style={{ display:'grid', gap:14 }}>
          {exam && <p style={{ fontSize:13, color:theme.muted }}>{exam.title} · {e('passMark')}: {exam.passMark}%</p>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label={e('score')}><Input type="number" value={score} onChange={(ev)=>setScore(ev.target.value)} dir="ltr" /></Field>
            <Field label={e('outOf')}><Input type="number" value={max} onChange={(ev)=>setMax(ev.target.value)} dir="ltr" /></Field>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Btn full variant="soft" onClick={onClose}>{e('cancel')}</Btn>
            <Btn full variant="primary" icon="check" onClick={save}>{e('save')}</Btn>
          </div>
        </div>
      </Modal>
    );
  }

  // ============ الرسائل والإشعارات ============
  function MessagesTab({ db, lang, actions }) {
    const e = E(lang);
    const [target, setTarget] = useState('group:accepted');
    const [channel, setChannel] = useState('email');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [toast, setToast] = useState('');

    const groups = [
      { id:'group:accepted', label:e('allAccepted'), match:(r)=>['accepted','enrolled'].includes(r.status) },
      { id:'group:new', label:e('allNew'), match:(r)=>r.status==='new' },
      { id:'group:awaiting_exam', label:e('allAwaiting'), match:(r)=>r.status==='awaiting_exam' },
    ];
    const individuals = db.requests.map((r)=>({ id:'req:'+r.id, label:r.full_name }));

    const recipientCount = () => {
      if (target.startsWith('group:')) { const g = groups.find((x)=>x.id===target); return db.requests.filter(g.match).length; }
      return 1;
    };
    const send = () => {
      if (!body.trim()) return;
      if (target.startsWith('group:')) {
        const g = groups.find((x)=>x.id===target);
        db.requests.filter(g.match).forEach((r)=>actions.sendMessage(r.id, { channel, subject, body }));
      } else {
        const rid = target.slice(4);
        actions.sendMessage(rid, { channel, subject, body });
      }
      setSubject(''); setBody('');
      setToast(e('msgSent')); setTimeout(()=>setToast(''), 2200);
    };

    return (
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <SectionHead icon="megaphone" title={e('messages')} />
        {toast && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:12, background:theme.okBg, color:theme.ok, fontWeight:700, fontSize:14, marginBottom:14 }}><Icon name="checkCircle" size={18} />{toast}</div>}
        <Card pad={18} style={{ marginBottom:24 }}>
          <div style={{ display:'grid', gap:14 }}>
            <Field label={e('recipient')}>
              <Select value={target} onChange={(ev)=>setTarget(ev.target.value)}>
                <optgroup label={e('toGroup')}>
                  {groups.map((g)=><option key={g.id} value={g.id}>{g.label}</option>)}
                </optgroup>
                <optgroup label={lang==='ar'?'متقدّم محدد':'Specific applicant'}>
                  {individuals.map((i)=><option key={i.id} value={i.id}>{i.label}</option>)}
                </optgroup>
              </Select>
            </Field>
            <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:theme.muted }}>
              <Icon name="users" size={14} color={theme.primary} />{recipientCount()} {e('recipients')}
            </div>
            <Field label={e('channel')}>
              <Select value={channel} onChange={(ev)=>setChannel(ev.target.value)}>
                <option value="email">{window.RegCore.STR.emailCh[lang]}</option>
                <option value="sms">{window.RegCore.STR.smsCh[lang]}</option>
                <option value="whatsapp">{window.RegCore.STR.waCh[lang]}</option>
              </Select>
            </Field>
            <Field label={e('subject')}><Input value={subject} onChange={(ev)=>setSubject(ev.target.value)} /></Field>
            <Field label={e('body')}><Textarea value={body} onChange={(ev)=>setBody(ev.target.value)} rows={4} /></Field>
            <Btn variant="primary" icon="send" disabled={!body.trim()} onClick={send}>{e('send')}</Btn>
          </div>
        </Card>

        <SectionHead icon="inbox" title={e('sentLog')} count={db.messages.length} />
        {db.messages.length===0 ? <EmptyState icon="megaphone" title={e('noMsgs')} body={e('noMsgsB')} /> : (
          <div style={{ display:'grid', gap:10 }}>
            {db.messages.slice(0,40).map((m)=>{
              const req = db.requests.find((r)=>r.id===m.requestId);
              const chIcon = m.channel==='sms'?'phone':m.channel==='whatsapp'?'phone':'mail';
              return (
                <Card key={m.id} pad={14}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:11 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:theme.creamDeep, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name={chIcon} size={17} color={theme.primary} /></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                        {m.subject && <span style={{ fontSize:13.5, fontWeight:700, color:theme.ink }}>{m.subject}</span>}
                        <Badge tone="neutral">{m.channel==='sms'?window.RegCore.STR.smsCh[lang]:m.channel==='whatsapp'?window.RegCore.STR.waCh[lang]:window.RegCore.STR.emailCh[lang]}</Badge>
                      </div>
                      <p style={{ fontSize:13, color:theme.brown, lineHeight:1.6 }}>{m.body}</p>
                      <p style={{ fontSize:11, color:theme.muted, marginTop:5 }}>{req?req.full_name+' · ':''}{fmtDate(m.at, lang)}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============ التقارير ============
  function Bar({ label, value, total, color }) {
    const pct = total ? Math.round((value/total)*100) : 0;
    return (
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5 }}>
          <span style={{ color:theme.brown, fontWeight:600 }}>{label}</span>
          <span style={{ color:theme.muted }}>{value} · {pct}%</span>
        </div>
        <div style={{ height:9, borderRadius:999, background:theme.creamDeep, overflow:'hidden' }}>
          <div style={{ width:pct+'%', height:'100%', background:color||theme.primary, borderRadius:999, transition:'width .5s ease' }} />
        </div>
      </div>
    );
  }

  function ReportsTab({ db, lang }) {
    const e = E(lang);
    const reqs = db.requests;
    const total = reqs.length;
    const count = (s)=>reqs.filter((r)=>r.status===s).length;
    const enrolled = count('enrolled');
    const passed = count('passed');
    const failed = count('failed');
    const examined = passed + failed;
    const accepted = count('accepted') + enrolled;

    const byProgram = {};
    reqs.forEach((r)=>{ byProgram[r.program] = (byProgram[r.program]||0)+1; });
    const statusOrder = ['new','review','accepted','suspended','rejected','awaiting_exam','passed','failed','enrolled'];

    return (
      <div>
        <SectionHead icon="grid" title={e('reports')} />
        <div className="tc-reg-stats" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:26 }}>
          <StatCard icon="inbox" label={window.RegCore.STR.total[lang]} value={total} tone="info" />
          <StatCard icon="checkCircle" label={window.RegCore.STR.accepted[lang]} value={accepted} tone="ok" />
          <StatCard icon="award" label={e('passRate')} value={examined?Math.round((passed/examined)*100)+'%':'—'} tone="gold" />
          <StatCard icon="gradCap" label={e('conversionRate')} value={total?Math.round((enrolled/total)*100)+'%':'—'} tone="ok" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="tc-form-grid">
          <Card pad={18}>
            <h3 style={{ fontSize:15, fontWeight:700, color:theme.ink, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}><Icon name="scroll" size={17} color={theme.primary} />{e('byProgram')}</h3>
            {Object.keys(byProgram).length===0 ? <p style={{ fontSize:13, color:theme.muted }}>—</p> : Object.entries(byProgram).map(([pid,n],i)=>(
              <Bar key={pid} label={programLabel(pid, lang)} value={n} total={total} color={[theme.primary, theme.gold, theme.tan, theme.primaryDeep][i%4]} />
            ))}
          </Card>
          <Card pad={18}>
            <h3 style={{ fontSize:15, fontWeight:700, color:theme.ink, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}><Icon name="layers" size={17} color={theme.primary} />{e('byStatus')}</h3>
            {statusOrder.filter((s)=>count(s)>0).map((s)=>{
              const meta = STATUS[s];
              const toneColor = { ok:theme.ok, warn:theme.warn, bad:theme.bad, info:theme.info, gold:theme.gold, neutral:theme.tan }[meta.tone] || theme.primary;
              return <Bar key={s} label={statusLabel(s, lang)} value={count(s)} total={total} color={toneColor} />;
            })}
          </Card>
        </div>
      </div>
    );
  }

  // ============ الفيديوهات المسجلة ============
  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function RecordingsTab({ db, lang, actions }) {
    const e = E(lang);
    const recs = db.recordings || [];
    const [playing, setPlaying] = useState(null); // { url, rec }
    const [loadingId, setLoadingId] = useState('');
    const [answersFor, setAnswersFor] = useState(null);

    const openVideo = async (rec) => {
      setLoadingId(rec.id);
      try {
        const url = await actions.recordingUrl(rec.storagePath);
        if (url) setPlaying({ url, rec }); else alert(lang==='ar'?'تعذّر جلب الفيديو':'Could not load video');
      } catch (er) { alert((er && er.message) || String(er)); }
      setLoadingId('');
    };

    return (
      <div>
        <SectionHead icon="video" title={e('recordingsTitle')} count={recs.length} />
        {recs.length===0 ? <EmptyState icon="video" title={e('noRecs')} body={e('noRecsB')} /> : (
          <div style={{ display:'grid', gap:11 }}>
            {recs.map((r)=>(
              <Card key={r.id} pad={15}>
                <div style={{ display:'flex', alignItems:'center', gap:13, flexWrap:'wrap' }}>
                  <div style={{ width:46, height:46, borderRadius:12, background:theme.creamDeep, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
                    <Icon name="video" size={22} color={theme.primary} />
                  </div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <p style={{ fontSize:15, fontWeight:700, color:theme.ink }}>{r.studentName || (lang==='ar'?'بدون اسم':'Unknown')}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', fontSize:12, color:theme.muted, marginTop:3 }}>
                      <span>{r.examTitle || '—'}</span>
                      <span style={{ color:theme.line }}>•</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}><Icon name="clock" size={12} />{fmtDur(r.durationSec)}</span>
                      <span style={{ color:theme.line }}>•</span>
                      <span>{fmtDate(r.at, lang)}</span>
                      {r.phone && <><span style={{ color:theme.line }}>•</span><span dir="ltr">{r.phone}</span></>}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    {r.answers && r.answers.length>0 && <Btn size="sm" variant="ghost" icon="fileText" onClick={()=>setAnswersFor(r)}>{e('viewAnswers')}</Btn>}
                    <Btn size="sm" variant="primary" icon="play" disabled={loadingId===r.id || !r.storagePath} onClick={()=>openVideo(r)}>{loadingId===r.id?e('loadingVid'):e('play')}</Btn>
                    <button onClick={async ()=>{ const ok=await window.UI.confirm({ title:e('recordingsTitle'), message:lang==='ar'?'حذف هذا التسجيل نهائيًا؟':'Delete this recording?', confirmText:lang==='ar'?'حذف':'Delete', icon:'trash' }); if(ok) actions.deleteRecording(r.id, r.storagePath); }} style={iconBtn(theme.bad)}><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {playing && (
          <Modal title={playing.rec.studentName + ' — ' + (playing.rec.examTitle||'')} onClose={()=>setPlaying(null)} width={760}>
            <video src={playing.url} controls autoPlay style={{ width:'100%', borderRadius:12, background:'#000', maxHeight:'62vh' }} />
            <p style={{ fontSize:12, color:theme.muted, marginTop:10 }}>{e('duration')}: {fmtDur(playing.rec.durationSec)} · {fmtDate(playing.rec.at, lang)}</p>
          </Modal>
        )}
        {answersFor && (
          <Modal title={e('answersLabel') + ' — ' + answersFor.studentName} onClose={()=>setAnswersFor(null)} width={620}>
            <div style={{ display:'grid', gap:16 }}>
              {answersFor.answers.map((a,i)=>(
                <div key={i} style={{ padding:'18px 20px', borderRadius:14, background:theme.paperAlt, border:`1px solid ${theme.lineSoft}` }}>
                  <p style={{ fontSize:14.5, fontWeight:700, color:theme.ink, marginBottom:12, lineHeight:1.95, whiteSpace:'pre-wrap' }}>{i+1}. {a.text}</p>
                  <p style={{ fontSize:15, color:a.answer?theme.brown:theme.muted, lineHeight:2.15, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{a.answer || (lang==='ar'?'— بدون إجابة':'— no answer')}</p>
                </div>
              ))}
            </div>
          </Modal>
        )}
      </div>
    );
  }

  window.RegMore = { ExamsTab, ResultsTab, MessagesTab, ReportsTab, RecordingsTab };
})();
