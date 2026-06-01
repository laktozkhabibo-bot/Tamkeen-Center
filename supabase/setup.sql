-- =====================================================================
--  منظومة مركز تمكين — إعداد Supabase (المرحلة الأولى: الأساس)
--  شغّل هذا الملف كاملاً مرة واحدة في:  Supabase → SQL Editor → New query → Run
--  يُنشئ: الجداول، الحماية (RLS)، الدوال المساعدة، الحسابات التجريبية، ومخزن الملفات.
--  آمن لإعادة التشغيل (idempotent قدر الإمكان).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1) الجداول
--    ملاحظة: نربط كل شيء عبر access_key (مثل T100) تمامًا كما في الواجهة الحالية.
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  access_key          text unique not null,
  role                text not null check (role in ('director','management','teacher','student')),
  name                text not null,
  management_section  text,
  specializations     text[],
  academic_year       text,
  phone               text,
  email               text,
  img_url             text,
  created_at          timestamptz not null default now()
);

create table if not exists public.delegations (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   text references public.profiles(access_key) on delete cascade,
  type         text not null default 'subject',
  title        text,
  description  text,
  subject_name text,
  class_name   text,
  student_ids  text[] default '{}',
  status       text default 'active',
  assigned_by  text,
  assigned_at  timestamptz not null default now()
);

create table if not exists public.grades (
  id          uuid primary key default gen_random_uuid(),
  student_id  text references public.profiles(access_key) on delete cascade,
  subject     text not null,
  score       numeric,
  max_score   numeric default 100,
  notes       text,
  created_by  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  student_id  text references public.profiles(access_key) on delete cascade,
  title       text not null,
  description text,
  due_date    text,
  assigned_by text,
  created_at  timestamptz not null default now()
);

