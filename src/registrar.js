/* =========================================================================
   طبقة بيانات التسجيل والقبول — window.RegData  (مدعومة بـ Supabase)
   كل البيانات تُحفظ في قاعدة البيانات فتظهر على جميع الأجهزة.
   • نموذج التسجيل العام (زائر) يُدرج طلبًا عبر العميل المجهول (anon).
   • مسؤول القبول (REG102) يقرأ/يعدّل عبر صلاحيات الإدارة (RLS).
   يتطلب: supabase-js ثم src/supabase.js قبل هذا الملف.
   ========================================================================= */
(function () {
  const sb = window.tamkeenSupabase;
  const REGISTRAR_NAME = { ar: 'إدارة التسجيل والقبول', en: 'Registration & Admissions' };
  const RECORD_BUCKET = 'exam-recordings';
  const now = () => new Date().toISOString();

  // -------- محوّلات الصفوف (snake_case → camelCase الذي تستخدمه الواجهة) --------
  const mapRequest = (r) => ({
    id: r.id,
    full_name: r.full_name, national_id: r.national_id, gender: r.gender,
    nationality: r.nationality, residence: r.residence, phone: r.phone, email: r.email,
    last_qual: r.last_qual, specialization: r.specialization, program: r.program,
    study_days: r.study_days, how_heard: r.how_heard, notes: r.notes,
    birth_place: r.birth_place, birth_y: r.birth_y, birth_m: r.birth_m, birth_d: r.birth_d,
    marital: r.marital, workplace: r.workplace, job_title: r.job_title, provider: r.provider, grad_year: r.grad_year,
    attachments: r.attachments || {},
    status: r.status || 'new',
    appointment: r.appointment,
    examId: r.exam_id,
    examScore: r.exam_score, examMax: r.exam_max,
    resultApproved: !!r.result_approved,
    account: r.account || null,
    history: r.history || [],
    createdAt: r.created_at,
  });
  const mapExam = (e) => ({
    id: e.id, title: e.title, durationMin: e.duration_min, passMark: e.pass_mark,
    questionIds: e.question_ids || [], link: e.link, published: !!e.published,
    createdBy: e.created_by, createdAt: e.created_at,
  });
  const mapQuestion = (q) => ({
    id: q.id, text: q.text, type: q.type, options: q.options || [],
    answer: q.answer, points: q.points, createdAt: q.created_at,
  });
  const mapMessage = (m) => ({
    id: m.id, requestId: m.request_id, channel: m.channel, subject: m.subject, body: m.body, at: m.created_at,
  });
  const mapRecording = (r) => ({
    id: r.id, examId: r.exam_id, examTitle: r.exam_title, studentName: r.student_name,
    phone: r.phone, nationalId: r.national_id, storagePath: r.storage_path,
    durationSec: r.duration_sec, answers: r.answers || [], at: r.created_at,
  });

  // -------- تحميل كل بيانات القسم دفعة واحدة --------
  async function loadAll() {
    const [reqs, exams, qs, msgs, recs] = await Promise.all([
      sb.from('admission_requests').select('*').order('created_at', { ascending: false }),
      sb.from('admission_exams').select('*').order('created_at', { ascending: false }),
      sb.from('admission_questions').select('*').order('created_at', { ascending: false }),
      sb.from('admission_messages').select('*').order('created_at', { ascending: false }),
      sb.from('admission_recordings').select('*').order('created_at', { ascending: false }),
    ]);
    return {
      requests: (reqs.data || []).map(mapRequest),
      exams: (exams.data || []).map(mapExam),
      questions: (qs.data || []).map(mapQuestion),
      messages: (msgs.data || []).map(mapMessage),
      recordings: (recs.data || []).map(mapRecording),
      errors: { reqs: reqs.error, exams: exams.error, qs: qs.error, msgs: msgs.error, recs: recs.error },
    };
  }

  // أداة: تعديل صف طلب مع إلحاق سجل في history
  async function patchRequest(id, patch, historyEntry) {
    if (historyEntry) {
      const { data } = await sb.from('admission_requests').select('history').eq('id', id).single();
      const hist = (data && data.history) || [];
      patch = { ...patch, history: [...hist, { at: now(), ...historyEntry }] };
    }
    const { error } = await sb.from('admission_requests').update(patch).eq('id', id);
    return { error };
  }

  // -------- إدراج طلب جديد (يُستدعى من نموذج التسجيل العام — زائر) --------
  // يتم عبر دالة آمنة (RPC) تتجاوز RLS بأمان — حتى ينجح الإرسال من زائر غير مسجَّل.
  async function addRequest(form) {
    const payload = {
      full_name: form.full_name || '', national_id: form.national_id || '', gender: form.gender || '',
      nationality: form.nationality || '', residence: form.residence || '', phone: form.phone || '', email: form.email || '',
      last_qual: form.last_qual || '', specialization: form.specialization || '', program: form.program || '',
      study_days: form.study_days || '', how_heard: form.how_heard || '', notes: form.notes || '',
      birth_place: form.birth_place || '', birth_y: form.birth_y || '', birth_m: form.birth_m || '', birth_d: form.birth_d || '',
      marital: form.marital || '', workplace: form.workplace || '', job_title: form.job_title || '',
      provider: form.provider || '', grad_year: form.grad_year || '',
      attachments: form.attachments || {},
    };
    const { data, error } = await sb.rpc('submit_admission_request', { p: payload });
    if (error) { console.error('addRequest', error); return { ok: false, error: error.message }; }
    return { ok: true, id: data };
  }

  // -------- عمليات مسؤول القبول --------
  function setStatus(id, status, note) {
    const labelMap = { new:'طلب جديد', review:'قيد المراجعة', accepted:'قبول الطلب', suspended:'تعليق الطلب', rejected:'رفض الطلب', awaiting_exam:'إرسال رابط الاختبار', passed:'نجاح في الاختبار', failed:'رسوب في الاختبار', enrolled:'تحويل إلى طالب' };
    return patchRequest(id, { status }, { action: status, note: note || ('تم تحديث الحالة: ' + (labelMap[status] || status)) });
  }
  function deleteRequest(id) { return sb.from('admission_requests').delete().eq('id', id); }

  async function sendMessage(requestId, { channel, subject, body }) {
    await sb.from('admission_messages').insert({ request_id: requestId || null, channel: channel || 'email', subject: subject || '', body: body || '' });
    if (requestId) {
      await patchRequest(requestId, {}, { action: 'message', note: (subject ? subject + ' — ' : '') + (channel === 'sms' ? 'رسالة نصية' : channel === 'whatsapp' ? 'واتساب' : 'بريد إلكتروني') });
    }
  }
  function setAppointment(id, appointment) {
    return patchRequest(id, { appointment }, { action: 'appointment', note: 'تحديد موعد الحضور: ' + (appointment || '') });
  }
  async function assignExam(id, examId) {
    const { data } = await sb.from('admission_exams').select('title').eq('id', examId).single();
    return patchRequest(id, { exam_id: examId, status: 'awaiting_exam' }, { action: 'awaiting_exam', note: 'تم إرسال رابط اختبار القبول: ' + ((data && data.title) || '') });
  }
  async function recordResult(id, { score, max, examId }) {
    let passMark = 60, eid = examId;
    if (!eid) { const { data } = await sb.from('admission_requests').select('exam_id').eq('id', id).single(); eid = data && data.exam_id; }
    if (eid) { const { data } = await sb.from('admission_exams').select('pass_mark').eq('id', eid).single(); if (data) passMark = data.pass_mark; }
    const pass = score >= (passMark / 100) * max;
    return patchRequest(id, { exam_score: score, exam_max: max, status: pass ? 'passed' : 'failed', result_approved: false }, { action: 'result', note: 'تسجيل النتيجة: ' + score + '/' + max + (pass ? ' — ناجح' : ' — راسب') });
  }
  function approveResult(id) {
    return patchRequest(id, { result_approved: true }, { action: 'approve_result', note: 'اعتماد نتيجة الاختبار' });
  }
  // يُستدعى بعد إنشاء حساب الطالب الحقيقي في Supabase
  function attachAccount(id, account) {
    return patchRequest(id, { account, status: 'enrolled' }, { action: 'enrolled', note: 'تم تحويله إلى حساب طالب رسمي — مفتاح: ' + account.accessKey });
  }

  // -------- الاختبارات وبنك الأسئلة --------
  function randLink() { return 'admission-exam/' + Math.random().toString(36).slice(2, 8); }
  async function addExam(data) {
    const row = { title: data.title || 'اختبار قبول', duration_min: data.durationMin || 45, pass_mark: data.passMark || 60, question_ids: data.questionIds || [], published: false, link: data.link || randLink() };
    return sb.from('admission_exams').insert(row);
  }
  function updateExam(id, patch) {
    const row = {};
    if (patch.title != null) row.title = patch.title;
    if (patch.durationMin != null) row.duration_min = patch.durationMin;
    if (patch.passMark != null) row.pass_mark = patch.passMark;
    if (patch.questionIds != null) row.question_ids = patch.questionIds;
    if (patch.published != null) row.published = patch.published;
    return sb.from('admission_exams').update(row).eq('id', id);
  }
  function deleteExam(id) { return sb.from('admission_exams').delete().eq('id', id); }

  function addQuestion(data) {
    return sb.from('admission_questions').insert({ text: data.text || '', type: data.type || 'mcq', options: data.options || [], answer: data.answer == null ? null : data.answer, points: data.points || 5 });
  }
  function updateQuestion(id, patch) {
    const row = {};
    if (patch.text != null) row.text = patch.text;
    if (patch.type != null) row.type = patch.type;
    if (patch.options != null) row.options = patch.options;
    if (patch.answer !== undefined) row.answer = patch.answer;
    if (patch.points != null) row.points = patch.points;
    return sb.from('admission_questions').update(row).eq('id', id);
  }
  function deleteQuestion(id) { return sb.from('admission_questions').delete().eq('id', id); }

  // -------- الفيديوهات المسجلة --------
  async function recordingUrl(storagePath) {
    if (!storagePath) return null;
    const { data } = await sb.storage.from(RECORD_BUCKET).createSignedUrl(storagePath, 3600);
    return data ? data.signedUrl : null;
  }
  async function deleteRecording(id, storagePath) {
    if (storagePath) await sb.storage.from(RECORD_BUCKET).remove([storagePath]);
    return sb.from('admission_recordings').delete().eq('id', id);
  }

  window.RegData = {
    REGISTRAR_NAME, RECORD_BUCKET,
    loadAll, addRequest,
    setStatus, deleteRequest, sendMessage, setAppointment, assignExam, recordResult, approveResult, attachAccount,
    addExam, updateExam, deleteExam, addQuestion, updateQuestion, deleteQuestion,
    recordingUrl, deleteRecording,
  };
})();
