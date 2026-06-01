-- =====================================================================
--  منظومة مركز تمكين — التحديث (المرحلة الثالثة)
--  شغّل هذا الملف بعد setup.sql و setup-v2.sql  (Supabase → SQL Editor → Run)
--  آمن لإعادة التشغيل.
--
--  يضيف/يعدّل:
--   • تنظيف: حذف كل المعلمين والطلاب والمقررات (تبقى الإدارة لتسجيل الدخول)
--   • أعمدة: مجموعة الحضور للطالب (نهاية/بداية الأسبوع) + ملف المقرر (من الجهاز)
--   • توزيع الدرجة 20/20/60 (لا يحتاج تغييرًا في القاعدة — مجرد قيم)
--   • دوال RPC لإنشاء/حذف المستخدمين من لوحة الإدارة (كانت غير مفعّلة)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) أعمدة جديدة
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists attendance_group text;  -- 'weekend' | 'weekday'
alter table public.courses  add column if not exists file_data text;          -- ملف المقرر (Data URL من الجهاز)
alter table public.courses  add column if not exists file_name text;

-- ---------------------------------------------------------------------
-- 2) تنظيف: حذف كل المعلمين والطلاب والمقررات
--    (الحذف من auth.users يتسلسل تلقائيًا إلى profiles وكل الجداول التابعة)
-- ---------------------------------------------------------------------
delete from auth.users u
using public.profiles p
where p.id = u.id and p.role in ('teacher','student');

-- حذف المقررات وكل ما يتبعها
delete from public.course_grades;
delete from public.enrollments;
delete from public.course_teachers;
delete from public.teacher_students;
delete from public.courses;
-- درجات النظام القديم (إن بقيت)
delete from public.grades;

-- ---------------------------------------------------------------------
-- 3) دالة إنشاء مستخدم من لوحة الإدارة (RPC)
--    تتحقق أن المنادي من الإدارة، ثم تنشئ الحساب + الملف الشخصي
-- ---------------------------------------------------------------------
create or replace function public.admin_create_user(
  p_key text, p_password text, p_role text, p_name text,
  p_specs text[] default null, p_year text default null,
  p_phone text default null, p_email text default null,
  p_img text default null, p_diploma text default null,
  p_attendance text default null, p_section text default null
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
    academic_year, phone, email, img_url, diploma, attendance_group, status
  ) values (
    uid, upper(p_key), p_role, p_name, p_section, p_specs,
    p_year, p_phone, coalesce(p_email, lower(p_key)||'@tamkeen.edu'),
    p_img, p_diploma, p_attendance, 'regular'
  );

  return upper(p_key);
end; $$;

-- ---------------------------------------------------------------------
-- 4) دالة حذف مستخدم من لوحة الإدارة (RPC)
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_user(p_key text)
returns void language plpgsql security definer
  set search_path = public, auth as $$
declare
  uid uuid;
begin
  if not public.is_staff() then
    raise exception 'غير مصرّح';
  end if;
  select id into uid from public.profiles where access_key = upper(p_key);
  if uid is not null then
    delete from auth.users where id = uid;  -- يتسلسل إلى profiles وغيرها
  end if;
end; $$;

grant execute on function public.admin_create_user(text,text,text,text,text[],text,text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_delete_user(text) to authenticated;

-- =====================================================================
--  تم. الآن:
--   • profiles: تبقى الإدارة فقط (DIR1 + K100)
--   • courses/enrollments/... : فارغة — تضيفها الإدارة من الواجهة
--   • أضِف المعلمين والطلاب من لوحة الإدارة (مع الصورة والمجموعة)
-- =====================================================================
