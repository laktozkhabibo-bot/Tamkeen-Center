/* =========================================================================
   لوحة التسجيل والقبول — window.Dashboards.RegistrarDashboard
   يُعرض لحساب الإدارة المخصّص للقبول (REG102، management_section = 'admissions').
   • بيانات الطلبات/الاختبارات/الرسائل: تخزين محلي (window.RegData).
   • تحويل المقبول إلى طالب: حساب Supabase حقيقي عبر TCData.addUser (جلسة إدارية).
   ========================================================================= */
(function () {
  const { theme, Icon } = window.TC;
  const { DashShell } = window.Dash;
  const { T, StatsTab, RequestList, RequestDetail, programLabel } = window.RegCore;
  const { ExamsTab, ResultsTab, MessagesTab, ReportsTab } = window.RegMore;
  const { useState, useEffect } = React;
  const RD = window.RegData;

  function RegistrarDashboard({ user, lang, setLang, db, onLogout, onHome, routeTab, onTab }) {
    const t = T(lang);
    const [version, setVersion] = useState(0);
    const refresh = () => setVersion((v) => v + 1);
    const regDb = RD.getDB();
    const [active, setActiveState] = useState(routeTab || 'dashboard');
    const setActive = (tb) => { setActiveState(tb); onTab && onTab(tb); };
    useEffect(() => { if (routeTab && routeTab !== active) setActiveState(routeTab); }, [routeTab]);

    const [openId, setOpenId] = useState(null);

    // توليد مفتاح طالب غير مستخدم (من حسابات Supabase + الحسابات التي أُنشئت بالفعل)
    const freeStudentKey = () => {
      const used = new Set();
      (db && db.users || []).forEach((u) => used.add(String(u.accessKey).toUpperCase()));
      regDb.requests.forEach((r) => { if (r.account) used.add(String(r.account.accessKey).toUpperCase()); });
      let n = 200, key;
      do { key = 'S' + n; n++; } while (used.has(key) && n < 100000);
      return key;
    };
    const genPassword = () => Math.random().toString(36).slice(2, 6) + Math.floor(10 + Math.random() * 89);

    // تحويل المقبول إلى حساب طالب رسمي في Supabase (يُرجع true عند النجاح)
    const convertToStudent = async (id) => {
      const r = regDb.requests.find((x) => x.id === id);
      if (!r || r.account) return false;
      const key = freeStudentKey();
      const password = genPassword();
      const payload = { name: r.full_name, accessKey: key, password, phone: r.phone || '', email: r.email || '', academicYear: programLabel(r.program, lang) };
      try {
        const res = await window.TCData.addUser('student', payload);
        if (res && res.error) { alert((res.error && res.error.message) || res.error); return false; }
        RD.attachAccount(id, { accessKey: key, password });
        refresh();
        return true;
      } catch (e) { alert((e && e.message) || String(e)); return false; }
    };

    const wrap = (fn) => (...args) => { const r = fn(...args); refresh(); return r; };
    const actions = {
      setStatus: wrap(RD.setStatus),
      deleteRequest: wrap((id) => RD.deleteRequest(id)),
      sendMessage: wrap(RD.sendMessage),
      setAppointment: wrap(RD.setAppointment),
      assignExam: wrap(RD.assignExam),
      recordResult: wrap(RD.recordResult),
      approveResult: wrap(RD.approveResult),
      convertToStudent, // async
      addExam: wrap(RD.addExam),
      updateExam: wrap(RD.updateExam),
      deleteExam: wrap(RD.deleteExam),
      addQuestion: wrap(RD.addQuestion),
      updateQuestion: wrap(RD.updateQuestion),
      deleteQuestion: wrap(RD.deleteQuestion),
    };

    const reqs = regDb.requests;
    const newCount = reqs.filter((r) => r.status === 'new').length;
    const suspendedCount = reqs.filter((r) => r.status === 'suspended').length;
    const resultsPending = reqs.filter((r) => r.status === 'passed' && !r.resultApproved).length;

    const tabs = [
      { id: 'dashboard', label: t('dashboard'), icon: 'grid', badge: 0 },
      { id: 'requests', label: t('requests'), icon: 'inbox', badge: newCount },
      { id: 'accepted', label: t('accepted'), icon: 'checkCircle', badge: 0 },
      { id: 'suspended', label: t('suspended'), icon: 'clock', badge: suspendedCount },
      { id: 'rejected', label: t('rejected'), icon: 'x', badge: 0 },
      { id: 'exams', label: t('exams'), icon: 'fileText', badge: 0 },
      { id: 'results', label: t('results'), icon: 'award', badge: resultsPending },
      { id: 'messages', label: t('messages'), icon: 'megaphone', badge: 0 },
      { id: 'reports', label: t('reports'), icon: 'layers', badge: 0 },
    ];

    const displayUser = { ...user, name: lang === 'ar' ? (user.name || RD.REGISTRAR_NAME.ar) : RD.REGISTRAR_NAME.en };

    return (
      <DashShell user={displayUser} lang={lang} setLang={setLang} panelLabel={t('panel')} accent={theme.primaryDeep}
        tabs={tabs} active={active} setActive={setActive} onLogout={onLogout} onHome={onHome}>

        {active === 'dashboard' && <StatsTab db={regDb} lang={lang} onOpen={setOpenId} goTab={setActive} />}
        {active === 'requests' && <RequestList db={regDb} lang={lang} scope="inbox" onOpen={setOpenId} />}
        {active === 'accepted' && <RequestList db={regDb} lang={lang} scope="accepted" onOpen={setOpenId} />}
        {active === 'suspended' && <RequestList db={regDb} lang={lang} scope="suspended" onOpen={setOpenId} />}
        {active === 'rejected' && <RequestList db={regDb} lang={lang} scope="rejected" onOpen={setOpenId} />}
        {active === 'exams' && <ExamsTab db={regDb} lang={lang} actions={actions} />}
        {active === 'results' && <ResultsTab db={regDb} lang={lang} actions={actions} onOpen={setOpenId} />}
        {active === 'messages' && <MessagesTab db={regDb} lang={lang} actions={actions} />}
        {active === 'reports' && <ReportsTab db={regDb} lang={lang} />}

        {openId && <RequestDetail id={openId} db={regDb} lang={lang} actions={actions} onClose={() => setOpenId(null)} />}
      </DashShell>
    );
  }

  window.Dashboards = window.Dashboards || {};
  window.Dashboards.RegistrarDashboard = RegistrarDashboard;
})();
