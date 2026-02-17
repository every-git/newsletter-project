---
name: deploy-cloudflare
description: Cloudflare D1·KV 생성, wrangler.toml 반영, 스키마 적용, 시크릿 설정, Pages·워커 배포 순서를 안내합니다. 배포 전·새 환경 셋업 시 사용.
disable-model-invocation: true
argument-hint: "[선택: local | production]"
---

# Cloudflare 배포·설정

## 목적

뉴스레터 프로젝트를 로컬 또는 프로덕션 환경에서 동작시키기 위한 순차 단계를 제공합니다.

## 실행 시점

- 최초 배포 전
- 새 환경(스테이징 등) 셋업 시
- D1/KV/시크릿을 다시 설정할 때

## Related Files

| File | Purpose |
|------|---------|
| `wrangler.toml` | Pages + D1/KV |
| `workers/collect/wrangler.toml` | 수집 워커 |
| `workers/digest/wrangler.toml` | 다이제스트 워커 |
| `db/schema.sql` | D1 스키마 |

## Workflow

### 1. 리소스 생성 (프로덕션만)

- **D1**: `npx wrangler d1 create newsletter-db` → 출력된 `database_id` 저장
- **KV**: `npx wrangler kv namespace create KV` → 출력된 `id` 저장

### 2. wrangler.toml 3곳 반영

- **wrangler.toml**: `database_id`, `[[kv_namespaces]].id`를 위에서 받은 값으로 교체. OPENROUTER_API_KEY는 빈 문자열 제거 권장(시크릿으로만 사용).
- **workers/collect/wrangler.toml**: 동일한 `database_id` 사용.
- **workers/digest/wrangler.toml**: 동일한 `database_id`, KV `id`. OPENROUTER_API_KEY는 시크릿으로만 설정 권장.

### 3. 스키마·시크릿

- **스키마**: `npx wrangler d1 execute newsletter-db --file=db/schema.sql` (리모트 DB 이름은 생성한 이름과 동일하게)
- **시크릿**: digest 워커에서 `npx wrangler secret put OPENROUTER_API_KEY` 실행 (workers/digest 디렉터리에서). Pages에서 API 키를 쓰는 경우 루트에서도 동일 실행.

### 4. 로컬 개발 (선택)

- **.dev.vars**: 프로젝트 루트에 `OPENROUTER_API_KEY=실제키` 한 줄. `.gitignore`에 `.dev.vars` 포함 확인.
- **로컬 D1/KV**: `database_id = "local"`, KV `id = "local"`로 `wrangler dev` 사용 시 에뮬레이터 사용.

### 5. 배포 순서 (프로덕션)

1. `npm run build`
2. `npx wrangler pages deploy ./dist` (또는 대시보드 연결 후 빌드/출력 설정)
3. `cd workers/collect && npx wrangler deploy`
4. `cd workers/digest && npx wrangler deploy` (배포 전 OPENROUTER_API_KEY 시크릿 필수)

## 주의사항

- 세 곳(wrangler.toml, collect, digest) 모두 **동일한 D1 database_id** 사용.
- Cron은 UTC 기준. digest 07:00/19:00 UTC = KST 16:00/04:00.

## Exceptions

- **local**: 인자가 `local`이면 1·5단계 생략, 4단계와 로컬 wrangler dev 안내만 제공 가능.
- **이미 리소스가 있는 경우**: 1단계 건너뛰고 기존 ID로 2단계만 안내.
