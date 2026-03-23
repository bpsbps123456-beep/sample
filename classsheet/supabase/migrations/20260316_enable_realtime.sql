-- ================================================================
-- Supabase Realtime 활성화 — 모든 실시간 동기화 테이블 등록
-- ================================================================
-- Supabase의 postgres_changes 리스너가 작동하려면
-- 각 테이블이 "supabase_realtime" publication에 포함되어야 합니다.
-- 이 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요.
-- ================================================================

-- 1. publication이 없으면 생성 (Supabase 프로젝트에는 기본 제공되지만 안전 처리)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- 2. 모든 실시간 테이블을 publication에 추가
-- (이미 추가된 테이블은 에러 방지를 위해 개별 처리)
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'worksheets',
    'submissions',
    'chat_messages',
    'help_requests',
    'votes',
    'vote_responses',
    'gallery_reactions',
    'groups',
    'presence_sessions'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      RAISE NOTICE 'Added table % to supabase_realtime', t;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Table % already in supabase_realtime (skipped)', t;
    END;
  END LOOP;
END
$$;

-- 3. replica identity를 FULL로 설정 (UPDATE/DELETE 이벤트에서 old row 정보 수신 필요)
ALTER TABLE public.worksheets REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.help_requests REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;
ALTER TABLE public.vote_responses REPLICA IDENTITY FULL;
ALTER TABLE public.gallery_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.presence_sessions REPLICA IDENTITY FULL;
