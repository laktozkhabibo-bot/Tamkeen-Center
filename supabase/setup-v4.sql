-- =====================================================================
--  منظومة مركز تمكين — التحديث (المرحلة الرابعة)
--  شغّل هذا الملف بعد setup.sql و setup-v2.sql و setup-v3.sql
--  (Supabase → SQL Editor → Run).  آمن لإعادة التشغيل.
--
--  يضيف:
--   • سياسة حذف لرسائل صندوق الوارد (shared_items) — حتى يتمكّن المستخدم
--     من حذف بريد وصل إليه (أو أرسله). بدون هذه السياسة كان RLS يمنع الحذف.
-- =====================================================================

-- shared_items: يسمح للمستلِم (أو المرسِل) بحذف الرسالة من صندوق الوارد
drop policy if exists shared_delete on public.shared_items;
create policy shared_delete on public.shared_items for delete to authenticated
  using ( to_user_id = public.current_access_key() or from_user_id = public.current_access_key() );
