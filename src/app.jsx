/* =========================================================================
   App root — التوجيه والجلسة عبر Supabase (بدل localStorage)
   يعتمد على window.TCData (src/data.js).
   ========================================================================= */
(function () {
  const { theme, L } = window.TC;
  const { PublicSite } = window.Public;
  const { AuthFlow } = window.Auth;
  const { StudentDashboard, TeacherDashboard, ManagementDashboard } = window.Dashboards;
  const { useState, useEffect } = React;
  const TCData = window.TCData;

  const LANG_KEY = 'tamkeen_lang_v1';

  function Splash({ text }) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:18, background:theme.cream }}>
        <div style={{ width:46, height:46, borderRadius:'50%', border:`3px solid ${theme.line}`, borderTopColor:theme.primary, animation:'tcSpin .8s linear infinite' }} />
        <p style={{ fontFamily:'Cairo, sans-serif', fontSize:14, color:theme.muted }}>{text}</p>
        <style>{'@keyframes tcSpin{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }

  function App() {
    const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || 'ar');
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [booting, setBooting] = useState(true);
    const [busy, setBusy] = useState(false);
    const [view, setView] = useState('public'); // public | auth | dashboard
    const [publicPage, setPublicPage] = useState('home');
    const [authStart, setAuthStart] = useState('initial');

    const t = L(lang);
    const setLang = (l) => setLangState(l);
    const uid = user ? user.accessKey : null;

    useEffect(() => {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      localStorage.setItem(LANG_KEY, lang);
    }, [lang]);

    // استعادة الجلسة عند الإقلاع
    useEffect(() => {
      let active = true;
      (async () => {
        try {
          const u = await TCData.getSessionUser();
          if (active && u) {
            const d = await TCData.loadDB();
            if (!active) return;
            setUser(u); setDb(d); setView('dashboard');
          }
        } catch (e) { console.error('bootstrap', e); }
        if (active) setBooting(false);
      })();
      return () => { active = false; };
    }, []);

    const reload = async () => { try { setDb(await TCData.loadDB()); } catch (e) { console.error('reload', e); } };

    // غلاف موحّد: ينفّذ العملية ثم يعيد التحميل ويعرض أي خطأ
    const run = (fn) => async (...args) => {
      try {
        const r = await fn(...args);
        if (r && r.error) { alert(r.error.message || r.error); return; }
      } catch (e) { alert((e && e.message) || String(e)); }
      await reload();
    };

    // ---- تسجيل الدخول
    const handleLogin = async (accessKey, password, role) => {
      const res = await TCData.signIn(accessKey, password);
      if (res.error) return { error: t('badCreds') };
      const u = await TCData.getSessionUser();
      if (!u) return { error: t('badCreds') };
      const ok =
        (role === 'admin' && (u.role === 'management' || u.role === 'director')) ||
        (role === 'teacher' && u.role === 'teacher') ||
        (role === 'student' && u.role === 'student');
      if (!ok) { await TCData.signOut(); return { error: t('roleMismatch') }; }
      const d = await TCData.loadDB();
      setUser(u); setDb(d); setView('dashboard');
      return { ok: true };
    };
    const handleLogout = async () => {
      await TCData.signOut();
      setUser(null); setDb(null); setView('public'); setPublicPage('home');
    };
    const goHome = () => { setView('public'); setPublicPage('home'); };
    const handleRegister = () => { /* تسجيل الطلاب الذاتي: مرحلة لاحقة */ };

    // ---- العمليات (مرآة للنسخة المحلية، لكن عبر Supabase)
    const actions = {
      markRead: run(TCData.markRead),
      deleteAssignment: run(TCData.deleteAssignment),

      // نظام السحابة (تخزين حقيقي)
      uploadCloud: run((ownerId, file) => TCData.uploadCloudFile(ownerId, file)),
      removeCloudItem: run((id, path) => TCData.removeCloudItem(id, path)),
      clearCloud: run((ownerId) => TCData.clearCloud(ownerId)),
      downloadCloud: async (path) => {
        try { const url = await TCData.getDownloadUrl(path); if (url) window.open(url, '_blank'); }
        catch (e) { alert((e && e.message) || String(e)); }
      },

      // الدرجات
      addGrade: run((studentId, g, by) => TCData.addGrade(studentId, g, by || uid)),
      editGrade: run(TCData.editGrade),
      deleteGrade: run(TCData.deleteGrade),
      assignHomework: run((studentId, hw, by) => TCData.assignHomework(studentId, hw, by || uid)),

      // السلوك (تحديث متفائل لتفادي القفز أثناء الكتابة)
      updateBehavior: async (studentId, score) => {
        const v = Math.max(0, Math.min(100, score || 0));
        setDb((prev) => prev ? { ...prev, behaviorScores: { ...prev.behaviorScores, [studentId]: v } } : prev);
        try { await TCData.updateBehavior(studentId, v, uid); } catch (e) { console.error(e); }
      },

      // المستخدمون (عبر RPC خادمي)
      addUser: run((role, f) => TCData.addUser(role, f)),
      deleteUser: async (accessKey) => {
        const ok = await window.UI.confirm({ title: lang==='ar'?'حذف المستخدم':'Delete user', message: lang==='ar'?'سيُحذف هذا المستخدم وكل بياناته نهائيًا. هل تريد المتابعة؟':'This user and all their data will be permanently deleted.', confirmText: lang==='ar'?'حذف':'Delete', icon:'trash' });
        if (!ok) return;
        return run(TCData.deleteUser)(accessKey);
      },
      setUserImage: run((accessKey, img) => TCData.setUserImage(accessKey, img)),

      // التوكيلات
      addDelegation: run((teacherId, del, by) => {
        let studentIds = del.studentIds;
        if (del.type !== 'students') {
          studentIds = del.className
            ? (db ? db.users.filter((u) => u.role === 'student' && u.academicYear && u.academicYear.includes(del.className)).map((u) => u.accessKey) : [])
            : [];
        }
        return TCData.addDelegation({
          teacher_id: teacherId, type: del.type,
          title: del.type === 'students' ? (lang === 'ar' ? 'توكيل طلاب' : 'Student delegation') : del.title,
          description: del.description || '', subject_name: del.subjectName || '', class_name: del.className || '',
          student_ids: studentIds || [], status: 'active', assigned_by: by || uid,
        });
      }),
      removeDelegation: run(TCData.removeDelegation),

      // الجداول
      addSchedule: run((s, by) => TCData.addSchedule(s, by || uid)),
      deleteSchedule: async (id) => {
        const ok = await window.UI.confirm({ title: lang==='ar'?'حذف الجدول':'Delete schedule', message: lang === 'ar' ? 'هل تريد حذف هذا الجدول؟' : 'Delete this schedule?', confirmText: lang==='ar'?'حذف':'Delete', icon:'trash' });
        if (!ok) return;
        return run(TCData.deleteSchedule)(id);
      },

      // الإعلانات
      createAnnouncement: run((a, by) => TCData.createAnnouncement(a, by || uid)),
      deleteAnnouncement: run(TCData.deleteAnnouncement),

      // المشاركة
      shareItems: run((items, recipientIds, by) => TCData.shareItems(items, recipientIds, by || uid)),

      // ---- المنهج والمقررات والدرجات (التحديث الكبير) ----
      setSetting: run((key, value) => TCData.setSetting(key, value, uid)),
      addCourse: run((c) => TCData.addCourse(c, uid)),
      editCourse: run((id, c) => TCData.editCourse(id, c)),
      deleteCourse: async (id) => {
        const ok = await window.UI.confirm({ title: lang==='ar'?'حذف المقرر':'Delete course', message: lang==='ar'?'سيُحذف المقرر وكل تسجيلاته ودرجاته. هل تريد المتابعة؟':'The course and all its enrollments and grades will be deleted.', confirmText: lang==='ar'?'حذف':'Delete', icon:'trash' });
        if (!ok) return;
        return run(TCData.deleteCourse)(id);
      },
      assignCourseTeacher: run((cid, tid) => TCData.assignCourseTeacher(cid, tid, uid)),
      unassignCourseTeacher: run((id) => TCData.unassignCourseTeacher(id)),
      enrollStudent: run((cid, sid) => TCData.enrollStudent(cid, sid, uid)),
      unenroll: run((id) => TCData.unenroll(id)),
      assignTeacherStudent: run((tid, sid) => TCData.assignTeacherStudent(tid, sid, uid)),
      unassignTeacherStudent: run((id) => TCData.unassignTeacherStudent(id)),
      setStudentStatus: run((sid, status) => TCData.setStudentStatus(sid, status)),
      saveCourseGrade: run((sid, cid, g, status) => TCData.saveCourseGrade(sid, cid, g, uid, status)),
      approveCourseGrade: run((id) => TCData.approveCourseGrade(id, uid)),
      revertCourseGrade: run((id) => TCData.revertCourseGrade(id)),
    };

    // ---- العرض
    if (booting) return <Splash text={lang === 'ar' ? 'جارٍ التحميل…' : 'Loading…'} />;

    const renderDashboard = () => {
      if (!user || !db) return <Splash text={lang === 'ar' ? 'جارٍ التحميل…' : 'Loading…'} />;
      const common = { user, lang, setLang, db, actions, onLogout: handleLogout, onHome: goHome };
      if (user.role === 'student') return <StudentDashboard {...common} />;
      if (user.role === 'teacher') return <TeacherDashboard {...common} />;
      return <ManagementDashboard {...common} />;
    };

    if (view === 'dashboard' && user) return renderDashboard();
    if (view === 'auth') return (
      <AuthFlow lang={lang} setLang={setLang} startStage={authStart}
        onBack={() => { setView('public'); }}
        onLogin={handleLogin} onRegister={handleRegister} />
    );
    return (
      <PublicSite lang={lang} setLang={setLang} page={publicPage} setPage={setPublicPage}
        onLogin={() => { setAuthStart('initial'); setView('auth'); }}
        onRegister={() => { setAuthStart('student-register'); setView('auth'); }} />
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.Fragment><App /><window.UI.ConfirmHost /></React.Fragment>
  );
})();
