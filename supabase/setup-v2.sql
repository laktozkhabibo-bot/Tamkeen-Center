-- =====================================================================
--  منظومة مركز تمكين — التحديث الكبير (المرحلة الثانية: المنهج والمقررات والدرجات)
--  شغّل هذا الملف كاملاً مرة واحدة في:  Supabase → SQL Editor → New query → Run
--  ⚠️ يفترض أنك شغّلت supabase/setup.sql من قبل (جداول الأساس + دالة seed_user موجودة).
--  آمن لإعادة التشغيل (idempotent قدر الإمكان).
--
--  يضيف:
--   • أعمدة الحالة (منتظم/منقطع/معلق) والدبلومة على الطلاب
--   • إعدادات المنظومة (الفصل الحالي)
--   • المقررات + إسنادها للمعلمين + تسجيل الطلاب فيها
--   • توكيل الطلاب للمعلمين
--   • الدرجات ثلاثية المكوّن (مشاركة/نصفي/نهائي) مع سير الاعتماد
--   • بذر: مدير + إداري واحد + 5 معلمين + 60 طالبًا + مقررات + درجات تجريبية
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 0) تنظيف: إبقاء إداري واحد فقط (نحذف K101 إن وُجد)
-- ---------------------------------------------------------------------
delete from auth.users where email = 'k101@tamkeen.local';

-- ---------------------------------------------------------------------
-- 1) توسعة جدول الطلاب/المستخدمين
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists status  text not null default 'regular'
  check (status in ('regular','suspended','withdrawn'));
alter table public.profiles add column if not exists diploma text;  -- 'sunnah' | 'arabic' (للطلاب)

-- ---------------------------------------------------------------------
-- 2) إعدادات المنظومة (الفصل الحالي وغيره)
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      text,
  updated_by text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values ('current_semester','y1s1')
  on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 3) المقررات (يضيفها المدير/شؤون الطلاب)
--    diploma: sunnah|arabic   |   semester: y1s1|y1s2|y2s1|y2s2
-- ---------------------------------------------------------------------
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  diploma     text not null,
  semester    text not null,
  name        text not null,
  code        text not null,
  link        text,                 -- رابط/اسم ملف المقرر (اختياري)
  notes       text,
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (code)
);

-- إسناد المقرر لمعلم (مادة موكلة للتدريس)
create table if not exists public.course_teachers (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references public.courses(id) on delete cascade,
  teacher_id  text references public.profiles(access_key) on delete cascade,
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (course_id, teacher_id)
);

-- تسجيل الطالب في مقرر
create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references public.courses(id) on delete cascade,
  student_id  text references public.profiles(access_key) on delete cascade,
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (course_id, student_id)
);

-- توكيل الطالب لمعلم
create table if not exists public.teacher_students (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  text references public.profiles(access_key) on delete cascade,
  student_id  text references public.profiles(access_key) on delete cascade,
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (teacher_id, student_id)
);

-- ---------------------------------------------------------------------
-- 4) الدرجات ثلاثية المكوّن + سير الاعتماد
--    status: draft (مسودة المعلم) | confirmed (أكّدها المعلم) | approved (اعتمدتها الإدارة)
-- ---------------------------------------------------------------------
create table if not exists public.course_grades (
  id            uuid primary key default gen_random_uuid(),
  student_id    text references public.profiles(access_key) on delete cascade,
  course_id     uuid references public.courses(id) on delete cascade,
  participation numeric default 0,   -- المشاركة والتكليف
  midterm       numeric default 0,   -- الاختبار النصفي
  final         numeric default 0,   -- الاختبار النهائي
  status        text not null default 'draft' check (status in ('draft','confirmed','approved')),
  created_by    text,
  approved_by   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (student_id, course_id)
);

-- ---------------------------------------------------------------------
-- 5) تفعيل RLS + السياسات للجداول الجديدة
-- ---------------------------------------------------------------------
alter table public.app_settings     enable row level security;
alter table public.courses          enable row level security;
alter table public.course_teachers  enable row level security;
alter table public.enrollments      enable row level security;
alter table public.teacher_students enable row level security;
alter table public.course_grades    enable row level security;

