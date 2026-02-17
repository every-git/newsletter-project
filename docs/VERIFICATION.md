# 뉴스 소스 및 OpenRouter 모델 검증 (2026년 2월 기준)

배포 전 또는 주기적으로 뉴스 수집 소스 URL과 OpenRouter 무료 모델 ID를 확인하세요.

---

## 1. 뉴스 수집 소스 (src/lib/sources/sources-config.ts)

| 소스 ID | 이름 | URL | 검증 포인트 |
|---------|------|-----|-------------|
| hackernews | Hacker News | https://hacker-news.firebaseio.com/v0/topstories.json | HN 공식 API, 변경 적음 |
| techcrunch | TechCrunch | https://techcrunch.com/feed/ | 2026년 2월 기준 공식 메인 피드 |
| theverge | The Verge | https://www.theverge.com/rss/index.xml | 공식 RSS |
| geeknews | 긱뉴스 | https://news.hada.io/rss/news | 하다.io RSS |
| cloudflare | Cloudflare Blog | https://blog.cloudflare.com/rss/ | 공식 블로그 RSS |
| yozm | 요즘IT | https://yozm.wishket.com/magazine/list-rss/ | 위시켓 매거진 RSS |
| github | GitHub Trending | https://github.com/trending | HTML 스크래핑 (구조 변경 시 파서 수정 필요) |
| reuters | Reuters | https://feeds.reuters.com/reuters/topNews | 로이터 톱뉴스 RSS |
| bbc | BBC World | https://feeds.bbci.co.uk/news/world/rss.xml | BBC 월드 RSS |
| yonhap | 연합뉴스 | https://www.yonhapnewstv.co.kr/browse/feed/ | 연합뉴스TV 최신 뉴스 (일부 문서는 http로 안내하나 https 지원) |

**검증 방법:** 주기적으로 각 URL을 브라우저 또는 `curl -I <URL>`로 열어 200 응답 및 RSS/JSON 유효성 확인. GitHub 트렌딩은 HTML 구조 변경 시 수집 로직(`src/lib/collect.ts`, `src/lib/sources/`) 점검.

---

## 2. OpenRouter 모델 (src/lib/llm/openrouter.ts)

다이제스트 생성 시 사용하는 모델 폴백 순서 및 무료 여부 (2026년 2월 기준 팩트체크).

| 순서 | 모델 ID | 상태 | 비고 |
|------|---------|------|------|
| 1 | `deepseek/deepseek-chat-v3-0324:free` | 사용 가능·무료 | OpenRouter Free 컬렉션에 등재 |
| 2 | `google/gemini-2.5-flash:free` | 사용 가능 권장 | `gemini-2.5-flash-preview`는 미제공. 안정 버전 `gemini-2.5-flash` + `:free` 사용 |
| 3 | `meta-llama/llama-4-maverick:free` | 사용 가능 | Llama 4 Maverick 존재. `:free` 적용 시 무료 tier 사용 (제한 있음) |

- **`:free` 접미사:** OpenRouter에서 무료 variant 사용. 요청/일 제한 있음.
- **검증 방법:** [OpenRouter Free Models](https://openrouter.ai/collections/free-models), [OpenRouter Models](https://openrouter.ai/models)에서 모델 ID 및 pricing 확인. 모델 추가/폐지 시 `src/lib/llm/openrouter.ts`의 `MODELS` 배열 수정.

---

## 3. 검증 주기 제안

- **뉴스 소스:** 분기 1회 또는 수집 실패 로그 발생 시 해당 URL 확인.
- **OpenRouter:** 모델 에러/폐지 공지 시 `openrouter.ts` 및 이 문서 업데이트.

이 문서는 2026년 2월 기준으로 작성되었습니다. 이후 시점에서는 위 URL·모델 ID를 다시 확인하는 것을 권장합니다.