create table if not exists public.behavior_scores (
  student_id  text primary key references public.profiles(access_key) on delete cascade,
  score       int default 100,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.schedules (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  type        text default 'weekly',
  columns     jsonb default '[]',
  rows        jsonb default '[]',
  created_by  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text,
  template    text default 'general',
  audience    text[] default array['students','teachers','admins'],
  created_by  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.shared_items (
  id            uuid primary key default gen_random_uuid(),
  from_user_id  text,
  to_user_id    text references public.profiles(access_key) on delete cascade,
  item_name     text,
  item_type     text,
  file_size     text,
  file_url      text,
  schedule_data jsonb,
  is_read       boolean default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.cloud_items (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text references public.profiles(access_key) on delete cascade,
  name         text not null,
  type         text default 'file',
  file_name    text,
  file_size    text,
  storage_path text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) دوال مساعدة (تُستخدم داخل سياسات الحماية)
-- ---------------------------------------------------------------------

create or replace function public.current_access_key()
returns text language sql stable security definer set search_path = public as $$
  select access_key from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('director','management') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'teacher' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.current_audience()
returns text language sql stable security definer set search_path = public as $$
  select case (select role from public.profiles where id = auth.uid())
    when 'student' then 'students'
    when 'teacher' then 'teachers'
    else 'admins' end;
$$;

-- ---------------------------------------------------------------------
-- 3) تفعيل RLS + السياسات
-- ---------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.delegations     enable row level security;
alter table public.grades          enable row level security;
alter table public.assignments     enable row level security;
alter table public.behavior_scores enable row level security;
alter table public.schedules       enable row level security;
alter table public.announcements   enable row level security;
alter table public.shared_items    enable row level security;
alter table public.cloud_items     enable row level security;

-- profiles ------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using ( id = auth.uid() or public.is_staff() or public.is_teacher() );
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using ( id = auth.uid() or public.is_staff() ) with check ( id = auth.uid() or public.is_staff() );
drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles for insert to authenticated with check ( public.is_staff() );
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated using ( public.is_staff() );

-- grades --------------------------------------------------------------
drop policy if exists grades_select on public.grades;
create policy grades_select on public.grades for select to authenticated
  using ( student_id = public.current_access_key() or public.is_staff() or public.is_teacher() );
drop policy if exists grades_write on public.grades;
create policy grades_write on public.grades for all to authenticated
  using ( public.is_staff() or public.is_teacher() )
  with check ( public.is_staff() or public.is_teacher() );

-- assignments ---------------------------------------------------------
drop policy if exists assignments_select on public.assignments;
create policy assignments_select on public.assignments for select to authenticated
  using ( student_id = public.current_access_key() or public.is_staff() or public.is_teacher() );
drop policy if exists assignments_write on public.assignments;
create policy assignments_write on public.assignments for all to authenticated
  using ( public.is_staff() or public.is_teacher() )
  with check ( public.is_staff() or public.is_teacher() );

-- behavior_scores -----------------------------------------------------
drop policy if exists behavior_select on public.behavior_scores;
create policy behavior_select on public.behavior_scores for select to authenticated
  using ( student_id = public.current_access_key() or public.is_staff() or public.is_teacher() );
drop policy if exists behavior_write on public.behavior_scores;
create policy behavior_write on public.behavior_scores for all to authenticated
  using ( public.is_staff() or public.is_teacher() )
  with check ( public.is_staff() or public.is_teacher() );

-- delegations ---------------------------------------------------------
drop policy if exists delegations_select on public.delegations;
create policy delegations_select on public.delegations for select to authenticated
  using ( teacher_id = public.current_access_key() or public.is_staff() );
drop policy if exists delegations_write on public.delegations;
create policy delegations_write on public.delegations for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- schedules (الكل يقرأ، الإدارة تكتب) ---------------------------------
drop policy if exists schedules_select on public.schedules;
create policy schedules_select on public.schedules for select to authenticated using ( true );
drop policy if exists schedules_write on public.schedules;
create policy schedules_write on public.schedules for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- announcements (حسب الجمهور، الإدارة تكتب) ---------------------------
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated
  using ( audience is null or array_length(audience,1) is null or public.current_audience() = any(audience) or public.is_staff() );
drop policy if exists announcements_write on public.announcements;
create policy announcements_write on public.announcements for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- shared_items --------------------------------------------------------
drop policy if exists shared_select on public.shared_items;
create policy shared_select on public.shared_items for select to authenticated
  using ( to_user_id = public.current_access_key() or from_user_id = public.current_access_key() );
drop policy if exists shared_insert on public.shared_items;
create policy shared_insert on public.shared_items for insert to authenticated
  with check ( from_user_id = public.current_access_key() );
drop policy if exists shared_update on public.shared_items;
create policy shared_update on public.shared_items for update to authenticated
  using ( to_user_id = public.current_access_key() );

-- cloud_items (المالك فقط) --------------------------------------------
drop policy if exists cloud_all on public.cloud_items;
create policy cloud_all on public.cloud_items for all to authenticated
  using ( owner_id = public.current_access_key() )
  with check ( owner_id = public.current_access_key() );

-- ---------------------------------------------------------------------
-- 4) إنشاء ملف تعريفي تلقائيًا عند إنشاء أي مستخدم (لتسجيل الطلاب لاحقًا)
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, access_key, role, name)
  values (
    new.id,
    upper(coalesce(new.raw_user_meta_data->>'access_key', split_part(new.email,'@',1))),
    coalesce(new.raw_user_meta_data->>'role','student'),
    coalesce(new.raw_user_meta_data->>'name','مستخدم')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5) دالة بذر مستخدم (تنشئ حساب Auth + الملف التعريفي)
--    البريد الداخلي = مفتاح الدخول + @tamkeen.local (لا يُرسل أي بريد)
-- ---------------------------------------------------------------------

create or replace function public.seed_user(
  p_key text, p_password text, p_role text, p_name text,
  p_section text default null, p_specs text[] default null,
  p_year text default null, p_phone text default null, p_email text default null
) returns void language plpgsql security definer
  set search_path = public, auth, extensions as $$
declare
  uid   uuid;
  mail  text := lower(p_key) || '@tamkeen.local';
begin
  select id into uid from auth.users where email = mail;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
      crypt(p_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('access_key', upper(p_key), 'role', p_role, 'name', p_name),
      now(), now(), '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', mail), 'email', now(), now(), now()
    );
  end if;

  insert into public.profiles (id, access_key, role, name, management_section, specializations, academic_year, phone, email)
  values (uid, upper(p_key), p_role, p_name, p_section, p_specs, p_year, p_phone, coalesce(p_email, lower(p_key)||'@tamkeen.edu'))
  on conflict (id) do update set
    role = excluded.role, name = excluded.name,
    management_section = excluded.management_section,
    specializations = excluded.specializations,
    academic_year = excluded.academic_year,
    phone = excluded.phone, email = excluded.email;
