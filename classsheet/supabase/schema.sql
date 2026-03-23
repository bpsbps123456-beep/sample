create extension if not exists "pgcrypto";

create table if not exists public.worksheets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  components jsonb not null default '[]'::jsonb,
  session_code varchar(6) not null unique,
  is_active boolean not null default false,
  gallery_open boolean not null default false,
  gallery_filter_question text,
  gallery_anonymous boolean not null default false,
  is_locked boolean not null default false,
  timer_end_at timestamptz,
  timer_active boolean not null default false,
  focus_mode boolean not null default false,
  chat_active boolean not null default false,
  chat_paused boolean not null default false,
  chat_anonymous_mode boolean not null default false,
  session_mode varchar(10) not null default 'individual',
  current_page integer,
  learning_goal text,
  is_template boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  name text not null,
  icon varchar(10) not null,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  auth_user_id uuid,
  student_token uuid not null default gen_random_uuid(),
  student_name text not null,
  group_id uuid references public.groups(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  is_submitted boolean not null default false,
  is_gallery_visible boolean not null default false,
  chat_muted boolean not null default false,
  writing_locked boolean not null default false,
  submitted_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists submissions_worksheet_student_name_unique_idx
  on public.submissions(worksheet_id, student_name);

create unique index if not exists submissions_worksheet_auth_user_id_unique_idx
  on public.submissions(worksheet_id, auth_user_id)
  where auth_user_id is not null;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  sender_name text not null,
  is_anonymous boolean not null default false,
  is_teacher boolean not null default false,
  content text not null,
  is_pinned boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  type varchar(20) not null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  is_result_public boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz
);

create table if not exists public.vote_responses (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references public.votes(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  response jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (vote_id, submission_id)
);

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_id text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.presence_sessions (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  student_name text not null,
  status varchar(12) not null default 'online',
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists presence_sessions_worksheet_submission_unique_idx
  on public.presence_sessions(worksheet_id, submission_id);

create table if not exists public.gallery_reactions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reactor_submission_id uuid not null references public.submissions(id) on delete cascade,
  emoji varchar(8) not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (submission_id, reactor_submission_id, emoji)
);

alter table public.worksheets enable row level security;
alter table public.groups enable row level security;
alter table public.submissions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.votes enable row level security;
alter table public.vote_responses enable row level security;
alter table public.help_requests enable row level security;
alter table public.presence_sessions enable row level security;
alter table public.gallery_reactions enable row level security;

create index if not exists worksheets_session_code_idx on public.worksheets(session_code);
create index if not exists submissions_worksheet_id_idx on public.submissions(worksheet_id);
create index if not exists groups_worksheet_id_idx on public.groups(worksheet_id);
create index if not exists chat_messages_worksheet_id_idx on public.chat_messages(worksheet_id);
create index if not exists votes_worksheet_id_idx on public.votes(worksheet_id);
create index if not exists vote_responses_vote_id_idx on public.vote_responses(vote_id);
create index if not exists help_requests_worksheet_id_idx on public.help_requests(worksheet_id);
create index if not exists presence_sessions_worksheet_id_idx on public.presence_sessions(worksheet_id);
create index if not exists gallery_reactions_submission_id_idx on public.gallery_reactions(submission_id);

create or replace function public.is_teacher_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

create or replace function public.is_worksheet_participant(target_worksheet uuid)
returns boolean
language sql
stable
as $$
  select public.is_teacher_service_role()
    or exists (
      select 1
      from public.submissions submissions
      where submissions.worksheet_id = target_worksheet
        and submissions.auth_user_id = auth.uid()
    );
$$;

create or replace function public.is_submission_owner(target_submission uuid)
returns boolean
language sql
stable
as $$
  select public.is_teacher_service_role()
    or exists (
      select 1
      from public.submissions submissions
      where submissions.id = target_submission
        and submissions.auth_user_id = auth.uid()
    );
$$;

insert into storage.buckets (id, name, public)
values ('drawings', 'drawings', true)
on conflict (id) do nothing;

drop policy if exists worksheets_select_policy on public.worksheets;
create policy worksheets_select_policy on public.worksheets
for select
to authenticated
using (public.is_worksheet_participant(id));

drop policy if exists worksheets_mutation_policy on public.worksheets;
create policy worksheets_mutation_policy on public.worksheets
for all
to authenticated
using (public.is_teacher_service_role())
with check (public.is_teacher_service_role());

drop policy if exists groups_select_policy on public.groups;
create policy groups_select_policy on public.groups
for select
to authenticated
using (public.is_worksheet_participant(worksheet_id));

drop policy if exists groups_mutation_policy on public.groups;
create policy groups_mutation_policy on public.groups
for all
to authenticated
using (public.is_teacher_service_role())
with check (public.is_teacher_service_role());

drop policy if exists submissions_select_policy on public.submissions;
create policy submissions_select_policy on public.submissions
for select
to authenticated
using (public.is_worksheet_participant(worksheet_id));

drop policy if exists submissions_insert_policy on public.submissions;
create policy submissions_insert_policy on public.submissions
for insert
to authenticated
with check (
  public.is_teacher_service_role()
  or auth.uid() = auth_user_id
);

drop policy if exists submissions_update_policy on public.submissions;
create policy submissions_update_policy on public.submissions
for update
to authenticated
using (
  public.is_teacher_service_role()
  or public.is_submission_owner(id)
)
with check (
  public.is_teacher_service_role()
  or public.is_submission_owner(id)
);

drop policy if exists submissions_delete_policy on public.submissions;
create policy submissions_delete_policy on public.submissions
for delete
to authenticated
using (public.is_teacher_service_role());

drop policy if exists chat_messages_select_policy on public.chat_messages;
create policy chat_messages_select_policy on public.chat_messages
for select
to authenticated
using (public.is_worksheet_participant(worksheet_id));

drop policy if exists chat_messages_insert_policy on public.chat_messages;
create policy chat_messages_insert_policy on public.chat_messages
for insert
to authenticated
with check (
  public.is_teacher_service_role()
  or public.is_submission_owner(submission_id)
);

drop policy if exists chat_messages_update_policy on public.chat_messages;
create policy chat_messages_update_policy on public.chat_messages
for update
to authenticated
using (public.is_teacher_service_role())
with check (public.is_teacher_service_role());

drop policy if exists chat_messages_delete_policy on public.chat_messages;
create policy chat_messages_delete_policy on public.chat_messages
for delete
to authenticated
using (public.is_teacher_service_role());

drop policy if exists votes_select_policy on public.votes;
create policy votes_select_policy on public.votes
for select
to authenticated
using (public.is_worksheet_participant(worksheet_id));

drop policy if exists votes_mutation_policy on public.votes;
create policy votes_mutation_policy on public.votes
for all
to authenticated
using (public.is_teacher_service_role())
with check (public.is_teacher_service_role());

drop policy if exists vote_responses_select_policy on public.vote_responses;
create policy vote_responses_select_policy on public.vote_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.votes votes
    where votes.id = vote_id
      and public.is_worksheet_participant(votes.worksheet_id)
  )
);

