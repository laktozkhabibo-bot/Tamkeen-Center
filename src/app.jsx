/* =========================================================================
   App root — التوجيه والجلسة عبر Supabase (بدل localStorage)
   يعتمد على window.TCData (src/data.js).
   ========================================================================= */
(function () {
  const { theme, L } = window.TC;
  const { PublicSite } = window.Public;
  const { AuthFlow } = window.Auth;
  const { StudentDashboard, TeacherDashboard, ManagementDashboard, RegistrarDashboard } = window.Dashboards;
  const { useState, useEffect } = React;
  const TCData = window.TCData;

  const LANG_KEY = 'tamkeen_lang_v1';
  // دليل المستند الأصلي (يُلتقط مرة واحدة عند التحميل) — نبني عليه المسارات
  // حتى تبقى روابط الأصول (الصور/السكربت) صحيحة في أي بيئة.
  const ROUTE_BASE = window.location.pathname.replace(/[^/]*$/, '') || '/';

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
    // ---- التوجيه عبر المسار: لكل قسم رابط مستقل
    //  /  · /about · /leadership · /diplomas · /login
    //  /mng  · /teacher · /student  (+ تبويب داخلي: /mng/teachers إلخ)
    const parsePath = (pathname, search) => {
      let rel = String(pathname || '/');
      rel = rel.startsWith(ROUTE_BASE) ? rel.slice(ROUTE_BASE.length) : rel.replace(/^\/+/, '');
      const seg = rel.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
      const a = (seg[0] || '').toLowerCase();
      const tab = new URLSearchParams(search || '').get('tab');
      if (a === 'login') return { view: 'auth', publicPage: 'home', dashTab: null, dashBase: null };
      if (a === 'mng' || a === 'teacher' || a === 'student' || a === 'reg') return { view: 'dashboard', publicPage: 'home', dashTab: tab || null, dashBase: a };
      const pages = ['about', 'leadership', 'diplomas'];
      return { view: 'public', publicPage: pages.includes(a) ? a : 'home', dashTab: null, dashBase: null };
    };
    const r0 = parsePath(window.location.pathname, window.location.search);
    const [view, setView] = useState(r0.view); // public | auth | dashboard
    const [publicPage, setPublicPage] = useState(r0.publicPage);
    const [dashTab, setDashTab] = useState(r0.dashTab);
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
    }, [view, publicPage, dashTab]);

    // مزامنة عنوان المتصفح مع القسم الحالي (لكل قسم رابط مستقل)
    useEffect(() => {
      if (booting) return; // لا نغيّر الرابط قبل اكتمال استعادة الجلسة (تفادي ارتداد العنوان)
      let sub = '';
      if (view === 'auth') sub = 'login';
      else if (view === 'dashboard' && user) {
        const b = user.role === 'student' ? 'student' : user.role === 'teacher' ? 'teacher' : user.role === 'registrar' ? 'reg' : 'mng';
        sub = b + (dashTab ? ('?tab=' + encodeURIComponent(dashTab)) : '');
      } else {
        sub = publicPage === 'home' ? '' : publicPage;
      }
      const path = ROUTE_BASE + sub;
      const cur = window.location.pathname + window.location.search;
      if (cur !== path) window.history.pushState({}, '', path);
    }, [view, publicPage, dashTab, user, booting]);

    // أزرار رجوع/تقدّم في المتصفح
    useEffect(() => {
      const onPop = () => {
        const r = parsePath(window.location.pathname, window.location.search);
        if (r.dashBase) {
          if (user) { setView('dashboard'); setDashTab(r.dashTab); }
          else { setView('public'); setPublicPage('home'); }
          return;
        }
        if (r.view === 'auth') { setView('auth'); return; }
        setView('public'); setPublicPage(r.publicPage); setDashTab(null);
      };
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    }, [user]);

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
    // معرّف حقيقي (UUID) يُولَّد في المتصفح ويُرسل للخادم كما هو — لا معرّفات مؤقتة.
    // بهذا يتطابق معرّف الواجهة مع معرّف قاعدة البيانات منذ اللحظة الأولى، فلا تفشل
    // عمليات الحذف/الإسناد اللاحقة (كانت ترسل "tmp_..." لعمود uuid وتسبّب الخطأ).
    const newId = () => (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
        });

    // مزامنة صامتة مؤجّلة: تستبدل المعرّفات المؤقتة بمعرّفات الخادم الحقيقية
    // دون أي وميض مرئي (الواجهة محدّثة مسبقًا تفاؤليًا). تُجمَّع عمليات متتالية.
    const reconcileTimer = React.useRef(null);
    const reconcile = () => {
      clearTimeout(reconcileTimer.current);
      reconcileTimer.current = setTimeout(() => { reload(); }, 900);
    };

    // طابور كتابة متسلسل: ينفّذ عمليات الخادم بالترتيب نفسه الذي نقر به المستخدم.
    // يضمن أن يُحفظ المقرر (مثلاً) قبل إسناد معلّم له، فلا تقع مخالفة مفتاح أجنبي.
    const writeChain = React.useRef(Promise.resolve());
    const enqueue = (job) => {
      const p = writeChain.current.then(() => job());
      writeChain.current = p.catch(() => {});
      return p;
    };

    // تنفيذ الكتابة في الخلفية (ضمن الطابور)؛ عند الخطأ نُعيد المزامنة لاستعادة الحالة
    const bg = (fn, opts) => enqueue(async () => {
      try {
        const r = await fn();
        if (r && r.error) { alert(friendlyErr(r.error)); reload(); return; }
        if (opts && opts.reconcile) reconcile();
      } catch (e) { alert(friendlyErr(e)); reload(); }
    });

    // إشعار صامت: لا يُنبّه ولا يُعيد المزامنة عند الفشل (الإسناد نفسه هو المهم)
    const notify = (fn) => enqueue(async () => { try { await fn(); } catch (e) { console.warn('notify', e); } });

    // ============================================================
    // مزامنة تلقائية: عند إسناد "مجموعة/فصل" لمعلّم، أو إسناد "مقرر" لمعلّم،
    // يجب أن ينتقل طلاب تلك المجموعة معها فورًا إلى تسجيلات ذلك المقرر —
    // بدل انتظار تسجيلهم فرديًا يدويًا. تُستدعى بعد كلا نوعي الإسناد (بأي ترتيب).
    // تُسجَّل فقط طلاب المجموعة التي تطابق دبلومة/سنة المقرر نفسه.
    // ============================================================
    const syncAutoEnrollments = (snapshotDb, tid) => {
      const X = window.TCX;
      if (!X) return;
      const teacherCourseIds = (snapshotDb.courseTeachers || []).filter((ct) => ct.teacherId === tid).map((ct) => ct.courseId);
      const teacherSectionKeys = (snapshotDb.teacherSections || []).filter((ts) => ts.teacherId === tid).map((ts) => ts.section);
      if (!teacherCourseIds.length || !teacherSectionKeys.length) return;
      const toAdd = [];
      teacherCourseIds.forEach((cid) => {
        const course = (snapshotDb.courses || []).find((c) => c.id === cid);
        if (!course) return;
        const sem = X.semester(course.semester);
        if (!sem) return;
        teacherSectionKeys.forEach((key) => {
          const sec = X.parseSection(key);
          if (!sec || sec.diploma !== course.diploma || sec.year !== sem.year) return;
          (snapshotDb.users || []).filter((u) => u.role === 'student' && u.section === key).forEach((s) => {
            const exists = (snapshotDb.enrollments || []).some((e) => e.courseId === cid && e.studentId === s.accessKey)
              || toAdd.some((e) => e.courseId === cid && e.studentId === s.accessKey);
            if (!exists) toAdd.push({ id: newId(), courseId: cid, studentId: s.accessKey });
          });
        });
      });
      if (!toAdd.length) return;
      patchDb((d) => ({ ...d, enrollments: [...d.enrollments, ...toAdd] }));
      toAdd.forEach((e) => bg(() => TCData.enrollStudent(e.courseId, e.studentId, uid, e.id), { reconcile: true }));
    };

    // تحديث/حذف متفائل: تعديل محلي فوري + كتابة بالخلفية (لا إعادة تحميل عند النجاح)
    const optMut = (patch, write) => (...a) => { patch(...a); bg(() => write(...a)); };

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
      setUser(null); setDb(null); setView('public'); setPublicPage('home'); setDashTab(null);
    };
    const goHome = () => { setView('public'); setPublicPage('home'); };
    const handleRegister = async (form) => {
      try {
        if (window.RegData && form) return await window.RegData.addRequest(form);
      } catch (e) { console.error('register', e); return { ok: false, error: (e && e.message) || String(e) }; }
      return { ok: false, error: 'RegData unavailable' };
    };

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
      addGrade: (studentId, g, by) => {
        const id = newId();
        patchDb((d) => ({ ...d, grades: [...d.grades, { id, studentId, subject: g.subject, score: g.score, maxScore: 100, notes: g.notes || '', createdBy: by || uid, createdAt: new Date().toISOString() }] }));
        bg(() => TCData.addGrade(studentId, g, by || uid, id), { reconcile: true });
      },
      editGrade: optMut(
        (id, g) => patchDb((d) => ({ ...d, grades: d.grades.map((x) => x.id === id ? { ...x, subject: g.subject, score: g.score, notes: g.notes || '' } : x) })),
        (id, g) => TCData.editGrade(id, g)),
      deleteGrade: optMut(
        (id) => patchDb((d) => ({ ...d, grades: d.grades.filter((x) => x.id !== id) })),
        (id) => TCData.deleteGrade(id)),
      assignHomework: (studentId, hw, by) => {
        const id = newId();
        patchDb((d) => ({ ...d, assignments: [...d.assignments, { id, studentId, title: hw.title, description: hw.description || '', dueDate: hw.dueDate || '', assignedBy: by || uid, createdAt: new Date().toISOString() }] }));
        bg(() => TCData.assignHomework(studentId, hw, by || uid, id), { reconcile: true });
      },

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
          teacherSections: (d.teacherSections||[]).filter((x) => x.teacherId !== accessKey),
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
          if (f.diploma !== undefined) next.diploma = f.diploma || null;
          if (f.attendanceGroup !== undefined) next.attendanceGroup = f.attendanceGroup || null;
          if (f.section !== undefined) next.section = f.section || null;
          if (f.academicYear !== undefined) next.academicYear = f.academicYear || null;
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
      addSchedule: (s, by) => {
        const id = newId();
        patchDb((d) => { const cols = s.columns.filter((c) => c.trim()); return { ...d, schedules: [...d.schedules, { id, title: s.name, type: s.type, columns: cols, rows: s.rows.map((r) => r.slice(0, cols.length)), createdBy: by || uid, createdAt: new Date().toISOString() }] }; });
        bg(() => TCData.addSchedule(s, by || uid, id), { reconcile: true });
      },
      deleteSchedule: async (id) => {
        const ok = await window.UI.confirm({ title: lang==='ar'?'حذف الجدول':'Delete schedule', message: lang === 'ar' ? 'هل تريد حذف هذا الجدول؟' : 'Delete this schedule?', confirmText: lang==='ar'?'حذف':'Delete', icon:'trash' });
        if (!ok) return;
        patchDb((d) => ({ ...d, schedules: d.schedules.filter((x) => x.id !== id) }));
        bg(() => TCData.deleteSchedule(id));
      },
      updateSchedule: (id, s) => {
        patchDb((d) => { const cols = s.columns.filter((c) => c.trim()); return { ...d, schedules: d.schedules.map((x) => x.id === id ? { ...x, title: s.name, type: s.type, columns: cols, rows: s.rows.map((r) => r.slice(0, cols.length)) } : x) }; });
        bg(() => TCData.updateSchedule(id, s), { reconcile: true });
      },

      // الإعلانات
      createAnnouncement: (a, by) => {
        const id = newId();
        patchDb((d) => ({ ...d, announcements: [...d.announcements, { id, title: a.title, content: a.content, template: a.template, audience: a.audience || ['students', 'teachers', 'admins'], createdBy: by || uid, createdAt: new Date().toISOString() }] }));
        bg(() => TCData.createAnnouncement(a, by || uid, id), { reconcile: true });
      },
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
      addCourse: (c) => {
        const id = newId();
        patchDb((d) => ({ ...d, courses: [...d.courses, { id, diploma: c.diploma, semester: c.semester, name: c.name, code: c.code, link: c.link || null, notes: c.notes || null, fileData: c.fileData || null, fileName: c.fileName || null, hasFile: !!c.fileName, createdBy: uid, createdAt: new Date().toISOString() }] }));
        bg(() => TCData.addCourse(c, uid, id), { reconcile: true });
      },
      editCourse: optMut(
        (id, c) => patchDb((d) => ({ ...d, courses: d.courses.map((x) => x.id === id ? { ...x, diploma: c.diploma, semester: c.semester, name: c.name, code: c.code, link: c.link || null, notes: c.notes || null, ...(c.keepFile ? {} : { fileData: c.fileData || null, fileName: c.fileName || null, hasFile: !!c.fileName }) } : x) })),
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
      assignCourseTeacher: (cid, tid) => {
        const id = newId();
        patchDb((d) => ({ ...d, courseTeachers: [...d.courseTeachers, { id, courseId: cid, teacherId: tid }] }));
        bg(() => TCData.assignCourseTeacher(cid, tid, uid, id), { reconcile: true });
        const course = db && db.courses.find((c) => c.id === cid);
        notify(() => TCData.notifyUser(tid, (lang === 'ar' ? 'تم إسناد مقرر إليك: ' : 'Course assigned to you: ') + (course ? course.name : ''), uid));
        // مزامنة تلقائية: تسجيل طلاب مجموعات هذا المعلم (الموكلة إليه سلفًا) في المقرر الجديد
        if (db) syncAutoEnrollments({ ...db, courseTeachers: [...db.courseTeachers, { id, courseId: cid, teacherId: tid }] }, tid);
      },
      unassignCourseTeacher: optMut(
        (id) => patchDb((d) => ({ ...d, courseTeachers: d.courseTeachers.filter((x) => x.id !== id) })),
        (id) => TCData.unassignCourseTeacher(id)),
      enrollStudent: (cid, sid) => {
        const id = newId();
        patchDb((d) => ({ ...d, enrollments: [...d.enrollments, { id, courseId: cid, studentId: sid }] }));
        bg(() => TCData.enrollStudent(cid, sid, uid, id), { reconcile: true });
      },
      unenroll: optMut(
        (id) => patchDb((d) => ({ ...d, enrollments: d.enrollments.filter((x) => x.id !== id) })),
        (id) => TCData.unenroll(id)),
      assignTeacherStudent: (tid, sid) => {
        const id = newId();
        patchDb((d) => ({ ...d, teacherStudents: [...d.teacherStudents, { id, teacherId: tid, studentId: sid }] }));
        bg(() => TCData.assignTeacherStudent(tid, sid, uid, id), { reconcile: true });
      },
      // إسناد مجموعة/فصل كامل للمعلم + إشعار في صندوق وارده
      assignSection: (tid, section) => {
        const id = newId();
        patchDb((d) => ({ ...d, teacherSections: [...(d.teacherSections||[]), { id, teacherId: tid, section }] }));
        bg(() => TCData.assignSection(tid, section, uid, id), { reconcile: true });
        const label = window.TCX.sectionLabel(section, lang);
        notify(() => TCData.notifyUser(tid, (lang === 'ar' ? 'تم إسناد مجموعة إليك: ' : 'Section assigned to you: ') + label, uid));
        // مزامنة تلقائية: تسجيل طلاب هذه المجموعة في مقررات هذا المعلم المطابقة لنفس الدبلومة/السنة
        if (db) syncAutoEnrollments({ ...db, teacherSections: [...(db.teacherSections||[]), { id, teacherId: tid, section }] }, tid);
      },
      unassignSection: optMut(
        (id) => patchDb((d) => ({ ...d, teacherSections: (d.teacherSections||[]).filter((x) => x.id !== id) })),
        (id) => TCData.unassignSection(id)),
      unassignTeacherStudent: optMut(
        (id) => patchDb((d) => ({ ...d, teacherStudents: d.teacherStudents.filter((x) => x.id !== id) })),
        (id) => TCData.unassignTeacherStudent(id)),
      setStudentStatus: optMut(
        (sid, status) => patchDb((d) => ({ ...d, users: d.users.map((u) => u.accessKey === sid ? { ...u, status } : u) })),
        (sid, status) => TCData.setStudentStatus(sid, status)),
      saveCourseGrade: (sid, cid, g, status) => {
        const existing = db && db.courseGrades.find((x) => x.studentId === sid && x.courseId === cid);
        const rowId = existing ? existing.id : newId();
        patchDb((d) => {
          const fields = { participation: g.participation || 0, midterm: g.midterm || 0, final: g.final || 0, status: status || 'draft', updatedAt: new Date().toISOString() };
          const has = d.courseGrades.find((x) => x.studentId === sid && x.courseId === cid);
          if (has) return { ...d, courseGrades: d.courseGrades.map((x) => (x.studentId === sid && x.courseId === cid) ? { ...x, ...fields } : x) };
          return { ...d, courseGrades: [...d.courseGrades, { id: rowId, studentId: sid, courseId: cid, ...fields, createdBy: uid, approvedBy: null, createdAt: new Date().toISOString() }] };
        });
        bg(() => TCData.saveCourseGrade(sid, cid, g, uid, status, rowId), { reconcile: true });
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
      const common = { user, lang, setLang, db, actions, onLogout: handleLogout, onHome: goHome, routeTab: dashTab, onTab: setDashTab };
      if (user.role === 'student') return <StudentDashboard {...common} />;
      if (user.role === 'teacher') return <TeacherDashboard {...common} />;
      // حساب الإدارة المخصص للقبول (REG102 — management_section = 'admissions') ← لوحة التسجيل والقبول
      if (user.managementSection === 'admissions') return <RegistrarDashboard {...common} />;
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
