-- =====================================================================
-- Migration: قابلیت گزارش‌گیری ماهانه اکسل
-- این migration داده‌های موجود را پاک نمی‌کند.
-- =====================================================================

-- شهرستان — فیلد جدید روی شرکت (برای گزارش لازم است، توی سیستم نبود)
alter table companies add column if not exists city varchar(60);

-- ---------------------------------------------------------------------
-- TEST_HISTORY
-- هر ردیف یعنی «یک مخزن در یک چرخه با موفقیت تست شد». این جدول در لحظه‌ی
-- «ثبت انجام» پر می‌شود و برخلاف test_records هرگز آپدیت/بازنویسی
-- نمی‌شود — یعنی منبع واقعی گزارش‌های تاریخی (ماهانه و...) همین‌جاست.
-- اطلاعات شرکت/مخزن به‌صورت snapshot ذخیره می‌شود تا حتی اگر بعداً
-- شرکت ویرایش یا حذف شود، گزارش‌های گذشته دست‌نخورده بمانند.
-- ---------------------------------------------------------------------
create table if not exists test_history (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid references companies(id) on delete set null,
  company_name          varchar(200) not null,
  company_catalog_code  varchar(20),
  company_province      varchar(60) not null,
  company_city          varchar(60),
  company_phone         varchar(15) not null,
  company_address       text,
  vessel_id             uuid references vessels(id) on delete set null,
  vessel_name           varchar(150) not null,
  vessel_volume         varchar(50) not null,
  test_date             date not null,          -- تاریخ واقعی آزمایش (میلادی ISO)
  result                varchar(20) not null default 'approved', -- فعلاً فقط 'approved'
  cycle_count           integer,
  created_at            timestamptz not null default now()
);

create index if not exists idx_test_history_test_date on test_history(test_date);
create index if not exists idx_test_history_company   on test_history(company_id);

alter table test_history enable row level security;

-- ---------------------------------------------------------------------
-- PROVINCE_REGION_MAP
-- نگاشت دستی «هر استان توی کدوم منطقه/شیت گزارش قرار بگیرد» — چون
-- شیت‌بندی گزارش (مثلاً «شمال» چند استان را با هم دارد) با تقسیم‌بندی
-- استانی رسمی یکی نیست و باید توسط ادمین قابل‌تنظیم باشد.
-- استانی که این‌جا نگاشت نشده باشد، با نام خودِ استان به‌عنوان شیت جدا ظاهر می‌شود.
-- ---------------------------------------------------------------------
create table if not exists province_region_map (
  id          uuid primary key default gen_random_uuid(),
  province    varchar(60) not null unique,
  region_name varchar(60) not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table province_region_map enable row level security;

drop trigger if exists trg_province_region_map_updated on province_region_map;
create trigger trg_province_region_map_updated before update on province_region_map
  for each row execute function set_updated_at();
