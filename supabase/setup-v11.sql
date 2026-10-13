-- =========================================================================
--  مركز تمكين — v11  (المعدل التراكمي + الساعات المعتمدة + حالة الطالب ونوع الدراسة + دبلوم الشريعة والقانون)
--  شغّله مرة واحدة بعد setup-v10.sql:  Supabase → SQL Editor → New query → Run.
--  آمن لإعادة التشغيل.
-- =========================================================================

-- 1) الساعات المعتمدة لكل مقرر (أساس حساب النقاط: الساعات × معدل المادة)
alter table public.courses add column if not exists hours numeric not null default 2;

-- 2) نوع الدراسة: دبلوم | موازي
alter table public.profiles add column if not exists study_type text not null default 'diploma';
alter table public.profiles drop constraint if exists profiles_study_type_check;
alter table public.profiles add constraint profiles_study_type_check check (study_type in ('diploma','parallel'));

-- 3) حالات الطالب: إضافة «منتسب» و«خريج» (مع إبقاء معلّق/منقطع)
do $$
declare c record;
begin
  for c in
    select con.conname from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and rel.relname = 'profiles' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%' and con.conname <> 'profiles_study_type_check'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.profiles add constraint profiles_status_check
  check (status in ('regular','affiliate','graduate','suspended','withdrawn'));

-- 4) دبلوم الشريعة والقانون: لا يحتاج تغييرًا في الجداول
--    (diploma = 'sharia' ، المجموعات: sharia|1 و sharia|2)

-- =====================================================================
--  تم. بعد التشغيل: حدّد ساعات كل مقرر من «المقررات» ← تعديل.
-- =====================================================================
