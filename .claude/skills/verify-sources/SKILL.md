---
name: verify-sources
description: 뉴스 수집 소스(sources-config.ts)의 URL이 docs/VERIFICATION.md와 일치하고, 소스 개수·타입·feed_type이 타입 정의를 만족하는지 검증합니다.
disable-model-invocation: true
---

# 뉴스 소스 검증

## Purpose

1. SOURCES 배열의 url·id·name이 VERIFICATION.md 표와 불일치하지 않는지
2. 모든 소스가 type·feed_type·interval을 가지는지 (SourceConfig 타입)
3. RSS/API URL 형식이 합리적인지 (http/https, 도메인 존재)

## When to Run

- src/lib/sources/sources-config.ts 또는 docs/VERIFICATION.md 변경 후
- verify-implementation 통합 검증 시

## Related Files

| File | Purpose |
|------|---------|
| src/lib/sources/sources-config.ts | 소스 정의 |
| src/lib/types.ts | SourceConfig 타입 |
| docs/VERIFICATION.md | 검증 기준 표 |

## Workflow

### Step 1: SourceConfig 타입 일치

**검사:** SOURCES의 각 항목이 id, name, url, type, feed_type, interval을 가짐.

```bash
grep -n "id:\|name:\|url:\|type:\|feed_type:\|interval:" src/lib/sources/sources-config.ts
```

**PASS:** 모든 소스에 6개 필드 존재. type은 rss|api|scrape, feed_type은 tech|world.  
**FAIL:** 필드 누락 또는 타입 enum 벗어남.  
**수정:** types.ts의 SourceConfig와 동일하게 맞춤.

### Step 2: VERIFICATION.md와 목록 일치

**검사:** VERIFICATION.md의 소스 표에 나온 id·url이 sources-config.ts와 일치.

```bash
grep -n "id:\|url:" src/lib/sources/sources-config.ts
```

**PASS:** VERIFICATION.md에 열거된 소스 ID와 URL이 config와 동일(순서 무관).  
**FAIL:** VERIFICATION.md에 없거나 URL이 다른 소스 존재.  
**수정:** config 또는 VERIFICATION.md 중 한쪽을 갱신하여 맞춤.

### Step 3: URL 형식

**검사:** url이 http:// 또는 https://로 시작.

```bash
grep "url:" src/lib/sources/sources-config.ts
```

**PASS:** 모든 url이 https:// 또는 http://로 시작.  
**FAIL:** 프로토콜 누락 또는 잘못된 형식.  
**수정:** url 문자열에 프로토콜 추가.

## Output Format

| 검사 | 결과 | 비고 |
|------|------|------|
| SourceConfig 타입 | PASS/FAIL | |
| VERIFICATION.md 일치 | PASS/FAIL | |
| URL 형식 | PASS/FAIL | |

## Exceptions

1. **VERIFICATION.md에만 있는 소스** — config에서 주석 처리된 소스는 검사 대상에서 제외.
2. **일시적 URL 변경** — 리다이렉트나 미러 URL이 문서에 명시된 경우 예외로 둘 수 있음.