drop policy if exists vote_responses_insert_policy on public.vote_responses;
create policy vote_responses_insert_policy on public.vote_responses
for insert
to authenticated
with check (
  public.is_teacher_service_role()
  or public.is_submission_owner(submission_id)
);

drop policy if exists vote_responses_update_policy on public.vote_responses;
create policy vote_responses_update_policy on public.vote_responses
for update
to authenticated
using (
  public.is_teacher_service_role()
  or public.is_submission_owner(submission_id)
)
with check (
  public.is_teacher_service_role()
  or public.is_submission_owner(submission_id)
);

drop policy if exists help_requests_select_policy on public.help_requests;
create policy help_requests_select_policy on public.help_requests
for select
to authenticated
using (public.is_worksheet_participant(worksheet_id));

drop policy if exists help_requests_insert_policy on public.help_requests;
create policy help_requests_insert_policy on public.help_requests
for insert
to authenticated
with check (
  public.is_teacher_service_role()
  or public.is_submission_owner(submission_id)
);

drop policy if exists help_requests_update_policy on public.help_requests;
create policy help_requests_update_policy on public.help_requests
for update
to authenticated
using (public.is_teacher_service_role())
with check (public.is_teacher_service_role());

drop policy if exists presence_sessions_select_policy on public.presence_sessions;
create policy presence_sessions_select_policy on public.presence_sessions
for select
to authenticated
using (public.is_worksheet_participant(worksheet_id));

drop policy if exists presence_sessions_insert_policy on public.presence_sessions;
create policy presence_sessions_insert_policy on public.presence_sessions
for insert
to authenticated
with check (
  public.is_teacher_service_role()
  or public.is_submission_owner(submission_id)
);

drop policy if exists presence_sessions_update_policy on public.presence_sessions;
create policy presence_sessions_update_policy on public.presence_sessions
for update
to authenticated
using (
  public.is_teacher_service_role()
  or public.is_submission_owner(submission_id)
)
with check (
  public.is_teacher_service_role()
  or public.is_submission_owner(submission_id)
);

drop policy if exists gallery_reactions_select_policy on public.gallery_reactions;
create policy gallery_reactions_select_policy on public.gallery_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.submissions submissions
    where submissions.id = submission_id
      and public.is_worksheet_participant(submissions.worksheet_id)
  )
);

drop policy if exists gallery_reactions_insert_policy on public.gallery_reactions;
create policy gallery_reactions_insert_policy on public.gallery_reactions
for insert
to authenticated
with check (
  public.is_teacher_service_role()
  or public.is_submission_owner(reactor_submission_id)
);

drop policy if exists storage_drawings_public_read on storage.objects;
create policy storage_drawings_public_read on storage.objects
for select
to public
using (bucket_id = 'drawings');

drop policy if exists storage_drawings_authenticated_insert on storage.objects;
create policy storage_drawings_authenticated_insert on storage.objects
for insert
to authenticated
with check (bucket_id = 'drawings');

drop policy if exists storage_drawings_authenticated_update on storage.objects;
create policy storage_drawings_authenticated_update on storage.objects
for update
to authenticated
using (bucket_id = 'drawings')
with check (bucket_id = 'drawings');

drop policy if exists storage_drawings_authenticated_delete on storage.objects;
create policy storage_drawings_authenticated_delete on storage.objects
for delete
to authenticated
using (bucket_id = 'drawings');

-- ================================================================
-- Supabase Realtime — publication 및 replica identity 설정
-- postgres_changes가 작동하려면 반드시 필요합니다.
-- ================================================================
ALTER TABLE public.worksheets REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.help_requests REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;
ALTER TABLE public.vote_responses REPLICA IDENTITY FULL;
ALTER TABLE public.gallery_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.presence_sessions REPLICA IDENTITY FULL;
