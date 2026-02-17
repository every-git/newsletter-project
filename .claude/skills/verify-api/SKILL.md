---
name: verify-api
description: API 라우트가 env 바인딩(DB/KV)을 올바르게 사용하고, 에러 시 적절한 상태 코드와 JSON을 반환하는지 검증합니다.
disable-model-invocation: true
---

# API 검증

## Purpose

1. API 라우트가 `locals.runtime.env`에서 DB(KV 필요 시)를 사용하는지
2. 에러 시 4xx/5xx 및 JSON 응답 일관성
3. `src/lib/db` 함수 사용 일관성

## When to Run

- `src/pages/api/` 또는 `src/lib/db.ts` 변경 후
- 새 API 엔드포인트 추가 후
- verify-implementation 통합 검증 시

## Related Files

| File | Purpose |
|------|---------|
| `src/pages/api/digest.ts` | GET digest |
| `src/pages/api/articles.ts` | GET articles |
| `src/pages/api/article/[id].ts` | PATCH article status |
| `src/pages/api/bookmark.ts` | POST bookmark toggle |
| `src/lib/db.ts` | D1 쿼리 헬퍼 |

## Workflow

### Step 1: DB 바인딩 사용

**검사:** API 라우트에서 `env.DB`를 사용하는지.

```bash
grep -n "env\.DB\|locals.*runtime.*env" src/pages/api/*.ts src/pages/api/**/*.ts 2>/dev/null
```

**PASS:** 각 API 파일이 `locals`/`runtime`/`env`를 통해 DB에 접근함.  
**FAIL:** DB가 필요한 라우트에서 `env.DB` 미사용.  
**수정:** `const db = (locals as any).runtime?.env?.DB` 또는 프로젝트 타입에 맞게 env에서 DB 추출.

### Step 2: 에러 응답 형식

**검사:** catch 블록에서 JSON 응답 및 status 설정.

```bash
grep -n "Response\|status\|JSON.stringify" src/pages/api/*.ts src/pages/api/**/*.ts 2>/dev/null
```

**PASS:** 에러 시 `Response(JSON.stringify({ error: ... }), { status: 4xx 또는 5xx })` 형태 사용.  
**FAIL:** 에러를 그냥 throw만 하거나 status 없이 200으로 JSON 반환.  
**수정:** try/catch에서 `return new Response(JSON.stringify({ error: message }), { status: 500 })` 등으로 통일.

### Step 3: db.ts 의존성

**검사:** API가 `../../lib/db` 또는 `@/lib/db` 등으로 db 함수만 사용하고, 직접 SQL 문자열을 하드코딩하지 않는지.

```bash
grep -n "\.prepare\|\.bind\|db\.run" src/pages/api/
```

**PASS:** API 라우트에는 `.prepare`/`.bind` 등이 없고, `getLatestDigest`, `getArticles` 등 db.ts 함수만 호출.  
**FAIL:** API 파일 내부에 D1 prepare/bind 직접 사용.  
**수정:** 해당 로직을 `src/lib/db.ts`로 옮기고 API에서는 해당 함수만 호출.

## Output Format

| 검사 | 결과 | 비고 |
|------|------|------|
| DB 바인딩 | PASS/FAIL | |
| 에러 응답 | PASS/FAIL | |
| db.ts 의존성 | PASS/FAIL | |

## Exceptions

1. **bookmark.ts** — KV를 사용하지 않아도 됨(현재는 D1만 사용 가능). DB만 사용하면 PASS.
2. **미래에 추가되는 헬스체크 API** — DB 불필요 시 해당 라우트는 Step 1 면제.
3. **의도적인 200 + error 필드** — 클라이언트 규약으로 200으로 에러 객체를 주는 경우 문서화되어 있으면 면제.
