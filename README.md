# Tech Digest

개인용 테크·세계 뉴스 다이제스트. RSS/API로 기사를 수집하고, OpenRouter LLM으로 요약·인사이트를 생성한 뒤 하루 2회(AM/PM) 다이제스트로 제공합니다.

## 스택

- **프론트**: Astro 5, Preact (islands), Tailwind 4
- **런타임**: Cloudflare Pages (SSR), D1, KV
- **워커**: Wrangler — 수집(Cron 매시), 다이제스트(Cron 04:00/16:00 KST)

## 프로젝트 구조

```
/
├── src/
│   ├── layouts/          # BaseLayout (nav: 홈, 전체 기사, 북마크, 관리)
│   ├── pages/            # 페이지 + API 라우트
│   │   ├── index.astro   # 홈 (최신 다이제스트)
│   │   ├── all.astro     # 전체 기사 (검색·필터·페이지네이션)
│   │   ├── article/[id].astro
│   │   ├── archive/[id].astro
│   │   ├── bookmarks.astro
│   │   ├── manage.astro  # 기사 아카이브/삭제/복원
│   │   ├── admin.astro   # 수동 수집·다이제스트 (직접 URL 접근)
│   │   └── api/          # digest, articles, article/[id], bookmark, admin/*
│   ├── components/       # Astro/Preact 컴포넌트
│   ├── lib/              # 공유 로직
│   │   ├── sources/      # 뉴스 소스 (HN, RSS), sources-config
│   │   ├── llm/          # OpenRouter 클라이언트, 프롬프트
│   │   ├── collect.ts    # 수집 핵심
│   │   ├── digest.ts     # 다이제스트 핵심
│   │   ├── db.ts         # D1 쿼리
│   │   ├── scoring.ts
│   │   └── types.ts
│   └── styles/
├── workers/
│   ├── collect/          # 수집 워커 (Cron)
│   └── digest/           # 다이제스트 워커 (Cron)
├── db/
│   └── schema.sql        # D1 스키마
├── docs/                  # DEPLOY.md, VERIFICATION.md 등
└── .github/workflows/     # main 푸시 시 Cloudflare 자동 배포
```

## 로컬 실행

```bash
npm install
cp .dev.vars.example .dev.vars   # OPENROUTER_API_KEY 등 입력
npm run dev
```

- `/admin` 에서 수동 수집·다이제스트 생성 테스트 가능.
- D1/KV는 `wrangler.toml`의 `database_id` / `id`가 원격이면 같은 DB 사용, `local`이면 로컬 에뮬레이터.

## 빌드·배포

```bash
npm run build
npx wrangler pages deploy ./dist
cd workers/collect && npx wrangler deploy
cd workers/digest && npx wrangler deploy
```

자동 배포는 GitHub Actions 사용. `main` 푸시 시 워크플로 실행. 설정은 [docs/DEPLOY.md](docs/DEPLOY.md) 참고.

## 민감 정보 / Git에 올리지 않는 파일

다음 파일·디렉터리는 **커밋하지 않습니다** (`.gitignore`에 포함됨).

| 대상 | 이유 |
|------|------|
| `.dev.vars` | 로컬용 시크릿 (OPENROUTER_API_KEY 등). `.dev.vars.example`만 저장소에 있음. |
| `.env`, `.env.production` | 환경별 비밀/설정 |
| `.wrangler/` | Wrangler 로컬 상태 (D1/KV 에뮬레이터 데이터 등) |
| `dist/` | 빌드 산출물 |
| `node_modules/` | 의존성 (설치는 `npm install`로 복원) |

API 키·토큰은 **Cloudflare 시크릿**으로만 설정 (`wrangler secret put OPENROUTER_API_KEY`). `wrangler.toml`에는 `database_id`, KV `id` 같은 리소스 ID만 두고, 비밀 값은 넣지 않습니다.

## 문서

- [docs/DEPLOY.md](docs/DEPLOY.md) — 배포 순서, GitHub Actions, Cloudflare 시크릿
- [docs/VERIFICATION.md](docs/VERIFICATION.md) — 뉴스 소스·OpenRouter 모델 검증 (2026-02 기준)
- [CLAUDE.md](CLAUDE.md) — 프로젝트 스킬·규칙 요약
