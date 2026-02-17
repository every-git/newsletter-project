# 뉴스레터 프로젝트 스킬

`.claude/skills/` 아래 스킬 목록과 관리 방법입니다.

## 스킬 목록

| 디렉터리 | 용도 |
|----------|------|
| **newsletter-context** | 프로젝트 구조·스택·디렉터리·배포 방향. 새 작업/온보딩 시 참조 |
| **verify-implementation** | 모든 verify-* 스킬을 순차 실행해 통합 검증 보고서 생성 |
| **manage-skills** | 세션 변경 분석, verify 스킬 생성/업데이트, CLAUDE.md 동기화 |
| **verify-api** | API 라우트(env, 에러 응답, db.ts 의존성) 검증 |
| **verify-frontend** | 페이지/레이아웃/컴포넌트(BaseLayout, API 경로, Preact client) 검증 |
| **verify-workers** | collect·digest 워커(D1, KV, Cron, 진입점) 검증 |
| **verify-db** | schema.sql·types.ts·db.ts 일관성 검증 |
| **deploy-cloudflare** | D1/KV 생성, wrangler 반영, 스키마·시크릿, 배포 순서 안내 |

## 관리 방법

- **검증 실행**: `/verify-implementation` 호출 시 위 4개 verify-* 스킬이 순서대로 실행됩니다.
- **스킬 갱신**: 코드 변경 후 `/manage-skills`를 실행하면 변경 파일과 스킬 매핑을 분석하고, 필요 시 verify 스킬을 생성/업데이트하며 `verify-implementation`의 실행 대상 테이블과 `CLAUDE.md`를 갱신합니다.
- **새 verify 스킬 추가 시**: 해당 스킬의 `SKILL.md`를 만든 뒤, `manage-skills/SKILL.md`의 "등록된 검증 스킬" 테이블과 `verify-implementation/SKILL.md`의 "실행 대상 스킬" 테이블, 그리고 `CLAUDE.md`의 Skills 테이블에 한 줄씩 추가해야 합니다.

상세 워크플로우는 각 스킬의 `SKILL.md`를 참조하세요.