-- app_settings: الكل يقرأ، الإدارة تكتب
drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings for select to authenticated using ( true );
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- courses: الكل يقرأ، الإدارة تكتب
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select to authenticated using ( true );
drop policy if exists courses_write on public.courses;
create policy courses_write on public.courses for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- course_teachers: الكل يقرأ، الإدارة تكتب
drop policy if exists ct_select on public.course_teachers;
create policy ct_select on public.course_teachers for select to authenticated using ( true );
drop policy if exists ct_write on public.course_teachers;
create policy ct_write on public.course_teachers for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- enrollments: الكل يقرأ، الإدارة تكتب
drop policy if exists enr_select on public.enrollments;
create policy enr_select on public.enrollments for select to authenticated using ( true );
drop policy if exists enr_write on public.enrollments;
create policy enr_write on public.enrollments for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- teacher_students: الكل يقرأ، الإدارة تكتب
drop policy if exists ts_select on public.teacher_students;
create policy ts_select on public.teacher_students for select to authenticated using ( true );
drop policy if exists ts_write on public.teacher_students;
create policy ts_write on public.teacher_students for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- course_grades:
--   • الطالب يرى درجاته المعتمدة فقط (approved)
--   • المعلم والإدارة يريان كل شيء
--   • المعلم والإدارة يكتبان (الاعتماد يُضبط من الواجهة)
drop policy if exists cg_select on public.course_grades;
create policy cg_select on public.course_grades for select to authenticated
  using (
    (student_id = public.current_access_key() and status = 'approved')
    or public.is_teacher() or public.is_staff()
  );
drop policy if exists cg_write on public.course_grades;
create policy cg_write on public.course_grades for all to authenticated
  using ( public.is_teacher() or public.is_staff() )
  with check ( public.is_teacher() or public.is_staff() );

-- ---------------------------------------------------------------------
-- 6) بذر الحسابات: مدير + إداري واحد + 5 معلمين + 60 طالبًا
--    كلمة المرور للجميع: 1234
-- ---------------------------------------------------------------------

-- المدير (العميد) + شؤون الطلاب (إداري واحد)
select public.seed_user('DIR1','1234','director','د. عبدالرحمن الفقيه','director', null, null, '0500000001', 'dean@tamkeen.edu');
select public.seed_user('K100','1234','management','أ. يوسف المنصور','affairs', null, null, '0500000002', 'affairs@tamkeen.edu');

-- 5 معلمين
select public.seed_user('T100','1234','teacher','أ. خالد العتيبي',   null, array['العقيدة','علم الرجال','اللغة العربية'], null, '0500000010', 't100@tamkeen.edu');
select public.seed_user('T101','1234','teacher','أ. سعد الغامدي',     null, array['علوم القرآن','الحديث'],            null, '0500000011', 't101@tamkeen.edu');
select public.seed_user('T102','1234','teacher','أ. عبدالله الدوسري', null, array['الفقه','الشريعة','السيرة'],       null, '0500000012', 't102@tamkeen.edu');
select public.seed_user('T103','1234','teacher','أ. منى السالم',      null, array['اللغة الإنجليزية','النحو','البلاغة'], null, '0500000013', 't103@tamkeen.edu');
select public.seed_user('T104','1234','teacher','أ. هدى القرني',      null, array['الصرف','الأدب','فقه اللغة'],       null, '0500000014', 't104@tamkeen.edu');

