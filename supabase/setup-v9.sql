-- =========================================================================
--  مركز تمكين — إضافة v9  (التسجيل والقبول + الاختبارات + تسجيل الشاشة)
--  شغّله مرة واحدة:  Supabase → SQL Editor → New query → Run.
--  آمن لإعادة التشغيل.  يفترض أنك شغّلت setup.sql أولًا.  يُغني عن setup-v8.sql.
--
--  ماذا يفعل؟
--   • ينقل بيانات التسجيل والقبول إلى قاعدة البيانات (تظهر على كل الأجهزة).
--   • يسمح لزائر الموقع (غير المسجَّل) بإرسال طلب تسجيل.
--   • يسمح لمن يفتح رابط الاختبار (غير المسجَّل) بقراءة الاختبار ورفع فيديو الشاشة.
--   • ينشئ حساب «مسؤول التسجيل والقبول»: المفتاح REG102 وكلمة المرور 1234.
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1) الجداول
-- ---------------------------------------------------------------------

-- بنك الأسئلة
create table if not exists public.admission_questions (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  type        text not null default 'mcq',     -- mcq | text
  options     jsonb default '[]',
  answer      int,                              -- فهرس الإجابة الصحيحة (mcq)
  points      int default 5,
  created_by  text,
  created_at  timestamptz not null default now()
);

-- اختبارات القبول
create table if not exists public.admission_exams (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  duration_min  int default 45,
  pass_mark     int default 60,
  question_ids  uuid[] default '{}',
  link          text unique not null,
  published     boolean default false,
  created_by    text,
  created_at    timestamptz not null default now()
);

-- طلبات التسجيل (تشمل المرفقات بصيغة jsonb)
create table if not exists public.admission_requests (
  id              uuid primary key default gen_random_uuid(),
  full_name       text,
  national_id     text,
  gender          text,
  nationality     text,
  residence       text,
  phone           text,
  email           text,
  last_qual       text,
  specialization  text,
  program         text,
  study_days      text,
  how_heard       text,
  notes           text,
  birth_place     text, birth_y text, birth_m text, birth_d text,
  marital         text, workplace text, job_title text, provider text, grad_year text,
  attachments     jsonb default '{}',
  status          text default 'new',
  appointment     text,
  exam_id         uuid,
  exam_score      numeric,
  exam_max        numeric,
  result_approved boolean default false,
  account         jsonb,
  history         jsonb default '[]',
  created_at      timestamptz not null default now()
);

-- الرسائل والإشعارات المرسلة للمتقدّمين
create table if not exists public.admission_messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid,
  channel     text default 'email',
  subject     text,
  body        text,
  created_at  timestamptz not null default now()
);

-- الفيديوهات المسجلة لجلسات الاختبار (تسجيل الشاشة)
create table if not exists public.admission_recordings (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid,
  exam_title    text,
  student_name  text,
  phone         text,
  national_id   text,
  storage_path  text,
  duration_sec  int,
  answers       jsonb default '[]',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) تفعيل RLS
-- ---------------------------------------------------------------------
alter table public.admission_questions  enable row level security;
alter table public.admission_exams      enable row level security;
alter table public.admission_requests   enable row level security;
alter table public.admission_messages   enable row level security;
alter table public.admission_recordings enable row level security;

-- بنك الأسئلة: الإدارة فقط (الزائر يقرأ الاختبار عبر دالة آمنة تُخفي الإجابات)
drop policy if exists aq_staff on public.admission_questions;
create policy aq_staff on public.admission_questions for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- الاختبارات: الإدارة تتحكم بالكل، والمنشور يُقرأ من الجميع (للتحقق من الرابط)
drop policy if exists ae_select on public.admission_exams;
create policy ae_select on public.admission_exams for select to anon, authenticated
  using ( published or public.is_staff() );
drop policy if exists ae_write on public.admission_exams;
create policy ae_write on public.admission_exams for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- طلبات التسجيل: أي زائر يُرسل طلبًا، والإدارة تقرأ/تعدّل/تحذف
drop policy if exists ar_insert on public.admission_requests;
create policy ar_insert on public.admission_requests for insert to anon, authenticated
  with check ( true );
drop policy if exists ar_select on public.admission_requests;
create policy ar_select on public.admission_requests for select to authenticated
  using ( public.is_staff() );
drop policy if exists ar_update on public.admission_requests;
create policy ar_update on public.admission_requests for update to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );
drop policy if exists ar_delete on public.admission_requests;
create policy ar_delete on public.admission_requests for delete to authenticated
  using ( public.is_staff() );

-- الرسائل: الإدارة فقط
drop policy if exists am_all on public.admission_messages;
create policy am_all on public.admission_messages for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- الفيديوهات: الطالب (زائر) يُنشئ صفًّا بعد الرفع، والإدارة تقرأ/تحذف
drop policy if exists arec_insert on public.admission_recordings;
create policy arec_insert on public.admission_recordings for insert to anon, authenticated
  with check ( true );
drop policy if exists arec_select on public.admission_recordings;
create policy arec_select on public.admission_recordings for select to authenticated
  using ( public.is_staff() );
drop policy if exists arec_delete on public.admission_recordings;
create policy arec_delete on public.admission_recordings for delete to authenticated
  using ( public.is_staff() );

-- ---------------------------------------------------------------------
-- 3) دالة آمنة: جلب اختبار منشور بالرابط (بدون كشف الإجابات الصحيحة)
-- ---------------------------------------------------------------------
create or replace function public.get_admission_exam(p_link text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ex public.admission_exams; qs jsonb;
begin
  select * into ex from public.admission_exams where link = p_link and published = true;
  if ex.id is null then return null; end if;
  select coalesce(jsonb_agg(
           jsonb_build_object('id', q.id, 'text', q.text, 'type', q.type, 'options', q.options, 'points', q.points)
           order by arr.ord), '[]')
    into qs
    from unnest(ex.question_ids) with ordinality as arr(qid, ord)
    join public.admission_questions q on q.id = arr.qid;
  return jsonb_build_object(
    'id', ex.id, 'title', ex.title, 'durationMin', ex.duration_min,
    'passMark', ex.pass_mark, 'questions', qs);
end; $$;
grant execute on function public.get_admission_exam(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) مخزن فيديوهات الاختبار (الزائر يرفع، الإدارة تقرأ)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('exam-recordings', 'exam-recordings', false)
on conflict (id) do nothing;

drop policy if exists exrec_insert on storage.objects;
create policy exrec_insert on storage.objects for insert to anon, authenticated
  with check ( bucket_id = 'exam-recordings' );
drop policy if exists exrec_select on storage.objects;
create policy exrec_select on storage.objects for select to authenticated
  using ( bucket_id = 'exam-recordings' and public.is_staff() );
drop policy if exists exrec_delete on storage.objects;
create policy exrec_delete on storage.objects for delete to authenticated
  using ( bucket_id = 'exam-recordings' and public.is_staff() );

-- ---------------------------------------------------------------------
-- 5) حساب مسؤول التسجيل والقبول  (REG102 / 1234)
--    القسم admissions → يوجّه إلى «لوحة التسجيل والقبول».
-- ---------------------------------------------------------------------
select public.seed_user('REG102','1234','management','إدارة التسجيل والقبول','admissions');

-- =====================================================================
--  تم. سجّل الخروج ثم ادخل من بوابة «إداري» بالمفتاح REG102 وكلمة المرور 1234.
-- =====================================================================
