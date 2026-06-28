-- =========================================================================
--  مركز تمكين — تحديث v6  (المجموعات/الفصول + الإشعارات + إصلاحات RLS)
--  شغّل هذا الملف كاملاً مرة واحدة في:  Supabase → SQL Editor → New query → Run
--  ⚠️ يفترض أنك شغّلت setup.sql و setup-v2.sql و setup-v3.sql من قبل.
--  آمن لإعادة التشغيل (idempotent).
--
--  يضيف/يصلح:
--   • عمود section على الطلاب (المجموعة/الفصل القانوني) + تعبئة تلقائية للموجود
--   • جدول teacher_sections: إسناد مجموعة/فصل كامل للمعلم (لا طالبًا طالبًا)
--   • سياسة حذف رسائل صندوق الوارد (كانت ناقصة → الحذف لا يُحفظ)
--   • سياسة إدراج صندوق الوارد تسمح للإدارة بإرسال الإشعارات
--   • تحديث admin_create_user ليستقبل المجموعة (p_class)
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1) عمود المجموعة/الفصل على الطلاب
--    صيغة المفتاح:  sunnah|<سنة>   أو   arabic|<سنة>|<توقيت>|<مجموعة>
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists section text;

-- تعبئة الطلاب الحاليين بقيمة افتراضية معقولة (يمكن تعديلها لاحقًا من لوحة الإدارة)
update public.profiles set section = case
    when diploma = 'sunnah' then 'sunnah|1'
    when diploma = 'arabic' then 'arabic|1|' || coalesce(nullif(attendance_group, ''), 'weekday') || '|1'
    else section end
  where role = 'student' and (section is null or section = '') and diploma is not null;

-- ---------------------------------------------------------------------
-- 2) جدول إسناد المجموعات/الفصول للمعلمين
-- ---------------------------------------------------------------------
create table if not exists public.teacher_sections (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  text references public.profiles(access_key) on delete cascade,
  section     text not null,
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (teacher_id, section)
);

alter table public.teacher_sections enable row level security;

drop policy if exists tsec_select on public.teacher_sections;
create policy tsec_select on public.teacher_sections for select to authenticated using ( true );
drop policy if exists tsec_write on public.teacher_sections;
create policy tsec_write on public.teacher_sections for all to authenticated
  using ( public.is_staff() ) with check ( public.is_staff() );

-- ---------------------------------------------------------------------
-- 3) صندوق الوارد (shared_items): سياسات الحذف والإدراج
-- ---------------------------------------------------------------------
-- حذف: المستلِم أو المرسِل أو الإدارة (كانت السياسة ناقصة فلا يُحفظ الحذف)
drop policy if exists shared_delete on public.shared_items;
create policy shared_delete on public.shared_items for delete to authenticated
  using (
    to_user_id   = public.current_access_key()
    or from_user_id = public.current_access_key()
    or public.is_staff()
  );

-- إدراج: المرسِل نفسه أو الإدارة (حتى تُرسل الإدارة إشعارات الإسناد للمعلمين)
drop policy if exists shared_insert on public.shared_items;
create policy shared_insert on public.shared_items for insert to authenticated
  with check ( from_user_id = public.current_access_key() or public.is_staff() );

-- ---------------------------------------------------------------------
-- 4) تحديث admin_create_user ليحفظ مجموعة الطالب (p_class)
-- ---------------------------------------------------------------------
drop function if exists public.admin_create_user(text,text,text,text,text[],text,text,text,text,text,text,text);

create or replace function public.admin_create_user(
  p_key text, p_password text, p_role text, p_name text,
  p_specs text[] default null, p_year text default null,
  p_phone text default null, p_email text default null,
  p_img text default null, p_diploma text default null,
  p_attendance text default null, p_section text default null,
  p_class text default null
) returns text language plpgsql security definer
  set search_path = public, auth, extensions as $$
declare
  uid  uuid;
  mail text := lower(p_key) || '@tamkeen.local';
begin
  if not public.is_staff() then
    raise exception 'غير مصرّح: الإدارة فقط تستطيع إضافة مستخدمين';
  end if;
  if exists (select 1 from public.profiles where access_key = upper(p_key)) then
    raise exception 'مفتاح الدخول % مستخدم بالفعل', upper(p_key);
  end if;

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

  insert into public.profiles (
    id, access_key, role, name, management_section, specializations,
    academic_year, phone, email, img_url, diploma, attendance_group, status, section
  ) values (
    uid, upper(p_key), p_role, p_name, p_section, p_specs,
    p_year, p_phone, coalesce(p_email, lower(p_key)||'@tamkeen.edu'),
    p_img, p_diploma, p_attendance, 'regular', p_class
  )
  -- المُحفِّز handle_new_user ينشئ صفًّا أساسيًا أولًا؛ هنا نُثريه بدل أن نصطدم بمفتاحه
  on conflict (id) do update set
    access_key         = excluded.access_key,
    role               = excluded.role,
    name               = excluded.name,
    management_section = excluded.management_section,
    specializations    = excluded.specializations,
    academic_year      = excluded.academic_year,
    phone              = excluded.phone,
    email              = excluded.email,
    img_url            = excluded.img_url,
    diploma            = excluded.diploma,
    attendance_group   = excluded.attendance_group,
    status             = excluded.status,
    section            = excluded.section;

  return upper(p_key);
end; $$;

grant execute on function public.admin_create_user(text,text,text,text,text[],text,text,text,text,text,text,text,text) to authenticated;

-- =====================================================================
--  تم. تحقّق:
--   • profiles فيها عمود section ممتلئ لكل الطلاب
--   • teacher_sections موجود مع سياستين (قراءة للكل، كتابة للإدارة)
--   • إضافة طالب/معلم تعمل، والحذف من صندوق الوارد يُحفظ، والإشعارات تصل
-- =====================================================================
