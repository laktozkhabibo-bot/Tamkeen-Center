-- =====================================================================
--  منظومة مركز تمكين — التحديث (المرحلة الخامسة)
--  شغّل هذا الملف في:  Supabase → SQL Editor → New query → Run
--  آمن لإعادة التشغيل (idempotent).
--
--  يصلح:
--   • خطأ "duplicate key value violates unique constraint profiles_pkey"
--     عند إضافة طالب/معلم/إداري.
--
--     السبب: إدراج صفّ في auth.users يُشغّل المُشغِّل on_auth_user_created
--     الذي يُنشئ صفًّا في public.profiles تلقائيًا. وكانت دالة
--     admin_create_user تُدرج صفًّا ثانيًا في profiles بنفس المعرّف →
--     تضارب في المفتاح الأساسي. الحل: جعل الإدراج upsert
--     (on conflict (id) do update) تمامًا كما في دالة seed_user.
-- =====================================================================

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

  -- ⬇️ upsert: قد يكون المُشغِّل on_auth_user_created أنشأ الصفّ الأساسي
  --    بالفعل، لذا نكمل/نحدّث بقية الحقول بدل محاولة إدراج صفّ مكرّر.
  insert into public.profiles (
    id, access_key, role, name, management_section, specializations,
    academic_year, phone, email, img_url, diploma, attendance_group, status
  ) values (
    uid, upper(p_key), p_role, p_name, p_section, p_specs,
    p_year, p_phone, coalesce(p_email, lower(p_key)||'@tamkeen.edu'),
    p_img, p_diploma, p_attendance, 'regular'
  )
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
    status             = excluded.status;

  return upper(p_key);
end; $$;

grant execute on function public.admin_create_user(text,text,text,text,text[],text,text,text,text,text,text,text) to authenticated;

-- =====================================================================
--  تم. جرّب الآن إضافة طالب/معلم/إداري من لوحة الإدارة — لن يظهر الخطأ.
-- =====================================================================
