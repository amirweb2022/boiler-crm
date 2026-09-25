-- =====================================================================
-- Boiler / Pressure-Vessel Testing CRM  —  Database Schema  (v2)
-- سازگار با Supabase (Postgres) و قابل مهاجرت به PostgreSQL مستقل
-- تمام تاریخ‌ها به صورت ISO (timestamptz / date) ذخیره می‌شوند
-- تبدیل به تقویم شمسی فقط در لایه UI انجام می‌شود
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ADMINS
-- ---------------------------------------------------------------------
create table if not exists admins (
  id            uuid primary key default gen_random_uuid(),
  phone         varchar(15) not null unique,
  full_name     varchar(120),
  password_hash text not null,
  role          varchar(20) not null default 'admin',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- ---------------------------------------------------------------------
-- COMPANIES
-- catalog_code همیشه از کاتالوگ ثابت برنامه می‌آید (lib/data/companies-catalog.ts)
-- و هیچ‌گاه مستقیماً از ورودی آزاد کاربر ساخته نمی‌شود.
-- ---------------------------------------------------------------------
create table if not exists companies (
  id           uuid primary key default gen_random_uuid(),
  catalog_code varchar(20) not null unique,
  name         varchar(200) not null,
  phone        varchar(15) not null,
  province     varchar(60) not null,
  city         varchar(60),
  address      text,
  status       varchar(20) not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_companies_province on companies(province);
create index if not exists idx_companies_status   on companies(status);

-- ---------------------------------------------------------------------
-- TEST_RECORDS
-- هر شرکت دقیقاً یک رکورد تست «فعال» دارد. وقتی «ثبت انجام» می‌شود،
-- همین رکورد به‌جلو (سال بعد) آپدیت می‌شود، نه یک رکورد جدید.
-- ---------------------------------------------------------------------
create table if not exists test_records (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null unique references companies(id) on delete cascade,
  test_date               date not null,
  status                  varchar(20) not null default 'pending',
  certificate_uploaded    boolean not null default false,
  certificate_url         text,
  certificate_path        text,
  proof_of_upload_pending boolean not null default false,
  done_at                 timestamptz,
  cycle_count             integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_test_records_test_date on test_records(test_date);
create index if not exists idx_test_records_status    on test_records(status);

-- ---------------------------------------------------------------------
-- VESSELS
-- تاریخ آزمون مستقل ندارند؛ همیشه از test_records همان شرکت خوانده می‌شود.
-- ---------------------------------------------------------------------
create table if not exists vessels (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  name              varchar(150) not null,
  volume            varchar(50)  not null,
  tested            boolean not null default false,
  -- status: 'active' (باید تست شود) | 'excluded' (معاف از همین چرخه با دلیل)
  status            varchar(20) not null default 'active',
  exclusion_reason  text,
  excluded_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_vessels_company on vessels(company_id);

-- ---------------------------------------------------------------------
-- TEST_HISTORY
-- هر ردیف یعنی «یک مخزن در یک چرخه با موفقیت تست شد». در لحظه‌ی «ثبت
-- انجام» پر می‌شود و هرگز آپدیت نمی‌شود — منبع واقعی گزارش‌های ماهانه.
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
  test_date             date not null,
  result                varchar(20) not null default 'approved',
  cycle_count           integer,
  created_at            timestamptz not null default now()
);

create index if not exists idx_test_history_test_date on test_history(test_date);
create index if not exists idx_test_history_company   on test_history(company_id);

-- ---------------------------------------------------------------------
-- PROVINCE_REGION_MAP — نگاشت دستی استان به منطقه/شیت گزارش
-- ---------------------------------------------------------------------
create table if not exists province_region_map (
  id          uuid primary key default gen_random_uuid(),
  province    varchar(60) not null unique,
  region_name varchar(60) not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid references companies(id) on delete set null,
  test_record_id uuid references test_records(id) on delete set null,
  phone          varchar(15) not null,
  message        text not null,
  type           varchar(30) not null default 'reminder',
  status         varchar(20) not null default 'pending',
  provider_ref   text,
  sent_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_notifications_company on notifications(company_id);

-- ---------------------------------------------------------------------
-- AUDIT_LOGS — ردیابی کامل عملیات حساس
-- ---------------------------------------------------------------------
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references admins(id) on delete set null,
  admin_phone varchar(15),
  action      varchar(50) not null,
  entity_type varchar(30) not null,
  entity_id   uuid,
  metadata    jsonb,
  ip_address  varchar(45),
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_admin  on audit_logs(admin_id);

-- ---------------------------------------------------------------------
-- LOGIN_ATTEMPTS — Rate Limiting واقعی (دیتابیس‌محور، نه حافظه process،
-- چون سرور Next.js روی Vercel معمولاً stateless/چند-اینستنسی است)
-- ---------------------------------------------------------------------
create table if not exists login_attempts (
  id         uuid primary key default gen_random_uuid(),
  phone      varchar(15) not null,
  ip_address varchar(45),
  success    boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_attempts_phone_time on login_attempts(phone, created_at);

-- ---------------------------------------------------------------------
-- Trigger: به‌روزرسانی خودکار updated_at
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_companies_updated on companies;
create trigger trg_companies_updated before update on companies
  for each row execute function set_updated_at();

drop trigger if exists trg_test_records_updated on test_records;
create trigger trg_test_records_updated before update on test_records
  for each row execute function set_updated_at();

drop trigger if exists trg_vessels_updated on vessels;
create trigger trg_vessels_updated before update on vessels
  for each row execute function set_updated_at();

drop trigger if exists trg_province_region_map_updated on province_region_map;
create trigger trg_province_region_map_updated before update on province_region_map
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security — همه جداول فقط از طریق service_role (بک‌اند
-- Next.js) در دسترس‌اند؛ هیچ policy عمومی تعریف نشده.
-- ---------------------------------------------------------------------
alter table admins         enable row level security;
alter table companies      enable row level security;
alter table test_records   enable row level security;
alter table vessels        enable row level security;
alter table notifications  enable row level security;
alter table audit_logs     enable row level security;
alter table login_attempts enable row level security;
alter table test_history        enable row level security;
alter table province_region_map enable row level security;
