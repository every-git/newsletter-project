## Skills

커스텀 검증 및 유지보수 스킬은 `.claude/skills/`에 정의되어 있습니다.

| Skill | Purpose |
|-------|---------|
| `newsletter-context` | 프로젝트 구조·스택·디렉터리·배포 방향 파악. 새 작업·온보딩 시 참조 |
| `verify-implementation` | 프로젝트의 모든 verify 스킬을 순차 실행하여 통합 검증 보고서를 생성합니다 |
| `manage-skills` | 세션 변경사항을 분석하고, 검증 스킬을 생성/업데이트하며, CLAUDE.md를 관리합니다 |
| `verify-api` | API 라우트 env 바인딩, 에러 응답, db.ts 의존성 검증 |
| `verify-frontend` | BaseLayout 사용, API 경로, Preact client 지시어 검증 |
| `verify-workers` | collect/digest D1·KV·Cron·진입점·상위 타입 경로 검증 |
| `verify-db` | 스키마·types.ts·db.ts 테이블/컬럼·JSON 컬럼 일치 검증 |
| `deploy-cloudflare` | D1·KV 생성, wrangler 반영, 스키마·시크릿, Pages·워커 배포 순서 안내 |
