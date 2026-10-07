-- Optional contact person's name for each company.
alter table companies add column if not exists contact_name varchar(120);
