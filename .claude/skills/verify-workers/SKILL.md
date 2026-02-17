---
name: verify-workers
description: collect·digest 워커의 wrangler 설정, D1/KV 바인딩, Cron, 진입점(export default fetch) 일관성을 검증합니다.
disable-model-invocation: true
---

# 워커 검증

## Purpose

1. collect/digest 각각 wrangler.toml에 D1(digest는 KV 포함) 바인딩이 올바르게 설정됨
2. Cron 트리거가 정의되어 있음 (collect: 매시, digest: 07/19 UTC)
3. 진입점이 `export default { fetch, scheduled }` 또는 동등한 형태로 구현됨
4. workers가 상위 `src/lib` 타입을 참조할 때 경로가 유효함

## When to Run

- `workers/collect/`, `workers/digest/` 또는 해당 wrangler.toml 변경 후
- verify-implementation 통합 검증 시

## Related Files

| File | Purpose |
|------|---------|
| `workers/collect/wrangler.toml` | collect D1, Cron |
| `workers/digest/wrangler.toml` | digest D1, KV, OPENROUTER, Cron |
| `workers/collect/index.ts` | 수집 진입점 |
| `workers/digest/index.ts` | 다이제스트 진입점 |
| `src/lib/sources/sources-config.ts` | 소스 설정 (workers는 src/lib/collect 사용) |

## Workflow

### Step 1: D1 바인딩

**검사:** 두 워커 모두 `[[d1_databases]]` binding = "DB", database_name 일치.

```bash
grep -n "d1_databases\|binding\|database_name" workers/collect/wrangler.toml workers/digest/wrangler.toml
```

**PASS:** 둘 다 `binding = "DB"`, `database_name = "newsletter-db"` (또는 동일 규약).  
**FAIL:** binding 이름 불일치, database_name 누락.  
**수정:** wrangler.toml에 동일한 database_name 사용(배포 시 같은 database_id 공유).

### Step 2: digest 전용 KV

**검사:** digest만 KV 네임스페이스 바인딩 가짐.

```bash
grep -n "kv_namespaces\|binding.*KV" workers/digest/wrangler.toml workers/collect/wrangler.toml 2>/dev/null
```

**PASS:** digest에만 `[[kv_namespaces]]` binding = "KV". collect에는 없음.  
**FAIL:** digest에서 KV가 필요한데 바인딩 없음.  
**수정:** workers/digest/wrangler.toml에 kv_namespaces 추가.

### Step 3: Cron 트리거

**검사:** crons 배열 존재.

```bash
grep -n "crons\|triggers" workers/collect/wrangler.toml workers/digest/wrangler.toml
```

**PASS:** collect에 `0 * * * *`, digest에 `0 19 * * *` 및 `0 7 * * *` (또는 동일 규약).  
**FAIL:** [triggers] crons 비어 있거나 잘못된 cron 식.  
**수정:** [triggers] crons = ["..."] 추가/수정.

### Step 4: 진입점 export

**검사:** index.ts에서 fetch/scheduled 내보냄.

```bash
grep -n "export default\|fetch\|scheduled" workers/collect/index.ts workers/digest/index.ts
```

**PASS:** `export default { fetch, scheduled }` 또는 equivalent.  
**FAIL:** default export 없음 또는 fetch/scheduled 누락.  
**수정:** Cloudflare Workers 진입점 형태로 export default 추가.

### Step 5: 상위 타입 경로

**검사:** workers 내부에서 `../../../src/lib/types` 등 상위 참조 시 경로 유효.

```bash
grep -rn "src/lib\|from '\.\./" workers/collect workers/digest --include="*.ts" 2>/dev/null
```

**PASS:** 상대 경로가 프로젝트 루트 기준으로 존재하는 파일을 가리킴.  
**FAIL:** 잘못된 상대 경로로 인해 빌드 실패 가능.  
**수정:** 경로를 루트 기준으로 조정하거나, 필요한 타입만 workers 내부로 복사.

## Output Format

| 검사 | 결과 | 비고 |
|------|------|------|
| D1 바인딩 | PASS/FAIL | |
| digest KV | PASS/FAIL | |
| Cron | PASS/FAIL | |
| 진입점 export | PASS/FAIL | |
| 상위 타입 경로 | PASS/FAIL | |

## Exceptions

1. **로컬 개발** — database_id = "local", id = "local"은 유효. 프로덕션 배포 시에만 실제 ID 필요.
2. **Cron 식 변경** — KST 기준으로 다른 식을 쓰는 경우 문서화되어 있으면 허용.
3. **digest에서 OPENROUTER_API_KEY** — vars에 빈 문자열이어도 되고, 시크릿으로만 넣어도 됨.
