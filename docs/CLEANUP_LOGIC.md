# 7일 이전 기사 정리 로직 (북마크 제외)

북마크하지 않은 7일 이전 기사만 DB에서 삭제하는 흐름과 확인 방법입니다.

## 로직이 들어 있는 곳

| 위치 | 역할 |
|------|------|
| `src/lib/db.ts` | 실제 조건·삭제/건수 조회 |
| `src/pages/api/admin/cleanup.ts` | GET(미리보기) / POST(실행) |
| `src/pages/manage.astro` | 관리 화면 버튼·미리보기 표시 |

## 동작 조건 (SQL)

삭제/대상 건수 조회 모두 아래와 **같은 조건**을 씁니다.

- `published_at < cutoff`  
  - `cutoff` = 현재 시각 − `older_than_days`일 (기본 7일)  
  - ISO 문자열로 비교 (예: `2026-02-11T00:00:00.000Z`)
- `id NOT IN (SELECT article_id FROM bookmarks)`  
  - `bookmarks` 테이블에 있는 기사는 **제외** (삭제 안 함)

즉, **“7일보다 오래된 기사이면서, 북마크된 적 없는 기사”**만 삭제 대상입니다.

## 코드 상 흐름

1. **관리 페이지** (`/manage`)  
   - 로드 시 `GET /api/admin/cleanup` 호출 → **삭제 대상 건수**만 조회해 표시 (실제 삭제 없음).
   - "7일 이전 기사 정리" 버튼 클릭 시 `POST /api/admin/cleanup` 호출 → 위 조건으로 삭제 후 삭제 건수 표시.

2. **API** (`src/pages/api/admin/cleanup.ts`)  
   - **GET**: `countOldArticlesExceptBookmarked(db, older_than_days)` 호출 → `would_delete`, `cutoff_iso` 등 반환.  
   - **POST**: `deleteOldArticlesExceptBookmarked(db, older_than_days)` 호출 → `deleted` 반환.

3. **DB** (`src/lib/db.ts`)  
   - `countOldArticlesExceptBookmarked`:  
     `SELECT COUNT(*) FROM articles WHERE published_at < ? AND id NOT IN (SELECT article_id FROM bookmarks)`  
   - `deleteOldArticlesExceptBookmarked`:  
     `DELETE FROM articles WHERE ...` (같은 조건).

같은 상수 `OLD_ARTICLES_EXCEPT_BOOKMARKED_SQL`로 조건을 공유해서, **미리보기 건수 = 실제 삭제 시 삭제되는 행 수**와 일치합니다.

## 어떻게 확인하면 되나요?

1. **관리 페이지에서**  
   - `/manage` 접속 후 "현재 삭제 대상: N건 (7일 이전·비북마크)"가 뜨는지 봅니다.  
   - 정리 버튼 클릭 후 "M건 삭제됨"이 뜨고, 그 다음에 다시 표시되는 삭제 대상 건수가 줄어들었는지 확인합니다.  
   - (이전 삭제 대상이 모두 삭제되었다면 정리 후 삭제 대상은 0건이 됩니다.)

2. **API로 직접**  
   - 미리보기:  
     `GET /api/admin/cleanup` 또는 `GET /api/admin/cleanup?older_than_days=7`  
     → `would_delete`, `cutoff_iso`, `description` 등으로 조건 확인.  
   - 실행:  
     `POST /api/admin/cleanup`  
     body: `{ "older_than_days": 7 }` (생략 시 7일)  
     → `deleted`로 삭제된 건수 확인.

3. **코드로**  
   - `src/lib/db.ts`에서 `OLD_ARTICLES_EXCEPT_BOOKMARKED_SQL`,  
     `countOldArticlesExceptBookmarked`,  
     `deleteOldArticlesExceptBookmarked` 를 보면 조건과 삭제/건수 로직을 한 번에 확인할 수 있습니다.

요약하면, **“7일보다 오래된 기사 중 북마크 되지 않은 것만 삭제·건수에 포함된다”**는 것은  
위 SQL 조건과 `db.ts`/`cleanup` API가 그 조건을 공유하는 구조로 보장됩니다.
