-- Add inspection equipment categories while preserving existing tank/boiler rows.
alter table vessels drop constraint if exists vessels_type_check;
alter table vessels add constraint vessels_type_check
  check (type in ('tank', 'boiler', 'lift', 'forklift', 'grounding'));
alter table vessels add column if not exists details jsonb not null default '{}'::jsonb;
alter table vessels alter column name drop not null;
alter table vessels alter column volume drop not null;

-- History is an immutable snapshot; details must survive later device edits/deletion.
alter table test_history add column if not exists vessel_type varchar(20);
alter table test_history add column if not exists vessel_details jsonb not null default '{}'::jsonb;
update test_history h
set vessel_type = v.type,
    vessel_details = coalesce(v.details, '{}'::jsonb)
from vessels v
where h.vessel_id = v.id;
alter table test_history alter column vessel_name drop not null;
alter table test_history alter column vessel_volume drop not null;