-- 60 طالبًا (30 سنة نبوية S100-S129 + 30 لغة عربية S130-S159)
do $$
declare
  sun text[] := array[
    'محمد العمري','عبدالله الشهري','أحمد الزهراني','فهد القحطاني','سلمان المالكي',
    'يوسف الحربي','تركي العنزي','بندر الشمري','ماجد الرشيدي','نواف السبيعي',
    'خالد البقمي','عمر الغامدي','صالح الدوسري','ريان العتيبي','مشاري السهلي',
    'عبدالعزيز الجهني','وليد الحارثي','نايف المطيري','سعود البلوي','هاني الزبيدي',
    'إبراهيم الخالدي','عبدالرحمن الفيفي','طلال العمودي','راكان الثبيتي','فيصل الصاعدي',
    'منصور الرويلي','زياد الشهراني','أنس البركاتي','حسام النفيعي','عادل القرشي'
  ];
  arb text[] := array[
    'سارة القحطاني','نورة المطيري','ريم العتيبي','لمى الحربي','هند الغامدي',
    'العنود الدوسري','جواهر الشمري','مها السبيعي','أمل الزهراني','دانة المالكي',
    'شهد العنزي','رغد الرشيدي','وجد البقمي','لين الجهني','تالا الحارثي',
    'بشرى الخالدي','عبير الفيفي','منال العمودي','رنا الثبيتي','غادة الصاعدي',
    'أسماء الرويلي','ندى الشهراني','جنى البركاتي','روان النفيعي','ملك القرشي',
    'بيان السهلي','ميار الزبيدي','رهف العمري','جود الشهري','أروى البلوي'
  ];
  i int; k text;
begin
  for i in 1 .. array_length(sun,1) loop
    k := 'S' || (100 + i - 1);
    perform public.seed_user(k,'1234','student', sun[i], null, null, 'دبلوم السنة النبوية — السنة الأولى', null, null);
    update public.profiles set diploma = 'sunnah', status = 'regular' where access_key = k;
  end loop;
  for i in 1 .. array_length(arb,1) loop
    k := 'S' || (130 + i - 1);
    perform public.seed_user(k,'1234','student', arb[i], null, null, 'دبلوم اللغة العربية — السنة الأولى', null, null);
    update public.profiles set diploma = 'arabic', status = 'regular' where access_key = k;
  end loop;
  -- بعض الحالات للعرض
  update public.profiles set status='suspended' where access_key='S108';
  update public.profiles set status='withdrawn' where access_key='S145';
end $$;

-- ---------------------------------------------------------------------
-- 7) بذر المقررات
-- ---------------------------------------------------------------------
-- دبلوم السنة النبوية — الفصل الأول (المواد التي زوّدتنا بها)
insert into public.courses (diploma, semester, name, code, created_by) values
  ('sunnah','y1s1','القرآن الكريم (1)',              'سن101','K100'),
  ('sunnah','y1s1','تدوين السنة النبوية',            'سن102','K100'),
  ('sunnah','y1s1','مدخل علوم القرآن والقراءات',     'سن103','K100'),
  ('sunnah','y1s1','علم الرجال',                     'سن104','K100'),
  ('sunnah','y1s1','فقه العبادات',                   'سن105','K100'),
  ('sunnah','y1s1','المدخل لدراسة الشريعة',          'سن106','K100'),
  ('sunnah','y1s1','السيرة النبوية',                 'سن107','K100'),
  ('sunnah','y1s1','اللغة العربية (1)',              'سن108','K100'),
  ('sunnah','y1s1','اللغة الإنجليزية (1)',           'سن109','K100'),
  ('sunnah','y1s1','مدخل العقيدة',                   'سن110','K100')
on conflict (code) do nothing;

-- دبلوم اللغة العربية — الفصل الأول (مبدئية، عدّلها كما تشاء)
insert into public.courses (diploma, semester, name, code, created_by) values
  ('arabic','y1s1','النحو (1)',           'عر101','K100'),
  ('arabic','y1s1','الصرف (1)',           'عر102','K100'),
  ('arabic','y1s1','البلاغة (1)',         'عر103','K100'),
  ('arabic','y1s1','الأدب العربي',        'عر104','K100'),
  ('arabic','y1s1','فقه اللغة',           'عر105','K100'),
  ('arabic','y1s1','الإملاء والترقيم',    'عر106','K100'),
  ('arabic','y1s1','النصوص الأدبية',      'عر107','K100'),
  ('arabic','y1s1','اللغة الإنجليزية (1)','عر108','K100')
on conflict (code) do nothing;

