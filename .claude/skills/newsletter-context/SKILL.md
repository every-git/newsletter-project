---
name: newsletter-context
description: 뉴스레터 프로젝트의 전체 구조, 스택, 디렉터리 역할, 앞으로의 방향(배포·로컬)을 파악합니다. 새 작업 전 또는 온보딩 시 참조.
disable-model-invocation: true
---

# 뉴스레터 프로젝트 맥락

## 목적

에이전트가 이 프로젝트에서 작업할 때 공통으로 참조할 구조와 규칙을 제공합니다.

## 스택

- **프론트**: Astro 5, Preact (islands), Tailwind 4
- **런타임**: Cloudflare Pages (SSR), D1, KV
- **워커**: Wrangler (collect: Cron 매시, digest: Cron 07:00/19:00 UTC = KST 16:00/04:00)

## 디렉터리 구조

| 경로 | 역할 |
|------|------|
| `src/layouts/` | 공통 레이아웃 (BaseLayout: nav 홈/전체기사/북마크/관리) |
| `src/pages/` | 페이지 및 API 라우트 (index, all, article/[id], archive/[id], bookmarks, manage, api/*) |
| `src/components/` | Astro/Preact 컴포넌트 (ArticleCard, BookmarkButton, SearchBar, CategoryTabs 등) |
| `src/lib/` | types.ts, db.ts(D1 헬퍼), scoring.ts |
| `workers/collect/` | 수집 워커 (HN API, RSS, 소스 설정, D1 저장) |
| `workers/digest/` | 다이제스트 워커 (OpenRouter, 요약/인사이트, D1+KV) |
| `db/schema.sql` | D1 스키마 (articles, digests, bookmarks, collect_logs) |

## API 엔드포인트

- `GET /api/digest` — date/edition/id로 다이제스트 조회
- `GET /api/articles` — 기사 목록 (필터, 페이지네이션)
- `PATCH /api/article/[id]` — 기사 상태 변경 (active/archived/deleted)
- `POST /api/bookmark` — 북마크 토글

## 바인딩 규칙

- **Pages (wrangler.toml)**: `DB`(D1), `KV`, `OPENROUTER_API_KEY`(또는 시크릿)
- **collect**: `DB`만 사용
- **digest**: `DB`, `KV`, `OPENROUTER_API_KEY`(시크릿 권장)

세 워커/Pages는 **동일한 D1 database_id**를 사용해야 합니다.

## 앞으로의 방향

1. **배포**: D1/KV 생성 → wrangler.toml 3곳에 실제 ID 반영 → 스키마 적용 → 시크릿 설정 → Pages 배포 → collect/digest 워커 순서 배포
2. **로컬**: `.dev.vars`로 OPENROUTER_API_KEY 주입, `database_id = "local"` / KV `id = "local"`로 에뮬레이터 사용
3. **검증**: `verify-implementation`으로 등록된 verify-* 스킬 순차 실행; `manage-skills`로 스킬 드리프트 관리

## Related Files

| File | Purpose |
|------|---------|
| `wrangler.toml` | Pages + D1/KV 바인딩 |
| `workers/collect/wrangler.toml` | 수집 워커 Cron |
| `workers/digest/wrangler.toml` | 다이제스트 워커 + KV |
| `CLAUDE.md` | 프로젝트 스킬 목록 |
