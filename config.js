/* 오캔스픽 사이트 설정 — Supabase 프로젝트와 토스페이먼츠 키를 만든 뒤 채우세요 (공개 가능한 키만 여기에) */
window.OCAN_CONFIG = {
  SUPABASE_URL: 'https://foumovwrenrydfnutlpl.supabase.co',        // https://xxxx.supabase.co
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdW1vdndyZW5yeWRmbnV0bHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMTU2NTQsImV4cCI6MjEwNDY5MTY1NH0.AJ89jl_v-PITF1I9pVm7uT7XjCHLUUKz_pTuQJwAMpQ',   // Supabase → Settings → API → anon public
  TOSS_CLIENT_KEY: 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm',     // 토스페이먼츠 → 개발자센터 → API 키 → 클라이언트 키 (live_ck_… / 테스트는 test_ck_…)
  PLAN: { id: '3m', name: '오캔스픽 3개월 이용권', amount: 87000, days: 90 },
  BASE: 'https://www.vibivi.co.kr/ocanspic',
  NAVER_LOGIN: true        // naver-auth 엣지 함수를 배포했으면 true
};
