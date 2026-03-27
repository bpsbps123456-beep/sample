alter table public.worksheets
add column if not exists page_lock_enabled boolean not null default true;

update public.worksheets
set page_lock_enabled = true
where page_lock_enabled is distinct from true;
