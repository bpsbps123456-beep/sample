-- Migration: Add missing realtime sync columns
-- 2026-03-16

-- 1. submissions 테이블에 채팅 뮤트, 쓰기 잠금 컬럼 추가
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS chat_muted   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS writing_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. worksheets 테이블에 채팅 익명 모드 컬럼 추가
ALTER TABLE worksheets
  ADD COLUMN IF NOT EXISTS chat_anonymous_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Supabase Realtime이 submissions 변경을 감지할 수 있도록 publication 확인
-- (이미 supabase_realtime publication에 submissions가 포함되어 있으면 불필요)
-- ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
