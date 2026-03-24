alter table public.chat_messages
  add column if not exists is_highlighted boolean not null default false,
  add column if not exists highlighted_at timestamp with time zone;

update public.chat_messages
set
  is_highlighted = coalesce(is_highlighted, false),
  highlighted_at = case when coalesce(is_highlighted, false) then coalesce(highlighted_at, created_at) else null end
where is_highlighted is null
   or (is_highlighted = true and highlighted_at is null);
