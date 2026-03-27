-- 슬로우 쿼리 개선을 위한 인덱스 추가
-- 기존 기능에 영향 없이 읽기/삭제 성능만 향상

-- 1. submissions: student_token으로 조회 시 풀스캔 방지
create index if not exists submissions_worksheet_student_token_idx
  on public.submissions(worksheet_id, student_token);

-- 2. help_requests: submission_id로 삭제 시 풀스캔 방지
create index if not exists help_requests_submission_id_idx
  on public.help_requests(submission_id);

-- 3. chat_messages: submission_id로 삭제 시 풀스캔 방지
create index if not exists chat_messages_submission_id_idx
  on public.chat_messages(submission_id);

-- 4. vote_responses: submission_id로 삭제 시 풀스캔 방지
create index if not exists vote_responses_submission_id_idx
  on public.vote_responses(submission_id);

-- 5. gallery_reactions: reactor_submission_id로 삭제 시 풀스캔 방지
create index if not exists gallery_reactions_reactor_submission_id_idx
  on public.gallery_reactions(reactor_submission_id);
