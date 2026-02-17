---
name: verify-db
description: D1 스키마(articles, digests, bookmarks, collect_logs)와 types.ts·db.ts의 테이블/컬럼·함수 일치 여부를 검증합니다.
disable-model-invocation: true
---

# DB·타입 일관성 검증

## Purpose

1. schema.sql 테이블/컬럼과 types.ts 인터페이스 일치
2. db.ts 함수가 사용하는 컬럼명이 스키마와 일치
3. JSON 컬럼(tags, tech_top_ids 등)의 타입이 string으로 일관됨

## When to Run

- `db/schema.sql`, `src/lib/types.ts`, `src/lib/db.ts` 변경 후
- verify-implementation 통합 검증 시

## Related Files

| File | Purpose |
|------|---------|
| `db/schema.sql` | D1 스키마 |
| `src/lib/types.ts` | Article, Digest, Bookmark, CollectLog 등 |
| `src/lib/db.ts` | getLatestDigest, getArticles, updateArticleStatus 등 |

## Workflow

### Step 1: 테이블 이름 일치

**검사:** schema.sql의 CREATE TABLE 이름과 types.ts에서 사용하는 테이블명.

```bash
grep -n "CREATE TABLE\|INSERT INTO\|FROM \|UPDATE " db/schema.sql
grep -n "articles\|digests\|bookmarks\|collect_logs" src/lib/db.ts
```

**PASS:** articles, digests, bookmarks, collect_logs가 스키마와 db.ts에서 동일하게 사용됨.  
**FAIL:** 스키마에는 있는데 db.ts에서 다른 이름 사용 또는 그 반대.  
**수정:** 스키마 또는 db.ts의 테이블명 통일.

### Step 2: Article 컬럼 일치

**검사:** types.ts의 Article 필드와 schema.sql의 articles 컬럼.

```bash
grep -n "id\|url\|title\|source\|feed_type\|status\|tags\|summary_ko\|insight_ko\|score_community\|score_llm\|score_final\|published_at\|collected_at\|archived_at\|thumbnail_url" db/schema.sql
```

**PASS:** Article 인터페이스의 필드가 스키마 컬럼과 1:1 대응(이름·존재 여부).  
**FAIL:** 스키마에 없는 컬럼을 types/db에서 참조하거나, 타입 불일치(예: number인데 스키마는 TEXT).  
**수정:** 스키마에 컬럼 추가 또는 types/db에서 해당 필드 제거/변경.

### Step 3: Digest 컬럼 일치

**검사:** Digest 인터페이스와 digests 테이블.

```bash
grep -n "tech_top_ids\|world_summary_ko\|world_top_ids\|categories\|edition" db/schema.sql src/lib/types.ts
```

**PASS:** id, date, edition, tech_top_ids, world_summary_ko, world_top_ids, categories, created_at 일치.  
**FAIL:** 필드 누락 또는 이름 불일치.  
**수정:** types 또는 schema 수정.

### Step 4: db.ts 쿼리 컬럼

**검사:** db.ts의 SELECT/INSERT/UPDATE에 등장하는 컬럼이 스키마에 존재.

```bash
grep -n "SELECT\|INSERT\|UPDATE" src/lib/db.ts
```

**PASS:** 사용된 모든 컬럼명이 schema.sql에 정의됨.  
**FAIL:** 존재하지 않는 컬럼 참조.  
**수정:** 스키마에 컬럼 추가 또는 db.ts 쿼리 수정.

### Step 5: JSON 문자열 컬럼

**검사:** tags, tech_top_ids, world_top_ids, categories가 코드에서 JSON.parse/JSON.stringify로만 다뤄짐.

```bash
grep -n "JSON.parse\|JSON.stringify" src/lib/db.ts src/pages/api/
```

**PASS:** 해당 컬럼을 읽을 때 JSON.parse, 쓸 때 JSON.stringify 사용. types.ts에서는 string으로 선언.  
**FAIL:** 타입을 number[] 등으로 선언했거나, 파싱 없이 문자열을 배열처럼 사용.  
**수정:** types는 string 유지, 사용처에서만 parse/stringify.

## Output Format

| 검사 | 결과 | 비고 |
|------|------|------|
| 테이블 이름 | PASS/FAIL | |
| Article 컬럼 | PASS/FAIL | |
| Digest 컬럼 | PASS/FAIL | |
| db.ts 쿼리 컬럼 | PASS/FAIL | |
| JSON 문자열 컬럼 | PASS/FAIL | |

## Exceptions

1. **인덱스 이름** — idx_* 등 인덱스명은 types와 무관. 스키마에만 있으면 됨.
2. **nullable vs NOT NULL** — types에서 optional(?)으로 두고 스키마는 NOT NULL인 경우, 런타임에서만 값 보장하면 허용.
3. **score_final REAL** — types에서 number로 두고 스키마는 REAL로 두는 것은 일치로 간주.
