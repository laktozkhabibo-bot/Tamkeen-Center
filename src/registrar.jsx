/* =========================================================================
   لوحة التسجيل والقبول — window.Dashboards.RegistrarDashboard
   تُعرض لحساب الإدارة المخصّص للقبول (REG102، management_section = 'admissions').
   • كل البيانات من Supabase عبر window.RegData (تظهر على جميع الأجهزة).
   • تحويل المقبول إلى طالب: حساب Supabase حقيقي عبر TCData.addUser.
   ========================================================================= */
(function () {
  const { theme, Icon } = window.TC;
  const { DashShell } = window.Dash;
  const { T, StatsTab, RequestList, RequestDetail, programLabel } = window.RegCore;
  const { ExamsTab, ResultsTab, MessagesTab, ReportsTab, RecordingsTab } = window.RegMore;
  const { useState, useEffect, useCallback } = React;
  const RD = window.RegData;

  function Splash({ text }) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: theme.muted }}>
        <div className="tc-spin" style={{ width: 38, height: 38, border: `3px solid ${theme.line}`, borderTopColor: theme.primary, borderRadius: '50%' }} />
        <p style={{ fontSize: 14 }}>{text}</p>
      </div>
    );
  }

  function RegistrarDashboard({ user, lang, setLang, db, onLogout, onHome, routeTab, onTab }) {
    const t = T(lang);
    const [regDb, setRegDb] = useState(null);
    const [loadErr, setLoadErr] = useState('');
    const [active, setActiveState] = useState(routeTab || 'dashboard');
    const setActive = (tb) => { setActiveState(tb); onTab && onTab(tb); };
    useEffect(() => { if (routeTab && routeTab !== active) setActiveState(routeTab); }, [routeTab]);
    const [openId, setOpenId] = useState(null);

    const reload = useCallback(async () => {
      try {
        const data = await RD.loadAll();
        const e = data.errors || {};
        const firstErr = e.reqs || e.exams || e.qs || e.msgs || e.recs;
        if (firstErr) setLoadErr(firstErr.message || String(firstErr)); else setLoadErr('');
        setRegDb(data);
      } catch (er) { setLoadErr((er && er.message) || String(er)); }
    }, []);
    useEffect(() => { reload(); }, [reload]);

    // توليد مفتاح طالب غير مستخدم
    const freeStudentKey = () => {
      const used = new Set();
      ((db && db.users) || []).forEach((u) => used.add(String(u.accessKey).toUpperCase()));
      (regDb ? regDb.requests : []).forEach((r) => { if (r.account) used.add(String(r.account.accessKey).toUpperCase()); });
      let n = 200, key;
      do { key = 'S' + n; n++; } while (used.has(key) && n < 100000);
      return key;
    };
    const genPassword = () => Math.random().toString(36).slice(2, 6) + Math.floor(10 + Math.random() * 89);

    // تحويل المقبول إلى حساب طالب رسمي في Supabase
    const convertToStudent = async (id) => {
      const r = regDb.requests.find((x) => x.id === id);
      if (!r || r.account) return false;
      const key = freeStudentKey();
      const password = genPassword();
      const payload = { name: r.full_name, accessKey: key, password, phone: r.phone || '', email: r.email || '', academicYear: programLabel(r.program, lang) };
      try {
        const res = await window.TCData.addUser('student', payload);
        if (res && res.error) { alert((res.error && res.error.message) || res.error); return false; }
        await RD.attachAccount(id, { accessKey: key, password });
        await reload();
        return true;
      } catch (e) { alert((e && e.message) || String(e)); return false; }
    };

    // كل عملية: تُنفَّذ ثم تُعاد قراءة البيانات
    const wrap = (fn) => async (...args) => { await fn(...args); await reload(); };
    const actions = {
      setStatus: wrap(RD.setStatus),
      deleteRequest: wrap(RD.deleteRequest),
      sendMessage: wrap(RD.sendMessage),
      setAppointment: wrap(RD.setAppointment),
      assignExam: wrap(RD.assignExam),
      recordResult: wrap(RD.recordResult),
      approveResult: wrap(RD.approveResult),
      convertToStudent, // async → يُرجع true/false
      addExam: wrap(RD.addExam),
      updateExam: wrap(RD.updateExam),
      deleteExam: wrap(RD.deleteExam),
      addQuestion: wrap(RD.addQuestion),
      updateQuestion: wrap(RD.updateQuestion),
      deleteQuestion: wrap(RD.deleteQuestion),
      deleteRecording: wrap(RD.deleteRecording),
      recordingUrl: RD.recordingUrl,
      reload,
    };

    const displayUser = { ...user, name: lang === 'ar' ? (user.name || RD.REGISTRAR_NAME.ar) : RD.REGISTRAR_NAME.en };

    if (!regDb) {
      return (
        <DashShell user={displayUser} lang={lang} setLang={setLang} panelLabel={t('panel')} accent={theme.primaryDeep}
          tabs={[{ id: 'dashboard', label: t('dashboard'), icon: 'grid', badge: 0 }]} active="dashboard" setActive={() => {}} onLogout={onLogout} onHome={onHome}>
          <Splash text={lang === 'ar' ? 'جارٍ تحميل بيانات التسجيل…' : 'Loading admissions…'} />
        </DashShell>
      );
    }

    const reqs = regDb.requests;
    const newCount = reqs.filter((r) => r.status === 'new').length;
    const suspendedCount = reqs.filter((r) => r.status === 'suspended').length;
    const resultsPending = reqs.filter((r) => r.status === 'passed' && !r.resultApproved).length;
    const recCount = regDb.recordings.length;

    const tabs = [
      { id: 'dashboard', label: t('dashboard'), icon: 'grid', badge: 0 },
      { id: 'requests', label: t('requests'), icon: 'inbox', badge: newCount },
      { id: 'accepted', label: t('accepted'), icon: 'checkCircle', badge: 0 },
      { id: 'suspended', label: t('suspended'), icon: 'clock', badge: suspendedCount },
      { id: 'rejected', label: t('rejected'), icon: 'x', badge: 0 },
      { id: 'exams', label: t('exams'), icon: 'fileText', badge: 0 },
      { id: 'results', label: t('results'), icon: 'award', badge: resultsPending },
      { id: 'recordings', label: t('recordings'), icon: 'video', badge: recCount },
      { id: 'messages', label: t('messages'), icon: 'megaphone', badge: 0 },
      { id: 'reports', label: t('reports'), icon: 'layers', badge: 0 },
    ];

    return (
      <DashShell user={displayUser} lang={lang} setLang={setLang} panelLabel={t('panel')} accent={theme.primaryDeep}
        tabs={tabs} active={active} setActive={setActive} onLogout={onLogout} onHome={onHome}>

        {loadErr && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: theme.badBg, border: `1px solid ${theme.bad}`, color: theme.bad, fontSize: 13.5, marginBottom: 18, lineHeight: 1.7 }}>
            <strong>{lang === 'ar' ? 'تعذّر تحميل بعض البيانات.' : 'Some data failed to load.'}</strong>
            {' '}{lang === 'ar' ? 'تأكد من تشغيل ملف قاعدة البيانات supabase/setup-v9.sql.' : 'Make sure supabase/setup-v9.sql has been run.'}
            <div style={{ fontSize: 11.5, opacity: .8, marginTop: 4, direction: 'ltr', textAlign: 'left' }}>{loadErr}</div>
          </div>
        )}

        {active === 'dashboard' && <StatsTab db={regDb} lang={lang} onOpen={setOpenId} goTab={setActive} />}
        {active === 'requests' && <RequestList db={regDb} lang={lang} scope="inbox" onOpen={setOpenId} />}
        {active === 'accepted' && <RequestList db={regDb} lang={lang} scope="accepted" onOpen={setOpenId} />}
        {active === 'suspended' && <RequestList db={regDb} lang={lang} scope="suspended" onOpen={setOpenId} />}
        {active === 'rejected' && <RequestList db={regDb} lang={lang} scope="rejected" onOpen={setOpenId} />}
        {active === 'exams' && <ExamsTab db={regDb} lang={lang} actions={actions} />}
        {active === 'results' && <ResultsTab db={regDb} lang={lang} actions={actions} onOpen={setOpenId} />}
        {active === 'recordings' && <RecordingsTab db={regDb} lang={lang} actions={actions} />}
        {active === 'messages' && <MessagesTab db={regDb} lang={lang} actions={actions} />}
        {active === 'reports' && <ReportsTab db={regDb} lang={lang} />}

        {openId && <RequestDetail id={openId} db={regDb} lang={lang} actions={actions} onClose={() => setOpenId(null)} />}
      </DashShell>
    );
  }

  window.Dashboards = window.Dashboards || {};
  window.Dashboards.RegistrarDashboard = RegistrarDashboard;
})();
