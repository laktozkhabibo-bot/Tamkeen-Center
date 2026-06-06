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

    // عند الانتقال بين الصفحات/الأقسام: ابدأ من أعلى الصفحة الجديدة دائمًا
    useEffect(() => {
      window.scrollTo(0, 0);
    }, [view, publicPage]);

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

    // ترجمة أخطاء الخادم التقنية إلى رسائل واضحة
    const friendlyErr = (e) => {
      const msg = (e && e.message) || (typeof e === 'string' ? e : '') || '';
      if (/duplicate key|profiles_pkey|already exists|unique constraint/i.test(msg))
        return lang === 'ar'
          ? 'تعذّر إنشاء الحساب: البيانات مستخدمة بالفعل. إن تكرّر الخطأ، شغّل آخر تحديث لقاعدة البيانات (setup-v5.sql).'
          : 'Could not create the account: the data is already in use.';
      return msg || (lang === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error');
    };

    // غلاف موحّد: ينفّذ العملية ثم يعيد التحميل بالكامل (للعمليات النادرة فقط)
    const run = (fn) => async (...args) => {
      try {
        const r = await fn(...args);
        if (r && r.error) { alert(friendlyErr(r.error)); return; }
      } catch (e) { alert(friendlyErr(e)); }
      await reload();
    };

    // ============================================================
    //  محرّك التحديث المتفائل (Optimistic) — يجعل الواجهة فورية
    //  بدل إعادة تحميل قاعدة البيانات كاملة (15 استعلامًا) بعد كل عملية،
    //  نحدّث الحالة محليًا مباشرة ثم نكتب في الخلفية. لا انتظار للشبكة.
    // ============================================================
    const patchDb = (fn) => setDb((prev) => (prev ? fn(prev) : prev));
    const tmpId = () => 'tmp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    // مزامنة صامتة مؤجّلة: تستبدل المعرّفات المؤقتة بمعرّفات الخادم الحقيقية
    // دون أي وميض مرئي (الواجهة محدّثة مسبقًا تفاؤليًا). تُجمَّع عمليات متتالية.
    const reconcileTimer = React.useRef(null);
    const reconcile = () => {
      clearTimeout(reconcileTimer.current);
      reconcileTimer.current = setTimeout(() => { reload(); }, 900);
    };

    // تنفيذ الكتابة في الخلفية؛ عند الخطأ فقط نُعيد المزامنة الكاملة لاستعادة الحالة
    const bg = (fn, opts) => {
      (async () => {
        try {
          const r = await fn();
          if (r && r.error) { alert(friendlyErr(r.error)); reload(); return; }
          if (opts && opts.reconcile) reconcile();
        } catch (e) { alert(friendlyErr(e)); reload(); }
      })();
    };

    // تحديث/حذف متفائل: تعديل محلي فوري + كتابة بالخلفية (لا إعادة تحميل عند النجاح)
    const optMut = (patch, write) => (...a) => { patch(...a); bg(() => write(...a)); };
    // إضافة متفائلة: صف محلي مؤقت فوري + كتابة بالخلفية + مزامنة صامتة للمعرّفات
    const optIns = (patch, write) => (...a) => { patch(...a); bg(() => write(...a), { reconcile: true }); };

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

    // ---- العمليات: تحديث متفائل فوري + كتابة في الخلفية (لا إعادة تحميل كامل) ----
    const actions = {
      // البريد / صندوق الوارد
      markRead: optMut(
        (id) => patchDb((d) => ({ ...d, sharedItems: d.sharedItems.map((s) => s.id === id ? { ...s, isRead: 1 } : s) })),
        (id) => TCData.markRead(id)),
      deleteSharedItem: optMut(
        (id) => patchDb((d) => ({ ...d, sharedItems: d.sharedItems.filter((s) => s.id !== id) })),
        (id) => TCData.deleteSharedItem(id)),

      deleteAssignment: optMut(
        (id) => patchDb((d) => ({ ...d, assignments: d.assignments.filter((a) => a.id !== id) })),
        (id) => TCData.deleteAssignment(id)),

      // نظام السحابة (تخزين حقيقي)
      uploadCloud: run((ownerId, file) => TCData.uploadCloudFile(ownerId, file)),
      removeCloudItem: optMut(
        (id) => patchDb((d) => ({ ...d, cloudItems: d.cloudItems.filter((c) => c.id !== id) })),
        (id, path) => TCData.removeCloudItem(id, path)),
      clearCloud: optMut(
        (ownerId) => patchDb((d) => ({ ...d, cloudItems: d.cloudItems.filter((c) => c.ownerId !== ownerId) })),
        (ownerId) => TCData.clearCloud(ownerId)),
      downloadCloud: async (path) => {
        try { const url = await TCData.getDownloadUrl(path); if (url) window.open(url, '_blank'); }
        catch (e) { alert((e && e.message) || String(e)); }
      },

      // الدرجات
      addGrade: optIns(
        (studentId, g, by) => patchDb((d) => ({ ...d, grades: [...d.grades, { id: tmpId(), studentId, subject: g.subject, score: g.score, maxScore: 100, notes: g.notes || '', createdBy: by || uid, createdAt: new Date().toISOString() }] })),
        (studentId, g, by) => TCData.addGrade(studentId, g, by || uid)),
      editGrade: optMut(
        (id, g) => patchDb((d) => ({ ...d, grades: d.grades.map((x) => x.id === id ? { ...x, subject: g.subject, score: g.score, notes: g.notes || '' } : x) })),
        (id, g) => TCData.editGrade(id, g)),
      deleteGrade: optMut(
        (id) => patchDb((d) => ({ ...d, grades: d.grades.filter((x) => x.id !== id) })),
        (id) => TCData.deleteGrade(id)),
      assignHomework: optIns(
        (studentId, hw, by) => patchDb((d) => ({ ...d, assignments: [...d.assignments, { id: tmpId(), studentId, title: hw.title, description: hw.description || '', dueDate: hw.dueDate || '', assignedBy: by || uid, createdAt: new Date().toISOString() }] })),
        (studentId, hw, by) => TCData.assignHomework(studentId, hw, by || uid)),

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
        patchDb((d) => ({
          ...d,
          users: d.users.filter((u) => u.accessKey !== accessKey),
          enrollments: d.enrollments.filter((e) => e.studentId !== accessKey),
          courseTeachers: d.courseTeachers.filter((ct) => ct.teacherId !== accessKey),
          teacherStudents: d.teacherStudents.filter((ts) => ts.teacherId !== accessKey && ts.studentId !== accessKey),
          grades: d.grades.filter((g) => g.studentId !== accessKey),
          assignments: d.assignments.filter((a) => a.studentId !== accessKey),
          courseGrades: d.courseGrades.filter((g) => g.studentId !== accessKey),
          delegations: d.delegations.filter((dl) => dl.teacherId !== accessKey),
          sharedItems: d.sharedItems.filter((s) => s.toUserId !== accessKey && s.fromUserId !== accessKey),
        }));
        bg(() => TCData.deleteUser(accessKey), { reconcile: true });
      },
      setUserImage: (accessKey, img) => {
        patchDb((d) => ({ ...d, users: d.users.map((u) => u.accessKey === accessKey ? { ...u, img } : u) }));
        if (accessKey === uid) setUser((prev) => prev ? { ...prev, img } : prev);
        bg(() => TCData.setUserImage(accessKey, img));
      },
      editUser: (accessKey, f) => {
        patchDb((d) => ({ ...d, users: d.users.map((u) => {
          if (u.accessKey !== accessKey) return u;
          const next = { ...u };
          if (f.name != null) next.name = f.name;
          if (f.phone !== undefined) next.phone = f.phone;
          if (f.email !== undefined) next.email = f.email;
          if (f.specializations !== undefined) next.specializations = f.specializations || [];
          if (f.img !== undefined) next.img = f.img;
          return next;
        }) }));
        if (accessKey === uid) setUser((prev) => prev ? { ...prev, ...(f.name!=null?{name:f.name}:{}), ...(f.img!==undefined?{img:f.img}:{}) } : prev);
        bg(() => TCData.editUser(accessKey, f));
      },

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
      removeDelegation: optMut(
        (id) => patchDb((d) => ({ ...d, delegations: d.delegations.filter((x) => x.id !== id) })),
        (id) => TCData.removeDelegation(id)),

      // الجداول
      addSchedule: optIns(
        (s, by) => patchDb((d) => { const cols = s.columns.filter((c) => c.trim()); return { ...d, schedules: [...d.schedules, { id: tmpId(), title: s.name, type: s.type, columns: cols, rows: s.rows.map((r) => r.slice(0, cols.length)), createdBy: by || uid, createdAt: new Date().toISOString() }] }; }),
        (s, by) => TCData.addSchedule(s, by || uid)),
      deleteSchedule: async (id) => {
        const ok = await window.UI.confirm({ title: lang==='ar'?'حذف الجدول':'Delete schedule', message: lang === 'ar' ? 'هل تريد حذف هذا الجدول؟' : 'Delete this schedule?', confirmText: lang==='ar'?'حذف':'Delete', icon:'trash' });
        if (!ok) return;
        patchDb((d) => ({ ...d, schedules: d.schedules.filter((x) => x.id !== id) }));
        bg(() => TCData.deleteSchedule(id));
      },

      // الإعلانات
      createAnnouncement: optIns(
        (a, by) => patchDb((d) => ({ ...d, announcements: [...d.announcements, { id: tmpId(), title: a.title, content: a.content, template: a.template, audience: a.audience || ['students', 'teachers', 'admins'], createdBy: by || uid, createdAt: new Date().toISOString() }] })),
        (a, by) => TCData.createAnnouncement(a, by || uid)),
      deleteAnnouncement: optMut(
        (id) => patchDb((d) => ({ ...d, announcements: d.announcements.filter((x) => x.id !== id) })),
        (id) => TCData.deleteAnnouncement(id)),

      // المشاركة
      shareItems: run((items, recipientIds, by) => TCData.shareItems(items, recipientIds, by || uid)),

      // ---- المنهج والمقررات والدرجات ----
      setSetting: (key, value) => {
        patchDb((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));
        bg(() => TCData.setSetting(key, value, uid));
      },
      addCourse: optIns(
        (c) => patchDb((d) => ({ ...d, courses: [...d.courses, { id: tmpId(), diploma: c.diploma, semester: c.semester, name: c.name, code: c.code, link: c.link || null, notes: c.notes || null, fileData: c.fileData || null, fileName: c.fileName || null, createdBy: uid, createdAt: new Date().toISOString() }] })),
        (c) => TCData.addCourse(c, uid)),
      editCourse: optMut(
        (id, c) => patchDb((d) => ({ ...d, courses: d.courses.map((x) => x.id === id ? { ...x, diploma: c.diploma, semester: c.semester, name: c.name, code: c.code, link: c.link || null, notes: c.notes || null, fileData: c.fileData || null, fileName: c.fileName || null } : x) })),
        (id, c) => TCData.editCourse(id, c)),
      deleteCourse: async (id) => {
        const ok = await window.UI.confirm({ title: lang==='ar'?'حذف المقرر':'Delete course', message: lang==='ar'?'سيُحذف المقرر وكل تسجيلاته ودرجاته. هل تريد المتابعة؟':'The course and all its enrollments and grades will be deleted.', confirmText: lang==='ar'?'حذف':'Delete', icon:'trash' });
        if (!ok) return;
        patchDb((d) => ({
          ...d,
          courses: d.courses.filter((x) => x.id !== id),
          courseTeachers: d.courseTeachers.filter((ct) => ct.courseId !== id),
          enrollments: d.enrollments.filter((e) => e.courseId !== id),
          courseGrades: d.courseGrades.filter((g) => g.courseId !== id),
        }));
        bg(() => TCData.deleteCourse(id), { reconcile: true });
      },
      assignCourseTeacher: optIns(
        (cid, tid) => patchDb((d) => ({ ...d, courseTeachers: [...d.courseTeachers, { id: tmpId(), courseId: cid, teacherId: tid }] })),
        (cid, tid) => TCData.assignCourseTeacher(cid, tid, uid)),
      unassignCourseTeacher: optMut(
        (id) => patchDb((d) => ({ ...d, courseTeachers: d.courseTeachers.filter((x) => x.id !== id) })),
        (id) => TCData.unassignCourseTeacher(id)),
      enrollStudent: optIns(
        (cid, sid) => patchDb((d) => ({ ...d, enrollments: [...d.enrollments, { id: tmpId(), courseId: cid, studentId: sid }] })),
        (cid, sid) => TCData.enrollStudent(cid, sid, uid)),
      unenroll: optMut(
        (id) => patchDb((d) => ({ ...d, enrollments: d.enrollments.filter((x) => x.id !== id) })),
        (id) => TCData.unenroll(id)),
      assignTeacherStudent: optIns(
        (tid, sid) => patchDb((d) => ({ ...d, teacherStudents: [...d.teacherStudents, { id: tmpId(), teacherId: tid, studentId: sid }] })),
        (tid, sid) => TCData.assignTeacherStudent(tid, sid, uid)),
      unassignTeacherStudent: optMut(
        (id) => patchDb((d) => ({ ...d, teacherStudents: d.teacherStudents.filter((x) => x.id !== id) })),
        (id) => TCData.unassignTeacherStudent(id)),
      setStudentStatus: optMut(
        (sid, status) => patchDb((d) => ({ ...d, users: d.users.map((u) => u.accessKey === sid ? { ...u, status } : u) })),
        (sid, status) => TCData.setStudentStatus(sid, status)),
      saveCourseGrade: (sid, cid, g, status) => {
        patchDb((d) => {
          const exists = d.courseGrades.find((x) => x.studentId === sid && x.courseId === cid);
          const fields = { participation: g.participation || 0, midterm: g.midterm || 0, final: g.final || 0, status: status || 'draft', updatedAt: new Date().toISOString() };
          if (exists) return { ...d, courseGrades: d.courseGrades.map((x) => (x.studentId === sid && x.courseId === cid) ? { ...x, ...fields } : x) };
          return { ...d, courseGrades: [...d.courseGrades, { id: tmpId(), studentId: sid, courseId: cid, ...fields, createdBy: uid, approvedBy: null, createdAt: new Date().toISOString() }] };
        });
        bg(() => TCData.saveCourseGrade(sid, cid, g, uid, status), { reconcile: true });
      },
      approveCourseGrade: optMut(
        (id) => patchDb((d) => ({ ...d, courseGrades: d.courseGrades.map((x) => x.id === id ? { ...x, status: 'approved', approvedBy: uid } : x) })),
        (id) => TCData.approveCourseGrade(id, uid)),
      revertCourseGrade: optMut(
        (id) => patchDb((d) => ({ ...d, courseGrades: d.courseGrades.map((x) => x.id === id ? { ...x, status: 'draft', approvedBy: null } : x) })),
        (id) => TCData.revertCourseGrade(id)),
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