end; $$;

-- ---------------------------------------------------------------------
-- 6) الحسابات التجريبية (كلمة المرور للجميع: 1234)
-- ---------------------------------------------------------------------

select public.seed_user('DIR1','1234','director','د. عبدالرحمن الفقيه','director', null, null, '0500000001', 'director@tamkeen.edu');
select public.seed_user('K100','1234','management','أ. يسرى المنصور','yousra', null, null, '0500000002', 'yousra@tamkeen.edu');
select public.seed_user('K101','1234','management','أ. أحمد الزهراني','ahmed', null, null, '0500000003', 'ahmed@tamkeen.edu');
select public.seed_user('T100','1234','teacher','أ. خالد العتيبي', null, array['الفقه','أصول الفقه'], null, '0500000010', 'khaled@tamkeen.edu');
select public.seed_user('T101','1234','teacher','أ. منى السالم', null, array['اللغة العربية','النحو'], null, '0500000011', 'mona@tamkeen.edu');
select public.seed_user('S100','1234','student','محمد العمري', null, null, 'دبلوم السنة النبوية — السنة الأولى', '0500000020', 'm.alamri@mail.com');
select public.seed_user('S101','1234','student','سارة القحطاني', null, null, 'دبلوم اللغة العربية — السنة الأولى', '0500000021', 'sara.q@mail.com');
select public.seed_user('S102','1234','student','عبدالله الشهري', null, null, 'دبلوم التمريض — السنة الثانية', '0500000022', 'a.alshehri@mail.com');

-- توكيلات تجريبية
insert into public.delegations (teacher_id, type, title, description, subject_name, class_name, student_ids, assigned_by)
select 'T100','subject','تدريس مادة الفقه','متابعة طلاب السنة الأولى في مادة الفقه وأصوله.','الفقه','دبلوم السنة النبوية', array['S100','S101'], 'K100'
where not exists (select 1 from public.delegations where teacher_id='T100');
insert into public.delegations (teacher_id, type, title, description, subject_name, class_name, student_ids, assigned_by)
select 'T101','students','توكيل طلاب','متابعة الطالب في اللغة العربية.','اللغة العربية','دبلوم اللغة العربية', array['S102'], 'K100'
where not exists (select 1 from public.delegations where teacher_id='T101');

-- درجات تجريبية للطالب محمد العمري (لتظهر ميزة الدرجات فورًا)
insert into public.grades (student_id, subject, score, max_score, notes, created_by)
select 'S100','الفقه', 92, 100, 'أداء ممتاز', 'T100'
where not exists (select 1 from public.grades where student_id='S100' and subject='الفقه');
insert into public.grades (student_id, subject, score, max_score, notes, created_by)
select 'S100','أصول الفقه', 85, 100, '', 'T100'
where not exists (select 1 from public.grades where student_id='S100' and subject='أصول الفقه');

-- ---------------------------------------------------------------------
-- 7) مخزن الملفات (نظام السحابة)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('cloud','cloud', false)
on conflict (id) do nothing;

-- المالك فقط يتحكم بملفاته. مسار الملف يبدأ بمفتاح الدخول:  {access_key}/...
drop policy if exists cloud_objects_select on storage.objects;
create policy cloud_objects_select on storage.objects for select to authenticated
  using ( bucket_id = 'cloud' and (storage.foldername(name))[1] = public.current_access_key() );
drop policy if exists cloud_objects_insert on storage.objects;
create policy cloud_objects_insert on storage.objects for insert to authenticated
  with check ( bucket_id = 'cloud' and (storage.foldername(name))[1] = public.current_access_key() );
drop policy if exists cloud_objects_delete on storage.objects;
create policy cloud_objects_delete on storage.objects for delete to authenticated
  using ( bucket_id = 'cloud' and (storage.foldername(name))[1] = public.current_access_key() );

-- =====================================================================
--  تم. للتحقق:  Authentication → Users يجب أن تظهر 8 حسابات.
--               Table editor → profiles يجب أن تظهر 8 صفوف.
-- =====================================================================
