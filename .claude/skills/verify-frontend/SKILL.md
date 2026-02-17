---
name: verify-frontend
description: 페이지·레이아웃·컴포넌트가 BaseLayout을 사용하고, API 호출과 Preact 클라이언트 컴포넌트 사용이 일관된지 검증합니다.
disable-model-invocation: true
---

# 프론트엔드 검증

## Purpose

1. 페이지가 공통 레이아웃(BaseLayout) 사용
2. API 호출 경로가 `/api/*`와 일치
3. 클라이언트 상호작용이 Preact islands로 제한 (필요 시 client:load 등 명시)

## When to Run

- `src/pages/`, `src/layouts/`, `src/components/` 변경 후
- verify-implementation 통합 검증 시

## Related Files

| File | Purpose |
|------|---------|
| `src/layouts/BaseLayout.astro` | 공통 레이아웃 |
| `src/pages/index.astro` | 홈 |
| `src/pages/all.astro` | 전체 기사 |
| `src/pages/article/[id].astro` | 기사 상세 |
| `src/pages/archive/[id].astro` | 과거 다이제스트 |
| `src/pages/bookmarks.astro` | 북마크 |
| `src/pages/manage.astro` | 관리 |
| `src/components/ArticleCard.astro` | 기사 카드 |
| `src/components/BookmarkButton.tsx` | 북마크 버튼 (Preact) |

## Workflow

### Step 1: BaseLayout 사용

**검사:** 레이아웃 import 및 사용.

```bash
grep -n "BaseLayout\|Layout" src/pages/*.astro src/pages/**/*.astro 2>/dev/null
```

**PASS:** 모든 페이지가 `BaseLayout`을 사용하거나 레이아웃을 명시적으로 지정.  
**FAIL:** 레이아웃 없이 `<html>` 등만 있는 페이지.  
**수정:** `import BaseLayout from '../layouts/BaseLayout.astro'` 후 감싸기.

### Step 2: API 경로 일치

**검사:** fetch/url이 `/api/digest`, `/api/articles`, `/api/article/`, `/api/bookmark`와 일치.

```bash
grep -rn "fetch\|/api/" src/pages src/components --include="*.astro" --include="*.tsx" 2>/dev/null
```

**PASS:** `/api/digest`, `/api/articles`, `/api/article/${id}`, `/api/bookmark` 등 프로젝트 API 규칙과 일치.  
**FAIL:** 오타(`/api/digests`), 하드코딩 호스트 등.  
**수정:** 상대 경로 `/api/...` 사용, 엔드포인트 이름 수정.

### Step 3: Preact 클라이언트 지시어

**검사:** `.tsx` 컴포넌트 사용 시 `client:load` 등 필요 시 지정.

```bash
grep -n "client:load\|client:visible\|client:idle" src/pages src/components --include="*.astro" 2>/dev/null
```

**PASS:** 상호작용이 필요한 Preact 컴포넌트에 client 지시어가 있거나, 기본 동작으로 충분.  
**FAIL:** 클릭/폼이 있는데 client 지시어 없이 서버만 렌더.  
**수정:** 해당 컴포넌트에 `client:load` 또는 적절한 지시어 추가.

## Output Format

| 검사 | 결과 | 비고 |
|------|------|------|
| BaseLayout | PASS/FAIL | |
| API 경로 | PASS/FAIL | |
| Preact client | PASS/FAIL | |

## Exceptions

1. **API 라우트 파일** (`src/pages/api/*.ts`) — Step 2의 fetch 검사 대상에서 제외.
2. **정적 페이지** — 레이아웃만 있고 API 호출이 없으면 Step 2 PASS.
3. **서버만 사용하는 컴포넌트** — 클릭/상태 없으면 client 지시어 불필요.