-- أمثلة للفصل الثاني (لإظهار بنية الفصول)
insert into public.courses (diploma, semester, name, code, created_by) values
  ('sunnah','y1s2','القرآن الكريم (2)',     'سن201','K100'),
  ('sunnah','y1s2','مصطلح الحديث',          'سن202','K100'),
  ('sunnah','y1s2','فقه المعاملات',         'سن203','K100'),
  ('sunnah','y1s2','اللغة العربية (2)',     'سن204','K100'),
  ('arabic','y1s2','النحو (2)',             'عر201','K100'),
  ('arabic','y1s2','الصرف (2)',             'عر202','K100'),
  ('arabic','y1s2','البلاغة (2)',           'عر203','K100'),
  ('arabic','y1s2','النقد الأدبي',          'عر204','K100')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 8) إسناد المقررات للمعلمين (مادة موكلة للتدريس)
-- ---------------------------------------------------------------------
insert into public.course_teachers (course_id, teacher_id, created_by)
select c.id, m.tid, 'K100'
from (values
  ('سن104','T100'),('سن110','T100'),('سن108','T100'),     -- خالد: علم الرجال + العقيدة + العربية
  ('سن101','T101'),('سن103','T101'),('سن102','T101'),     -- سعد: القرآن + علوم القرآن + تدوين السنة
  ('سن105','T102'),('سن106','T102'),('سن107','T102'),     -- عبدالله: الفقه + الشريعة + السيرة
  ('سن109','T103'),('عر101','T103'),('عر103','T103'),     -- منى: الإنجليزية + النحو + البلاغة
  ('عر102','T104'),('عر104','T104'),('عر105','T104'),     -- هدى: الصرف + الأدب + فقه اللغة
  ('عر106','T104'),('عر107','T104'),('عر108','T103')
) as m(code, tid)
join public.courses c on c.code = m.code
on conflict (course_id, teacher_id) do nothing;

-- ---------------------------------------------------------------------
-- 9) تسجيل الطلاب في مقررات فصلهم الحالي (كل طلاب الدبلومة في كل مقرراتها)
-- ---------------------------------------------------------------------
insert into public.enrollments (course_id, student_id, created_by)
select c.id, p.access_key, 'K100'
from public.courses c
join public.profiles p on p.role = 'student' and p.diploma = c.diploma
where c.semester = 'y1s1'
on conflict (course_id, student_id) do nothing;

-- ---------------------------------------------------------------------
-- 10) توكيل الطلاب للمعلمين (طلاب مقررات كل معلم يصبحون موكلين إليه)
-- ---------------------------------------------------------------------
insert into public.teacher_students (teacher_id, student_id, created_by)
select distinct ct.teacher_id, e.student_id, 'K100'
from public.course_teachers ct
join public.enrollments e on e.course_id = ct.course_id
on conflict (teacher_id, student_id) do nothing;

-- ---------------------------------------------------------------------
-- 11) درجات تجريبية (لإظهار سير العمل فورًا)
--    معتمدة → تظهر للطالب | مؤكدة → تنتظر اعتماد الإدارة | مسودة → عند المعلم فقط
-- ---------------------------------------------------------------------
insert into public.course_grades (student_id, course_id, participation, midterm, final, status, created_by, approved_by)
select v.sid, c.id, v.p, v.m, v.f, v.st, v.cb, v.ab
from (values
  ('S100','سن101',28,27,37,'approved','T101','K100'),
  ('S100','سن104',25,24,33,'approved','T100','K100'),
  ('S100','سن110',26,28,35,'confirmed','T100',null),
  ('S101','سن101',24,22,30,'approved','T101','K100'),
  ('S101','سن104',27,26,34,'confirmed','T100',null),
  ('S102','سن110',22,20,28,'draft','T100',null)
) as v(sid, code, p, m, f, st, cb, ab)
join public.courses c on c.code = v.code
on conflict (student_id, course_id) do nothing;

-- =====================================================================
--  تم. تحقّق:
--   • Table editor → profiles: ~67 صفًا (1 مدير + 1 إداري + 5 معلمين + 60 طالبًا)
--   • courses: 26 مقررًا | course_teachers/enrollments/teacher_students مملوءة
--   • app_settings: current_semester = y1s1
-- =====================================================================
