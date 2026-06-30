/* =========================================================================
   صفحة اختبار القبول مع تسجيل الشاشة — مركز تمكين
   التدفّق:  تعريف وإدخال البيانات → طلب إذن تسجيل الشاشة (إلزامي) →
            غرفة انتظار 3 دقائق → الاختبار (مؤقّت) → رفع الفيديو → شكرًا.
   لا يبدأ الاختبار أبدًا قبل منح إذن التسجيل وبدئه فعليًا.
   ========================================================================= */
(function () {
  const { useState, useRef, useEffect, useCallback } = React;
  const sb = window.tamkeenSupabase;

  // ---- لوحة الألوان (مطابقة لهوية المركز) ----
  const C = {
    cream:'#F4EEE1', paper:'#FFFFFF', paperAlt:'#FBF7EE', line:'#E5DAC4', lineSoft:'#EFE7D6',
    ink:'#2E2718', brown:'#5C4F38', muted:'#8A7B5E',
    primary:'#785A2E', primaryDeep:'#5E4622', gold:'#C99A3F', goldSoft:'#F3E7CC',
    ok:'#1F8A5B', okBg:'#E8F5EE', bad:'#B4452F', badBg:'#FBEAE6', info:'#2A6FDB', infoBg:'#E9F0FB',
  };
  const f = "'Cairo', sans-serif";

  // ---- أيقونات SVG بسيطة ----
  const Ico = ({ d, size=20, color='currentColor', fill, sw=1.8, children, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill||'none'} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {children || <path d={d} />}
    </svg>
  );
  const IconMonitor = (p)=>(<Ico {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></Ico>);
  const IconShield = (p)=>(<Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></Ico>);
  const IconClock = (p)=>(<Ico {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Ico>);
  const IconAward = (p)=>(<Ico {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></Ico>);
  const IconCheck = (p)=>(<Ico {...p}><path d="M20 6 9 17l-5-5"/></Ico>);
  const IconCheckCircle = (p)=>(<Ico {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></Ico>);
  const IconAlert = (p)=>(<Ico {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4"/><path d="M12 17h.01"/></Ico>);
  const IconFile = (p)=>(<Ico {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></Ico>);
  const IconUser = (p)=>(<Ico {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>);

  // ---- لبنات واجهة ----
  const Logo = ({ size=46 }) => (
    <div style={{ display:'flex', alignItems:'center', gap:11 }}>
      <div style={{ width:size, height:size, borderRadius:14, background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(94,70,34,.25)' }}>
        <span style={{ fontFamily:"'Amiri', serif", fontWeight:700, fontSize:size*0.5, color:'#fff' }}>ت</span>
      </div>
      <div>
        <div style={{ fontFamily:"'Amiri', serif", fontWeight:700, fontSize:18, color:C.ink, lineHeight:1.1 }}>مركز تمكين</div>
        <div style={{ fontSize:11, color:C.muted }}>اختبارات القبول</div>
      </div>
    </div>
  );
  const Card = ({ children, style, pad=26 }) => (
    <div style={{ background:C.paper, border:`1px solid ${C.line}`, borderRadius:20, padding:pad, boxShadow:'0 10px 40px -24px rgba(70,52,24,.4)', ...style }}>{children}</div>
  );
  const Btn = ({ children, onClick, disabled, variant='primary', full, type='button', style }) => {
    const base = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:9, padding:'13px 24px', borderRadius:13, border:'none', cursor:disabled?'not-allowed':'pointer', fontFamily:f, fontWeight:700, fontSize:15, opacity:disabled?0.55:1, width:full?'100%':'auto', transition:'transform .1s' };
    const vs = {
      primary:{ background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, color:'#fff' },
      gold:{ background:C.gold, color:'#3a2c10' },
      soft:{ background:C.paperAlt, color:C.brown, border:`1px solid ${C.line}` },
      danger:{ background:C.bad, color:'#fff' },
    };
    return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...vs[variant], ...style }}>{children}</button>;
  };
  const Page = ({ children, max=640 }) => (
    <div style={{ minHeight:'100vh', padding:'28px 18px 60px' }}>
      <div style={{ maxWidth:max, margin:'0 auto' }}>
        <div style={{ marginBottom:24 }}><Logo /></div>
        {children}
      </div>
    </div>
  );

  const fmtTime = (s) => { s=Math.max(0,Math.round(s)); const m=Math.floor(s/60); return m+':'+String(s%60).padStart(2,'0'); };
  const qs = new URLSearchParams(window.location.search);
  const LINK = qs.get('e') || qs.get('exam') || '';

  // معلومات الاختبار (سطر مميّز)
  function InfoRow({ icon, label, value }) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 15px', borderRadius:13, background:C.paperAlt, border:`1px solid ${C.lineSoft}` }}>
        <div style={{ width:38, height:38, borderRadius:10, background:C.goldSoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
        <div>
          <div style={{ fontSize:12, color:C.muted }}>{label}</div>
          <div style={{ fontSize:15.5, fontWeight:700, color:C.ink }}>{value}</div>
        </div>
      </div>
    );
  }

  function ExamApp() {
    const [state, setState] = useState('loading'); // loading|notfound|intro|requesting|denied|waiting|exam|uploading|done|error
    const [exam, setExam] = useState(null);
    const [err, setErr] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [nid, setNid] = useState('');
    const [ans, setAns] = useState({});
    const [waitLeft, setWaitLeft] = useState(180);
    const [examLeft, setExamLeft] = useState(0);
    const [uploadMsg, setUploadMsg] = useState('');
    const [recWarn, setRecWarn] = useState('');

    const recRef = useRef(null);       // MediaRecorder
    const streamRef = useRef(null);    // MediaStream (الشاشة + صوت النظام)
    const micRef = useRef(null);       // ميكروفون
    const audioCtxRef = useRef(null);  // مازج الصوت
    const chunksRef = useRef([]);
    const startedAtRef = useRef(0);
    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    // ---- تحميل الاختبار من قاعدة البيانات (دالة آمنة، بدون كشف الإجابات) ----
    useEffect(() => {
      (async () => {
        if (!LINK) { setState('notfound'); return; }
        if (!sb) { setErr('تعذّر الاتصال بقاعدة البيانات.'); setState('error'); return; }
        try {
          const { data, error } = await sb.rpc('get_admission_exam', { p_link: LINK });
          if (error) { setErr(error.message); setState('error'); return; }
          if (!data) { setState('notfound'); return; }
          setExam(data);
          setExamLeft((data.durationMin || 45) * 60);
          setState('intro');
        } catch (e) { setErr((e && e.message) || String(e)); setState('error'); }
      })();
    }, []);

    const stopTracks = () => {
      try { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); } catch (_) {}
      try { if (micRef.current) micRef.current.getTracks().forEach((t) => t.stop()); } catch (_) {}
      try { if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close(); } catch (_) {}
    };

    // ---- إنهاء الجلسة: إيقاف التسجيل + رفع الفيديو + حفظ السجل ----
    const finishing = useRef(false);
    const finish = useCallback(async () => {
      if (finishing.current) return; finishing.current = true;
      setState('uploading'); setUploadMsg('جارٍ إيقاف التسجيل وحفظ الفيديو…');
      const blob = await new Promise((resolve) => {
        const mr = recRef.current;
        if (!mr || mr.state === 'inactive') { resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type:'video/webm' }) : null); return; }
        mr.onstop = () => resolve(new Blob(chunksRef.current, { type:'video/webm' }));
        try { mr.stop(); } catch (_) { resolve(null); }
      });
      stopTracks();
      const duration = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
      const answers = (exam.questions || []).map((q) => ({ id:q.id, text:q.text, type:q.type, answer: ans[q.id] || '' }));
      let storagePath = null;
      let uploadError = null;
      // 1) رفع الفيديو (مسار بأحرف لاتينية فقط — التخزين لا يقبل العربية في اسم الملف)
      if (blob && blob.size > 0) {
        setUploadMsg('جارٍ رفع الفيديو…');
        const linkSafe = (LINK || 'exam').replace(/[^A-Za-z0-9_-]+/g, '_');
        const rand = Math.random().toString(36).slice(2, 8);
        storagePath = `${linkSafe}/${Date.now()}-${rand}.webm`;
        try {
          const up = await sb.storage.from('exam-recordings').upload(storagePath, blob, { contentType: 'video/webm', upsert: false });
          if (up.error) { uploadError = up.error; storagePath = null; }
        } catch (e) { uploadError = e; storagePath = null; }
      }
      // 2) حفظ المحاولة (الاسم + الإجابات + الفيديو إن نجح) — تظهر دائمًا لمسؤول القبول
      try {
        const ins = await sb.rpc('submit_admission_recording', {
          p_exam_id: exam.id, p_exam_title: exam.title, p_student_name: name, p_phone: phone,
          p_national_id: nid, p_storage_path: storagePath, p_duration_sec: duration, p_answers: answers,
        });
        if (ins.error) throw ins.error;
        setUploadMsg(uploadError ? ('تم حفظ إجاباتك، لكن تعذّر رفع الفيديو: ' + ((uploadError && uploadError.message) || String(uploadError))) : '');
        setState('done');
      } catch (e) {
        setUploadMsg('تم إنهاء الاختبار، لكن تعذّر حفظ البيانات: ' + ((e && e.message) || String(e)));
        setState('done');
      }
    }, [exam, ans, name, phone, nid]);

    // ---- بدء تسجيل الشاشة (إلزامي قبل أي شيء) ----
    const beginRecording = async () => {
      setErr('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setErr('متصفحك لا يدعم تسجيل الشاشة. استخدم متصفح كمبيوتر حديث (Chrome / Edge / Firefox) على جهاز حاسوب.');
        setState('denied'); return;
      }
      setState('requesting');
      let dStream;
      try {
        // طلب الشاشة كاملة + صوت النظام، بأعلى دقّة ومعدّل إطارات جيّد
        dStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 15, max: 30 }, displaySurface: 'monitor' },
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } catch (e) {
        setErr('لم تُمنح صلاحية تسجيل الشاشة. لا يمكن بدء الاختبار قبل السماح بالتسجيل.');
        setState('denied'); return;
      }
      const vtrack = dStream.getVideoTracks()[0];
      // التأكّد أنه شارك «الشاشة بأكملها» وليس نافذة أو تبويبًا
      const surface = (vtrack.getSettings && vtrack.getSettings().displaySurface) || '';
      if (surface && surface !== 'monitor') {
        dStream.getTracks().forEach((t) => t.stop());
        setErr('يجب اختيار «الشاشة بأكملها» (Entire screen) — وليس نافذة أو تبويبًا واحدًا. أعد المحاولة واختر الشاشة كاملة.');
        setState('denied'); return;
      }
      // الميكروفون (لتسجيل صوت الطالب) — أفضل جهد، لا يوقف الاختبار إن رُفض
      let micStream = null;
      try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { micStream = null; }
      micRef.current = micStream;
      // دمج صوت النظام + الميكروفون في مسار صوتي واحد
      let finalStream;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ac = new AC();
        const dest = ac.createMediaStreamDestination();
        let anyAudio = false;
        if (dStream.getAudioTracks().length) { ac.createMediaStreamSource(new MediaStream(dStream.getAudioTracks())).connect(dest); anyAudio = true; }
        if (micStream && micStream.getAudioTracks().length) { ac.createMediaStreamSource(micStream).connect(dest); anyAudio = true; }
        audioCtxRef.current = ac;
        finalStream = new MediaStream([vtrack, ...(anyAudio ? dest.stream.getAudioTracks() : [])]);
      } catch (e) {
        finalStream = new MediaStream([vtrack, ...dStream.getAudioTracks(), ...(micStream ? micStream.getAudioTracks() : [])]);
      }
      streamRef.current = dStream;
      chunksRef.current = [];
      let mr;
      const tryMime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm'];
      const mime = tryMime.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
      // جودة عالية: ~8 ميغابت/ث للفيديو + صوت 128 كيلوبت/ث (VP9 يضغط الشاشة الثابتة تلقائيًا)
      const recOpts = mime ? { mimeType: mime, videoBitsPerSecond: 8000000, audioBitsPerSecond: 128000 } : { videoBitsPerSecond: 8000000 };
      try { mr = new MediaRecorder(finalStream, recOpts); }
      catch (e) { setErr('تعذّر بدء التسجيل: ' + ((e && e.message) || e)); stopTracks(); setState('denied'); return; }
      mr.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
      mr.start(2000); // جمع البيانات على دفعات
      recRef.current = mr;
      startedAtRef.current = Date.now();
      // إن أوقف الطالب المشاركة → إنهاء الجلسة تلقائيًا
      if (vtrack) vtrack.addEventListener('ended', () => {
        if (['waiting','exam'].includes(stateRef.current)) { setRecWarn('توقّفت مشاركة الشاشة — تم إنهاء الجلسة.'); finish(); }
      });
      setWaitLeft(180);
      setState('waiting');
    };

    // ---- مؤقّت غرفة الانتظار ----
    useEffect(() => {
      if (state !== 'waiting') return;
      if (waitLeft <= 0) { setState('exam'); return; }
      const id = setTimeout(() => setWaitLeft((w) => w - 1), 1000);
      return () => clearTimeout(id);
    }, [state, waitLeft]);

    // ---- مؤقّت الاختبار ----
    useEffect(() => {
      if (state !== 'exam') return;
      if (examLeft <= 0) { finish(); return; }
      const id = setTimeout(() => setExamLeft((s) => s - 1), 1000);
      return () => clearTimeout(id);
    }, [state, examLeft]);

    // ---- تحذير عند محاولة الإغلاق أثناء الاختبار ----
    useEffect(() => {
      const h = (e) => { if (['waiting','exam','requesting'].includes(stateRef.current)) { e.preventDefault(); e.returnValue = ''; } };
      window.addEventListener('beforeunload', h);
      return () => window.removeEventListener('beforeunload', h);
    }, []);

    // ============ الشاشات ============
    if (state === 'loading') return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div className="ex-spin" /></div>
    );

    if (state === 'notfound') return (
      <Page><Card style={{ textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:C.badBg, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}><IconAlert size={34} color={C.bad} /></div>
        <h2 style={{ fontFamily:"'Amiri', serif", fontSize:24, color:C.ink, marginBottom:10 }}>رابط غير صالح</h2>
        <p style={{ color:C.brown, fontSize:15, lineHeight:1.8 }}>هذا الاختبار غير موجود أو لم يُنشَر بعد. تأكّد من الرابط الذي وصلك من إدارة القبول.</p>
      </Card></Page>
    );

    if (state === 'error') return (
      <Page><Card style={{ textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:C.badBg, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}><IconAlert size={34} color={C.bad} /></div>
        <h2 style={{ fontFamily:"'Amiri', serif", fontSize:24, color:C.ink, marginBottom:10 }}>حدث خطأ</h2>
        <p style={{ color:C.brown, fontSize:14, lineHeight:1.8, direction:'ltr' }}>{err}</p>
      </Card></Page>
    );

    if (state === 'intro' || state === 'requesting') {
      const ready = name.trim() && nid.trim();
      return (
        <Page>
          <div className="ex-fade">
            <Card style={{ marginBottom:18 }}>
              <h1 style={{ fontFamily:"'Amiri', serif", fontWeight:700, fontSize:27, color:C.ink, marginBottom:6 }}>{exam.title}</h1>
              <p style={{ color:C.muted, fontSize:14, marginBottom:20 }}>اقرأ التعليمات بعناية قبل البدء.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:6 }}>
                <InfoRow icon={<IconClock size={19} color={C.primaryDeep} />} label="مدة الاختبار" value={(exam.durationMin||45) + ' دقيقة'} />
                <InfoRow icon={<IconAward size={19} color={C.primaryDeep} />} label="درجة النجاح" value={(exam.passMark||60) + '%'} />
                <InfoRow icon={<IconFile size={19} color={C.primaryDeep} />} label="عدد الأسئلة" value={(exam.questions||[]).length} />
                <InfoRow icon={<IconShield size={19} color={C.primaryDeep} />} label="المراقبة" value="الشاشة + الصوت" />
              </div>
            </Card>

            <Card style={{ marginBottom:18, border:`1.5px solid ${C.gold}`, background:C.paperAlt }}>
              <div style={{ display:'flex', gap:13, marginBottom:14 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:C.goldSoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><IconMonitor size={22} color={C.primaryDeep} /></div>
                <div>
                  <h3 style={{ fontSize:16.5, fontWeight:800, color:C.ink, marginBottom:6 }}>هذا الاختبار مُراقَب بتسجيل الشاشة والصوت</h3>
                  <p style={{ fontSize:13.5, color:C.brown, lineHeight:1.95 }}>عند الضغط على «بدء الاختبار» سيطلب المتصفح إذنين. اتبع الخطوات التالية بدقّة — لن يبدأ الاختبار قبل إتمامها:</p>
                </div>
              </div>
              <ol style={{ margin:0, paddingInlineStart:0, listStyle:'none', display:'grid', gap:11 }}>
                {[
                  ['اختر «الشاشة بأكملها»', 'في نافذة المشاركة اختر «الشاشة بأكملها» (Entire screen) — لا نافذة ولا تبويبًا. لن يُقبل غير ذلك.'],
                  ['اسمح بالميكروفون', 'سيُطلب إذن الميكروفون، فاسمح به. سيُسجَّل صوتك وصوت جهازك طوال الاختبار.'],
                  ['تنقّل بين نوافذ جهازك', 'بعد بدء التسجيل، تنقّل بين صفحات وتطبيقات جهازك للتأكّد من تسجيل الشاشة كاملة، وليست صفحة الاختبار وحدها.'],
                ].map((it, k) => (
                  <li key={k} style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                    <span style={{ width:26, height:26, borderRadius:'50%', background:C.primary, color:'#fff', fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:f, marginTop:2 }}>{k+1}</span>
                    <div>
                      <div style={{ fontSize:14.5, fontWeight:700, color:C.ink, marginBottom:2 }}>{it[0]}</div>
                      <div style={{ fontSize:13, color:C.brown, lineHeight:1.9 }}>{it[1]}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <p style={{ fontSize:12.5, color:C.muted, lineHeight:1.9, marginTop:14, paddingTop:13, borderTop:`1px solid ${C.lineSoft}` }}>يُرسَل التسجيل تلقائيًا إلى إدارة القبول باسمك. يلزم استخدام جهاز حاسوب (لا يعمل تسجيل الشاشة على الجوال).</p>
            </Card>

            <Card style={{ marginBottom:18, border:`1.5px solid ${C.bad}`, background:C.badBg }}>
              <div style={{ display:'flex', gap:13, marginBottom:13 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><IconAlert size={23} color={C.bad} /></div>
                <div>
                  <h3 style={{ fontSize:16.5, fontWeight:800, color:C.bad, marginBottom:5 }}>شروط القبول — مخالفتها = رفض الاختبار وصفر</h3>
                  <p style={{ fontSize:13.5, color:C.brown, lineHeight:1.95 }}>اقرأ هذه الشروط جيّدًا. أيّ مخالفة لها تعني <strong style={{ color:C.bad }}>رفض الاختبار ووضع علامة صفر</strong> دون استثناء:</p>
                </div>
              </div>
              <ul style={{ margin:0, paddingInlineStart:0, listStyle:'none', display:'grid', gap:10 }}>
                {[
                  'إذا لم يُسمع صوتك في الفيديو، يُعَدّ الاختبار مرفوضًا وتوضع علامة صفر.',
                  'إذا لم تظهر في التسجيل جميع شاشات جهازك (وليس صفحة الاختبار وحدها)، يُعَدّ الاختبار مرفوضًا وتوضع علامة صفر.',
                  'إذا خرجت إلى أي مكان أو أوقفت التسجيل أثناء فترة الاختبار، توضع لك علامة صفر.',
                ].map((it, k) => (
                  <li key={k} style={{ display:'flex', gap:11, alignItems:'flex-start', background:'#fff', borderRadius:12, padding:'12px 14px', border:`1px solid ${C.lineSoft}` }}>
                    <span style={{ flexShrink:0, marginTop:2 }}><IconAlert size={18} color={C.bad} /></span>
                    <span style={{ fontSize:14, color:C.ink, fontWeight:600, lineHeight:1.9 }}>{it}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h3 style={{ fontSize:15.5, fontWeight:800, color:C.ink, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}><IconUser size={18} color={C.primary} />بيانات الطالب</h3>
              <div style={{ display:'grid', gap:14 }}>
                <Fld label="الاسم الكامل" required><Inp value={name} onChange={(e)=>setName(e.target.value)} placeholder="الاسم كما في طلب التسجيل" /></Fld>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Fld label="رقم الهوية" required><Inp value={nid} onChange={(e)=>setNid(e.target.value)} dir="ltr" /></Fld>
                  <Fld label="رقم الجوال"><Inp value={phone} onChange={(e)=>setPhone(e.target.value)} dir="ltr" /></Fld>
                </div>
                {err && <div style={{ fontSize:13, color:C.bad, background:C.badBg, padding:'10px 13px', borderRadius:10, lineHeight:1.7 }}>{err}</div>}
                <Btn full variant="primary" disabled={!ready || state==='requesting'} onClick={beginRecording}>
                  {state==='requesting' ? <><div className="ex-spin" style={{ width:18, height:18, borderWidth:2 }} />بانتظار إذن المشاركة…</> : <><IconMonitor size={19} color="#fff" />السماح بالتسجيل وبدء الاختبار</>}
                </Btn>
                <p style={{ fontSize:12, color:C.muted, textAlign:'center' }}>بالضغط أعلاه فإنك توافق على تسجيل شاشتك طوال مدة الاختبار.</p>
              </div>
            </Card>
          </div>
        </Page>
      );
    }

    if (state === 'denied') return (
      <Page><Card style={{ textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:C.badBg, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}><IconMonitor size={34} color={C.bad} /></div>
        <h2 style={{ fontFamily:"'Amiri', serif", fontSize:24, color:C.ink, marginBottom:10 }}>لم يبدأ التسجيل</h2>
        <p style={{ color:C.brown, fontSize:14.5, lineHeight:1.85, marginBottom:22 }}>{err || 'يجب السماح بمشاركة الشاشة لبدء الاختبار.'}</p>
        <Btn variant="primary" onClick={()=>{ setErr(''); setState('intro'); }}>المحاولة مرة أخرى</Btn>
      </Card></Page>
    );

    if (state === 'waiting') {
      const pct = ((180 - waitLeft) / 180) * 100;
      return (
        <Page>
          <RecBadge />
          <Card style={{ textAlign:'center' }} pad={34}>
            <div style={{ width:120, height:120, borderRadius:'50%', margin:'0 auto 22px', display:'flex', alignItems:'center', justifyContent:'center', background:`conic-gradient(${C.primary} ${pct}%, ${C.line} ${pct}%)`, position:'relative' }}>
              <div style={{ position:'absolute', inset:8, borderRadius:'50%', background:C.paper, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
                <span style={{ fontSize:30, fontWeight:800, color:C.ink, fontFamily:f, lineHeight:1 }}>{fmtTime(waitLeft)}</span>
                <span style={{ fontSize:11, color:C.muted, marginTop:3 }}>حتى البدء</span>
              </div>
            </div>
            <h2 style={{ fontFamily:"'Amiri', serif", fontSize:25, color:C.ink, marginBottom:8 }}>استعدّ — سيبدأ الاختبار قريبًا</h2>
            <p style={{ color:C.brown, fontSize:14.5, lineHeight:1.95, marginBottom:18 }}>أنت الآن في غرفة الانتظار، والتسجيل قيد العمل. <strong style={{ color:C.primaryDeep }}>تنقّل الآن بين نوافذ وصفحات جهازك</strong> للتأكد من أن الشاشة كاملة تُسجَّل، ثم استعد للاختبار في مكان هادئ.</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:24 }}>
              <MiniStat label="الاختبار" value={exam.title} />
              <MiniStat label="المدة" value={(exam.durationMin||45)+' دقيقة'} />
              <MiniStat label="النجاح" value={(exam.passMark||60)+'%'} />
            </div>
            <p style={{ fontSize:16, fontWeight:700, color:C.gold, marginBottom:18, fontFamily:"'Amiri', serif" }}>بالتوفيق 🌿</p>
            <Btn variant="soft" onClick={()=>{ setWaitLeft(0); }}>أنا جاهز — ابدأ الآن</Btn>
          </Card>
        </Page>
      );
    }

    if (state === 'exam') {
      const questions = exam.questions || [];
      const answered = questions.filter((q) => (ans[q.id] || '').toString().trim()).length;
      const low = examLeft <= 60;
      return (
        <div style={{ minHeight:'100vh', paddingBottom:40 }}>
          {/* شريط علوي ثابت: المؤقّت + التسجيل */}
          <div style={{ position:'sticky', top:0, zIndex:20, background:'rgba(244,238,225,.92)', backdropFilter:'blur(8px)', borderBottom:`1px solid ${C.line}`, padding:'12px 18px' }}>
            <div style={{ maxWidth:760, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <span className="ex-rec-dot" style={{ width:11, height:11, borderRadius:'50%', background:C.bad, display:'inline-block' }} />
                <span style={{ fontSize:12.5, fontWeight:700, color:C.bad }}>التسجيل جارٍ</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:12.5, color:C.muted }}>{answered}/{questions.length}</span>
                <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:11, background:low?C.badBg:C.paper, border:`1px solid ${low?C.bad:C.line}` }}>
                  <IconClock size={16} color={low?C.bad:C.primaryDeep} />
                  <span style={{ fontSize:16, fontWeight:800, fontFamily:f, color:low?C.bad:C.ink, minWidth:46, textAlign:'center' }}>{fmtTime(examLeft)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth:760, margin:'0 auto', padding:'22px 18px 0' }}>
            <h1 style={{ fontFamily:"'Amiri', serif", fontSize:24, color:C.ink, marginBottom:18 }}>{exam.title}</h1>
            <div style={{ display:'grid', gap:14 }}>
              {questions.map((q, i) => (
                <Card key={q.id} pad={20}>
                  <div style={{ display:'flex', gap:13, marginBottom:18 }}>
                    <span style={{ width:32, height:32, borderRadius:9, background:C.goldSoft, color:C.primaryDeep, fontWeight:800, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:f }}>{i+1}</span>
                    <p style={{ fontSize:17, fontWeight:600, color:C.ink, lineHeight:2, paddingTop:4, whiteSpace:'pre-wrap', textWrap:'pretty' }}>{q.text}</p>
                  </div>
                  {q.type === 'mcq' ? (
                    <div style={{ display:'grid', gap:9, paddingInlineStart:41 }}>
                      {(q.options || []).map((opt, k) => {
                        const on = ans[q.id] === k;
                        return (
                          <button key={k} type="button" onClick={()=>setAns((p)=>({ ...p, [q.id]:k }))} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, border:`1.5px solid ${on?C.primary:C.line}`, background:on?C.goldSoft:C.paperAlt, cursor:'pointer', textAlign:'start', fontFamily:f }}>
                            <span style={{ width:21, height:21, borderRadius:'50%', border:`2px solid ${on?C.primary:C.line}`, background:on?C.primary:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{on && <IconCheck size={12} color="#fff" />}</span>
                            <span style={{ fontSize:15.5, color:C.ink, lineHeight:1.8 }}>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ paddingInlineStart:41 }}>
                      <textarea value={ans[q.id] || ''} onChange={(e)=>setAns((p)=>({ ...p, [q.id]:e.target.value }))} rows={6} placeholder="اكتب إجابتك هنا…" style={{ width:'100%', padding:'16px 18px', borderRadius:14, border:`1px solid ${C.line}`, background:C.paperAlt, fontSize:15.5, color:C.ink, outline:'none', lineHeight:2.1 }} />
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {recWarn && <div style={{ marginTop:18, fontSize:13, color:C.bad, background:C.badBg, padding:'11px 14px', borderRadius:11 }}>{recWarn}</div>}

            <div style={{ marginTop:22, marginBottom:10 }}>
              <Btn full variant="primary" onClick={async ()=>{ if (window.confirm('هل أنت متأكد من إنهاء الاختبار وتسليمه؟')) finish(); }}>
                <IconCheckCircle size={19} color="#fff" />تسليم الاختبار وإنهاء التسجيل
              </Btn>
            </div>
            <p style={{ fontSize:12, color:C.muted, textAlign:'center', marginBottom:30 }}>سيُسلَّم الاختبار تلقائيًا عند انتهاء الوقت.</p>
          </div>
        </div>
      );
    }

    if (state === 'uploading') return (
      <Page><Card style={{ textAlign:'center' }} pad={40}>
        <div className="ex-spin" style={{ margin:'0 auto 22px' }} />
        <h2 style={{ fontFamily:"'Amiri', serif", fontSize:23, color:C.ink, marginBottom:10 }}>جارٍ حفظ إجابتك وفيديو الجلسة</h2>
        <p style={{ color:C.brown, fontSize:14, lineHeight:1.8 }}>{uploadMsg || 'يرجى عدم إغلاق الصفحة…'}</p>
      </Card></Page>
    );

    if (state === 'done') return (
      <Page><Card style={{ textAlign:'center' }} pad={40}>
        <div style={{ width:84, height:84, borderRadius:'50%', background:C.okBg, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px' }}><IconCheckCircle size={44} color={C.ok} /></div>
        <h2 style={{ fontFamily:"'Amiri', serif", fontWeight:700, fontSize:27, color:C.ink, marginBottom:12 }}>تم تسليم اختبارك</h2>
        <p style={{ color:C.brown, fontSize:15, lineHeight:1.85, marginBottom:8 }}>شكرًا لك. تم استلام إجاباتك وتسجيل الجلسة بنجاح، وستتولّى إدارة القبول مراجعتها وإبلاغك بالنتيجة.</p>
        {uploadMsg && <p style={{ color:C.bad, fontSize:12.5, lineHeight:1.7, marginTop:12, background:C.badBg, padding:'10px 13px', borderRadius:10 }}>{uploadMsg}</p>}
        <p style={{ fontSize:17, fontWeight:700, color:C.gold, marginTop:18, fontFamily:"'Amiri', serif" }}>بالتوفيق 🌿</p>
      </Card></Page>
    );

    return null;
  }

  // ---- حقول إدخال ----
  function Fld({ label, required, children }) {
    return (
      <label style={{ display:'block' }}>
        <span style={{ display:'block', fontSize:13, fontWeight:600, color:C.brown, marginBottom:7 }}>{label}{required && <span style={{ color:C.gold }}> *</span>}</span>
        {children}
      </label>
    );
  }
  function Inp(props) {
    return <input {...props} style={{ width:'100%', padding:'11px 14px', borderRadius:11, border:`1px solid ${C.line}`, background:C.paperAlt, fontSize:14.5, color:C.ink, outline:'none', fontFamily:f, ...(props.style||{}) }} />;
  }
  function MiniStat({ label, value }) {
    return (
      <div style={{ padding:'11px 8px', borderRadius:12, background:C.paperAlt, border:`1px solid ${C.lineSoft}` }}>
        <div style={{ fontSize:11, color:C.muted, marginBottom:3 }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:700, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</div>
      </div>
    );
  }
  function RecBadge() {
    return (
      <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:999, background:C.badBg, border:`1px solid ${C.bad}` }}>
          <span className="ex-rec-dot" style={{ width:10, height:10, borderRadius:'50%', background:C.bad }} />
          <span style={{ fontSize:12.5, fontWeight:700, color:C.bad }}>تسجيل الشاشة جارٍ</span>
        </div>
      </div>
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<ExamApp />);
})();
