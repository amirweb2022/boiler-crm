-- =====================================================================
-- Migration: افزودن قابلیت «معافیت مخزن از چرخه فعلی»
-- این migration داده‌های موجود را پاک نمی‌کند — فقط ستون‌های جدید با
-- مقدار پیش‌فرض اضافه می‌کند. روی SQL Editor پروژه Supabase اجرا کنید.
-- =====================================================================

alter table vessels add column if not exists status varchar(20) not null default 'active';
alter table vessels add column if not exists exclusion_reason text;
alter table vessels add column if not exists excluded_at timestamptz;
