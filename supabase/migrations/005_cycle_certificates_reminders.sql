alter table test_records add column if not exists certificate_cycle_count integer;

update test_records as record
set certificate_cycle_count = case
  when record.cycle_count = 0 then 1
  when record.done_at is not null and object.created_at < record.done_at then record.cycle_count
  when record.done_at is not null and object.created_at >= record.done_at then record.cycle_count + 1
  else null
end
from storage.objects as object
where record.certificate_uploaded = true
  and object.bucket_id = 'certificates'
  and object.name = record.certificate_path;

create table if not exists certificate_history (
  test_record_id uuid not null references test_records(id) on delete cascade,
  cycle_count integer not null,
  test_date date,
  certificate_url text,
  certificate_path text,
  primary key (test_record_id, cycle_count)
);
alter table certificate_history enable row level security;

insert into certificate_history (test_record_id, cycle_count, certificate_url, certificate_path)
select id, cycle_count, certificate_url, certificate_path
from test_records
where certificate_uploaded = true and certificate_cycle_count = cycle_count and cycle_count > 0
on conflict (test_record_id, cycle_count) do nothing;

update test_records
set certificate_uploaded = false, certificate_url = null,
    certificate_path = null, certificate_cycle_count = null
where certificate_uploaded = true and certificate_cycle_count = cycle_count and cycle_count > 0;

create table if not exists reminder_claims (
  test_record_id uuid not null references test_records(id) on delete cascade,
  test_date date not null,
  status text not null default 'sending',
  claimed_at timestamptz not null default now(),
  primary key (test_record_id, test_date)
);
alter table reminder_claims enable row level security;

create or replace function claim_reminder(record_id uuid, due_date date)
returns boolean language plpgsql as $$
declare claimed_count integer;
begin
  insert into reminder_claims (test_record_id, test_date)
  values (record_id, due_date)
  on conflict (test_record_id, test_date) do update
    set status = 'sending', claimed_at = now()
    where reminder_claims.status = 'failed';
  get diagnostics claimed_count = row_count;
  return claimed_count > 0;
end;
$$;
