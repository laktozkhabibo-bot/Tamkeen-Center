/* =========================================================================
   طبقة بيانات التسجيل والقبول — window.RegData
   تدير طلبات التسجيل والاختبارات والنتائج والرسائل، وتُخزَّن محليًا في المتصفح.
   ملاحظة: تحويل المقبول إلى طالب رسمي يتم عبر حساب Supabase (في registrar.jsx)
   لأن مسؤول القبول (REG102) أصبح حسابًا إداريًا حقيقيًا.
   ========================================================================= */
(function () {
  const KEY = 'tamkeen_admissions_v2';   // نسخة جديدة → بداية نظيفة (بدون بيانات تجريبية)

  // أسماء العرض لمسؤول التسجيل والقبول (REG102)
  const REGISTRAR_NAME = { ar: 'إدارة التسجيل والقبول', en: 'Registration & Admissions' };

  const uid = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = () => new Date().toISOString();

  // بداية نظيفة تمامًا — لا طلبات ولا اختبارات ولا أسئلة
  function emptyDB() { return { requests: [], questions: [], exams: [], messages: [] }; }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.requests)) return { requests:d.requests||[], questions:d.questions||[], exams:d.exams||[], messages:d.messages||[] };
      }
    } catch (e) { /* ignore */ }
    const s = emptyDB();
    save(s);
    return s;
  }
  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { console.warn('reg save (قد يكون التخزين ممتلئًا)', e); return false; }
  }

  function getDB() { return load(); }

  // ---------------- العمليات ----------------
  // إضافة طلب جديد من نموذج التسجيل العام (يشمل المرفقات إن وُجدت)
  function addRequest(form) {
    const db = load();
    const rec = {
      id: uid(),
      ...form,
      attachments: form.attachments || {},
      status: 'new',
      appointment: null,
      examId: null,
      examScore: null,
      examMax: null,
      resultApproved: false,
      account: null,
      createdAt: now(),
      history: [{ at: now(), action: 'submitted', note: 'استُلم الطلب من نموذج التسجيل' }],
    };
    db.requests.unshift(rec);
    const ok = save(db);
    return { rec, ok };
  }

  function updateRequest(id, patch, historyEntry) {
    const db = load();
    const r = db.requests.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, patch);
    if (historyEntry) r.history = [...(r.history || []), { at: now(), ...historyEntry }];
    save(db);
    return { ...r };
  }

  function setStatus(id, status, note) {
    const labelMap = { new:'طلب جديد', review:'قيد المراجعة', accepted:'قبول الطلب', suspended:'تعليق الطلب', rejected:'رفض الطلب', awaiting_exam:'إرسال رابط الاختبار', passed:'نجاح في الاختبار', failed:'رسوب في الاختبار', enrolled:'تحويل إلى طالب' };
    return updateRequest(id, { status }, { action: status, note: note || ('تم تحديث الحالة: ' + (labelMap[status] || status)) });
  }

  function deleteRequest(id) {
    const db = load();
    db.requests = db.requests.filter((x) => x.id !== id);
    save(db);
  }

  function sendMessage(requestId, { channel, subject, body }) {
    const db = load();
    const msg = { id: uid(), requestId: requestId || null, channel: channel || 'email', subject: subject || '', body: body || '', at: now() };
    db.messages.unshift(msg);
    const r = requestId && db.requests.find((x) => x.id === requestId);
    if (r) r.history = [...(r.history || []), { at: now(), action: 'message', note: (subject ? subject + ' — ' : '') + (channel === 'sms' ? 'رسالة نصية' : channel === 'whatsapp' ? 'واتساب' : 'بريد إلكتروني') }];
    save(db);
    return msg;
  }

  function setAppointment(id, appointment) {
    return updateRequest(id, { appointment }, { action: 'appointment', note: 'تحديد موعد الحضور: ' + (appointment || '') });
  }

  function assignExam(id, examId) {
    const db = load();
    const exam = db.exams.find((e) => e.id === examId);
    return updateRequest(id, { examId, status: 'awaiting_exam' }, { action: 'awaiting_exam', note: 'تم إرسال رابط اختبار القبول: ' + (exam ? exam.title : '') });
  }

  function recordResult(id, { score, max, examId }) {
    const db = load();
    const r = db.requests.find((x) => x.id === id);
    const exam = db.exams.find((e) => e.id === (examId || (r && r.examId)));
    const pass = exam ? (score >= (exam.passMark / 100) * max) : (score >= max * 0.6);
    return updateRequest(id, { examScore: score, examMax: max, status: pass ? 'passed' : 'failed', resultApproved: false }, { action: 'result', note: 'تسجيل النتيجة: ' + score + '/' + max + (pass ? ' — ناجح' : ' — راسب') });
  }
  function approveResult(id) {
    return updateRequest(id, { resultApproved: true }, { action: 'approve_result', note: 'اعتماد نتيجة الاختبار' });
  }

  // يُستدعى بعد إنشاء حساب الطالب الحقيقي في Supabase — يخزّن البيانات على الطلب
  function attachAccount(id, account) {
    return updateRequest(id, { account, status: 'enrolled' }, { action: 'enrolled', note: 'تم تحويله إلى حساب طالب رسمي — مفتاح: ' + account.accessKey });
  }

  // ------- الاختبارات وبنك الأسئلة -------
  function addExam(data) {
    const db = load();
    const e = { id: uid(), title: data.title || 'اختبار قبول', durationMin: data.durationMin || 45, passMark: data.passMark || 60, questionIds: data.questionIds || [], published: false, link: data.link || ('admission-exam/' + uid().slice(0, 6)), createdAt: now() };
    db.exams.unshift(e);
    save(db);
    return e;
  }
  function updateExam(id, patch) {
    const db = load();
    const e = db.exams.find((x) => x.id === id);
    if (e) { Object.assign(e, patch); save(db); }
    return e ? { ...e } : null;
  }
  function deleteExam(id) {
    const db = load();
    db.exams = db.exams.filter((x) => x.id !== id);
    save(db);
  }
  function addQuestion(data) {
    const db = load();
    const q = { id: uid(), text: data.text || '', type: data.type || 'mcq', options: data.options || [], answer: data.answer, points: data.points || 5 };
    db.questions.unshift(q);
    save(db);
    return q;
  }
  function updateQuestion(id, patch) {
    const db = load();
    const q = db.questions.find((x) => x.id === id);
    if (q) { Object.assign(q, patch); save(db); }
    return q ? { ...q } : null;
  }
  function deleteQuestion(id) {
    const db = load();
    db.questions = db.questions.filter((x) => x.id !== id);
    db.exams.forEach((e) => { e.questionIds = (e.questionIds || []).filter((qid) => qid !== id); });
    save(db);
  }

  window.RegData = {
    REGISTRAR_NAME,
    getDB, addRequest, updateRequest, setStatus, deleteRequest,
    sendMessage, setAppointment, assignExam, recordResult, approveResult, attachAccount,
    addExam, updateExam, deleteExam, addQuestion, updateQuestion, deleteQuestion,
  };
})();
