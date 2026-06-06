/* =========================================================================
   طبقة البيانات — window.TCData
   تربط الواجهة بـ Supabase (مصادقة + قراءة + كتابة + تخزين الملفات).
   تحوّل أسماء الأعمدة (snake_case) إلى شكل الواجهة (camelCase) دون تغيير المكوّنات.
   يتطلب تحميل: supabase-js ثم src/supabase.js قبل هذا الملف.
   ========================================================================= */
(function () {
  const sb = window.tamkeenSupabase;
  const keyToEmail = window.tamkeenKeyToEmail;
  const BUCKET = 'cloud';

  // -------- محوّلات الصفوف --------
  const mapProfile = (p) => ({
    accessKey: p.access_key, name: p.name, role: p.role,
    managementSection: p.management_section, specializations: p.specializations || [],
    academicYear: p.academic_year, phone: p.phone, email: p.email, img: p.img_url, password: '',
    status: p.status || 'regular', diploma: p.diploma || null,
    attendanceGroup: p.attendance_group || null, createdAt: p.created_at,
  });
  const mapCourse = (c) => ({
    id: c.id, diploma: c.diploma, semester: c.semester, name: c.name, code: c.code,
    link: c.link, notes: c.notes, fileData: c.file_data, fileName: c.file_name,
    createdBy: c.created_by, createdAt: c.created_at,
  });
  const mapCourseTeacher = (r) => ({ id: r.id, courseId: r.course_id, teacherId: r.teacher_id });
  const mapEnrollment = (r) => ({ id: r.id, courseId: r.course_id, studentId: r.student_id });
  const mapTeacherStudent = (r) => ({ id: r.id, teacherId: r.teacher_id, studentId: r.student_id });
  const mapCourseGrade = (g) => ({
    id: g.id, studentId: g.student_id, courseId: g.course_id,
    participation: g.participation, midterm: g.midterm, final: g.final,
    status: g.status, createdBy: g.created_by, approvedBy: g.approved_by,
    createdAt: g.created_at, updatedAt: g.updated_at,
  });
  const mapDelegation = (d) => ({
    id: d.id, teacherId: d.teacher_id, type: d.type, title: d.title, description: d.description,
    subjectName: d.subject_name, className: d.class_name, studentIds: d.student_ids || [],
    status: d.status, assignedBy: d.assigned_by, assignedAt: d.assigned_at,
  });
  const mapGrade = (g) => ({
    id: g.id, studentId: g.student_id, subject: g.subject, score: g.score,
    maxScore: g.max_score, notes: g.notes, createdBy: g.created_by, createdAt: g.created_at,
  });
  const mapAssignment = (a) => ({
    id: a.id, studentId: a.student_id, title: a.title, description: a.description,
    dueDate: a.due_date, assignedBy: a.assigned_by, createdAt: a.created_at,
  });
  const mapSchedule = (s) => ({
    id: s.id, title: s.title, type: s.type, columns: s.columns || [], rows: s.rows || [],
    createdBy: s.created_by, createdAt: s.created_at,
  });
  const mapAnnouncement = (a) => ({
    id: a.id, title: a.title, content: a.content, template: a.template,
    audience: a.audience || [], createdBy: a.created_by, createdAt: a.created_at,
  });
  const mapShared = (s) => ({
    id: s.id, fromUserId: s.from_user_id, toUserId: s.to_user_id, itemName: s.item_name,
    itemType: s.item_type, fileSize: s.file_size, fileUrl: s.file_url,
    scheduleData: s.schedule_data, isRead: s.is_read ? 1 : 0, createdAt: s.created_at,
  });
  const mapCloud = (c) => ({
    id: c.id, ownerId: c.owner_id, name: c.name, type: c.type, fileName: c.file_name,
    fileSize: c.file_size, storagePath: c.storage_path, createdAt: c.created_at,
  });

  // -------- مصادقة --------
  async function signIn(accessKey, password) {
    const { error } = await sb.auth.signInWithPassword({ email: keyToEmail(accessKey), password });
    if (error) return { error: error.message };
    return { ok: true };
  }
  async function signOut() { await sb.auth.signOut(); }

  async function getSessionUser() {
    const { data } = await sb.auth.getUser();
    if (!data || !data.user) return null;
    const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
    return profile ? mapProfile(profile) : null;
  }
  function onAuthChange(cb) { return sb.auth.onAuthStateChange((_e, session) => cb(session)); }

  // -------- تحميل كل البيانات المرئية (حسب RLS) --------
  async function loadDB() {
    const [profiles, dels, grades, assigns, beh, scheds, anns, shared, cloud,
           settings, courses, cTeachers, enrolls, tStudents, cGrades] = await Promise.all([
      sb.from('profiles').select('*').order('created_at'),
      sb.from('delegations').select('*'),
      sb.from('grades').select('*').order('created_at'),
      sb.from('assignments').select('*'),
      sb.from('behavior_scores').select('*'),
      sb.from('schedules').select('*').order('created_at'),
      sb.from('announcements').select('*'),
      sb.from('shared_items').select('*'),
      sb.from('cloud_items').select('*').order('created_at'),
      // ---- المنهج والمقررات (قد لا تكون موجودة قبل تشغيل setup-v2.sql) ----
      sb.from('app_settings').select('*'),
      sb.from('courses').select('*').order('code'),
      sb.from('course_teachers').select('*'),
      sb.from('enrollments').select('*'),
      sb.from('teacher_students').select('*'),
      sb.from('course_grades').select('*'),
    ]);
    const behaviorScores = {};
    (beh.data || []).forEach((b) => { behaviorScores[b.student_id] = b.score; });
    const appSettings = {};
    (settings.data || []).forEach((s) => { appSettings[s.key] = s.value; });
    return {
      users: (profiles.data || []).map(mapProfile),
      delegations: (dels.data || []).map(mapDelegation),
      grades: (grades.data || []).map(mapGrade),
      assignments: (assigns.data || []).map(mapAssignment),
      behaviorScores,
      schedules: (scheds.data || []).map(mapSchedule),
      announcements: (anns.data || []).map(mapAnnouncement),
      sharedItems: (shared.data || []).map(mapShared),
      cloudItems: (cloud.data || []).map(mapCloud),
      settings: appSettings,
      courses: (courses.data || []).map(mapCourse),
      courseTeachers: (cTeachers.data || []).map(mapCourseTeacher),
      enrollments: (enrolls.data || []).map(mapEnrollment),
      teacherStudents: (tStudents.data || []).map(mapTeacherStudent),
      courseGrades: (cGrades.data || []).map(mapCourseGrade),
    };
  }

  // -------- التخزين (نظام السحابة) --------
  async function uploadCloudFile(ownerId, file) {
    const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_');
    const path = `${ownerId}/${Date.now()}-${safe}`;
    const up = await sb.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (up.error) throw up.error;
    const size = `${(file.size / 1024).toFixed(1)} KB`;
    const ins = await sb.from('cloud_items').insert({
      owner_id: ownerId, name: file.name, type: 'file', file_name: file.name, file_size: size, storage_path: path,
    });
    if (ins.error) throw ins.error;
  }
  async function removeCloudItem(id, storagePath) {
    if (storagePath) await sb.storage.from(BUCKET).remove([storagePath]);
    await sb.from('cloud_items').delete().eq('id', id);
  }
  async function clearCloud(ownerId) {
    const { data } = await sb.from('cloud_items').select('storage_path').eq('owner_id', ownerId);
    const paths = (data || []).map((x) => x.storage_path).filter(Boolean);
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    await sb.from('cloud_items').delete().eq('owner_id', ownerId);
  }
  async function getDownloadUrl(storagePath) {
    if (!storagePath) return null;
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, 120);
    return data ? data.signedUrl : null;
  }

  // -------- عمليات الكتابة (مرآة لـ actions القديمة) --------
  const ops = {
    markRead: (id) => sb.from('shared_items').update({ is_read: true }).eq('id', id),
    deleteSharedItem: (id) => sb.from('shared_items').delete().eq('id', id),
    deleteAssignment: (id) => sb.from('assignments').delete().eq('id', id),

    addGrade: (studentId, g, by) => sb.from('grades').insert({
      student_id: studentId, subject: g.subject, score: g.score, max_score: 100, notes: g.notes || '', created_by: by,
    }),
    editGrade: (id, g) => sb.from('grades').update({ subject: g.subject, score: g.score, notes: g.notes || '' }).eq('id', id),
    deleteGrade: (id) => sb.from('grades').delete().eq('id', id),

    assignHomework: (studentId, hw, by) => sb.from('assignments').insert({
      student_id: studentId, title: hw.title, description: hw.description || '', due_date: hw.dueDate || '', assigned_by: by,
    }),
    updateBehavior: (studentId, score, by) => sb.from('behavior_scores').upsert({
      student_id: studentId, score: Math.max(0, Math.min(100, score)), updated_by: by || null, updated_at: new Date().toISOString(),
    }),

    addDelegation: (row) => sb.from('delegations').insert(row),
    removeDelegation: (id) => sb.from('delegations').delete().eq('id', id),

    addSchedule: (s, by) => {
      const cols = s.columns.filter((c) => c.trim());
      return sb.from('schedules').insert({
        title: s.name, type: s.type, columns: cols, rows: s.rows.map((r) => r.slice(0, cols.length)), created_by: by,
      });
    },
    deleteSchedule: (id) => sb.from('schedules').delete().eq('id', id),

    createAnnouncement: (a, by) => sb.from('announcements').insert({
      title: a.title, content: a.content, template: a.template,
      audience: a.audience || ['students', 'teachers', 'admins'], created_by: by,
    }),
    deleteAnnouncement: (id) => sb.from('announcements').delete().eq('id', id),

    shareItems: (items, recipientIds, by) => {
      const rows = [];
      items.forEach((it) => recipientIds.forEach((rid) => rows.push({
        from_user_id: by, to_user_id: rid, item_name: it.name, item_type: it.type,
        file_size: it.fileSize || null, file_url: null, schedule_data: it.scheduleData || null, is_read: false,
      })));
      return sb.from('shared_items').insert(rows);
    },

    // ---- المنهج والمقررات والدرجات (التحديث الكبير) ----
    setSetting: (key, value, by) => sb.from('app_settings').upsert(
      { key, value, updated_by: by || null, updated_at: new Date().toISOString() }, { onConflict: 'key' }),

    // ---- المستخدمون (عبر RPC خادمي يتحقق من صلاحية الإدارة) ----
    addUser: (role, f) => sb.rpc('admin_create_user', {
      p_key: (f.accessKey || '').toUpperCase(), p_password: f.password, p_role: role, p_name: f.name,
      p_specs: (f.specializations && f.specializations.length) ? f.specializations : null,
      p_year: f.academicYear || null, p_phone: f.phone || null, p_email: f.email || null,
      p_img: f.img || null, p_diploma: f.diploma || null,
      p_attendance: f.attendanceGroup || null, p_section: f.managementSection || null,
    }),
    deleteUser: (accessKey) => sb.rpc('admin_delete_user', { p_key: accessKey }),
    // تعديل بيانات مستخدم (الاسم/الهاتف/البريد/التخصصات/الصورة) — الإدارة فقط عبر RLS
    editUser: (accessKey, f) => {
      const patch = {};
      if (f.name != null) patch.name = f.name;
      if (f.phone !== undefined) patch.phone = f.phone || null;
      if (f.email !== undefined) patch.email = f.email || null;
      if (f.specializations !== undefined) patch.specializations = (f.specializations && f.specializations.length) ? f.specializations : null;
      if (f.img !== undefined) patch.img_url = f.img || null;
      return sb.from('profiles').update(patch).eq('access_key', accessKey);
    },
    setUserImage: (accessKey, img) => sb.from('profiles').update({ img_url: img }).eq('access_key', accessKey),

    addCourse: (c, by) => sb.from('courses').insert({
      diploma: c.diploma, semester: c.semester, name: c.name, code: c.code,
      link: c.link || null, notes: c.notes || null,
      file_data: c.fileData || null, file_name: c.fileName || null, created_by: by }),
    editCourse: (id, c) => sb.from('courses').update({
      diploma: c.diploma, semester: c.semester, name: c.name, code: c.code,
      link: c.link || null, notes: c.notes || null,
      file_data: c.fileData || null, file_name: c.fileName || null }).eq('id', id),
    deleteCourse: (id) => sb.from('courses').delete().eq('id', id),

    assignCourseTeacher: (courseId, teacherId, by) => sb.from('course_teachers').insert({
      course_id: courseId, teacher_id: teacherId, created_by: by || null }),
    unassignCourseTeacher: (id) => sb.from('course_teachers').delete().eq('id', id),

    enrollStudent: (courseId, studentId, by) => sb.from('enrollments').insert({
      course_id: courseId, student_id: studentId, created_by: by || null }),
    unenroll: (id) => sb.from('enrollments').delete().eq('id', id),

    assignTeacherStudent: (teacherId, studentId, by) => sb.from('teacher_students').insert({
      teacher_id: teacherId, student_id: studentId, created_by: by || null }),
    unassignTeacherStudent: (id) => sb.from('teacher_students').delete().eq('id', id),

    setStudentStatus: (studentId, status) => sb.from('profiles').update({ status }).eq('access_key', studentId),

    // المعلم يحفظ/يؤكد درجة (upsert على student_id+course_id)
    saveCourseGrade: (studentId, courseId, g, by, status) => sb.from('course_grades').upsert({
      student_id: studentId, course_id: courseId,
      participation: g.participation || 0, midterm: g.midterm || 0, final: g.final || 0,
      status: status || 'draft', created_by: by || null, updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,course_id' }),
    // الإدارة تعتمد درجة (عبر المعرّف)
    approveCourseGrade: (id, by) => sb.from('course_grades').update({
      status: 'approved', approved_by: by || null, updated_at: new Date().toISOString() }).eq('id', id),
    // إعادة درجة معتمدة/مؤكدة إلى مسودة (الإدارة)
    revertCourseGrade: (id) => sb.from('course_grades').update({
      status: 'draft', approved_by: null, updated_at: new Date().toISOString() }).eq('id', id),
  };

  window.TCData = {
    signIn, signOut, getSessionUser, onAuthChange, loadDB,
    uploadCloudFile, removeCloudItem, clearCloud, getDownloadUrl,
    ...ops,
  };
})();
