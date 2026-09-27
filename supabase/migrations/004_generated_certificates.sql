-- Upgrade existing installations for typed vessels and generated PDF metadata.
alter table vessels add column if not exists type varchar(20) not null default 'tank';

create table if not exists generated_certificates (
  id                 uuid primary key default gen_random_uuid(),
  certificate_number bigint generated always as identity unique,
  vessel_id          uuid references vessels(id) on delete set null,
  company_id         uuid references companies(id) on delete set null,
  equipment_type     varchar(20) not null check (equipment_type in ('tank', 'boiler')),
  field_values       jsonb not null,
  generated_by       uuid references admins(id) on delete set null,
  created_at         timestamptz not null default now()
);

alter table generated_certificates enable row level security;
