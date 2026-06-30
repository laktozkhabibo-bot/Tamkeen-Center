-- =========================================================================
--  مركز تمكين — إصلاح v10  (إرسال طلب التسجيل / تسجيل الاختبار من زائر)
--  شغّله مرة واحدة بعد setup-v9.sql:  Supabase → SQL Editor → New query → Run.
--  آمن لإعادة التشغيل.
--
--  المشكلة التي يصلحها:
--    «new row violates row-level security policy for table admission_requests»
--  السبب: إدراج الزائر (anon) ثم إعادة قراءة الصف يتطلب صلاحية قراءة لا يملكها.
--  الحل: الإدراج عبر دالة آمنة (security definer) تتجاوز RLS بأمان وتُعيد المعرّف فقط.
-- =========================================================================

-- (إعادة تأكيد سياسات الإدراج للاحتياط)
drop policy if exists ar_insert on public.admission_requests;
create policy ar_insert on public.admission_requests for insert to anon, authenticated with check ( true );
drop policy if exists arec_insert on public.admission_recordings;
create policy arec_insert on public.admission_recordings for insert to anon, authenticated with check ( true );

-- ---------------------------------------------------------------------
-- 1) إرسال طلب تسجيل جديد (من نموذج الموقع — زائر)
-- ---------------------------------------------------------------------
create or replace function public.submit_admission_request(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.admission_requests (
    full_name, national_id, gender, nationality, residence, phone, email,
    last_qual, specialization, program, study_days, how_heard, notes,
    birth_place, birth_y, birth_m, birth_d, marital, workplace, job_title, provider, grad_year,
    attachments, status, history
  ) values (
    p->>'full_name', p->>'national_id', p->>'gender', p->>'nationality', p->>'residence', p->>'phone', p->>'email',
    p->>'last_qual', p->>'specialization', p->>'program', p->>'study_days', p->>'how_heard', p->>'notes',
    p->>'birth_place', p->>'birth_y', p->>'birth_m', p->>'birth_d', p->>'marital', p->>'workplace', p->>'job_title', p->>'provider', p->>'grad_year',
    coalesce(p->'attachments', '{}'::jsonb), 'new',
    jsonb_build_array(jsonb_build_object('at', now(), 'action', 'submitted', 'note', 'استُلم الطلب من نموذج التسجيل'))
  ) returning id into new_id;
  return new_id;
end; $$;
grant execute on function public.submit_admission_request(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) حفظ تسجيل جلسة اختبار (من صفحة الاختبار — زائر)
-- ---------------------------------------------------------------------
create or replace function public.submit_admission_recording(
  p_exam_id uuid, p_exam_title text, p_student_name text, p_phone text,
  p_national_id text, p_storage_path text, p_duration_sec int, p_answers jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.admission_recordings (exam_id, exam_title, student_name, phone, national_id, storage_path, duration_sec, answers)
  values (p_exam_id, p_exam_title, p_student_name, p_phone, p_national_id, p_storage_path, p_duration_sec, coalesce(p_answers, '[]'::jsonb))
  returning id into new_id;
  return new_id;
end; $$;
grant execute on function public.submit_admission_recording(uuid, text, text, text, text, text, int, jsonb) to anon, authenticated;

-- =====================================================================
--  تم. جرّب إرسال طلب تسجيل من الموقع — يجب أن ينجح ويظهر في لوحة القبول.
-- =====================================================================
