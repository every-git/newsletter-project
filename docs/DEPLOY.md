# 자동 배포 (GitHub → Cloudflare)

`main` 브랜치에 푸시하면 GitHub Actions가 다음을 순서대로 배포합니다.

1. **메인 앱** (Astro SSR Worker + Assets)
2. **workers/collect** (수집 Cron)
3. **workers/digest** (다이제스트 Cron)

## 레포 아직 없을 때 (한 번에 하기)

터미널을 열고 **프로젝트 루트**로 이동한 뒤, 아래 중 하나만 실행하면 됩니다.

**방법 A: 스크립트 한 번에 실행**

```bash
cd "/Volumes/Samsung X5/Projects/newsletter-project"
bash scripts/setup-github-repo.sh
```

**방법 B: 명령어를 그대로 복사해서 한 블록씩 붙여넣기**

```bash
cd "/Volumes/Samsung X5/Projects/newsletter-project"
git init && git branch -M main
git add .
git commit -m "Initial commit: newsletter project with Astro, Workers, D1, KV, GitHub Actions deploy"
gh repo create newsletter-project --public --source=. --remote=origin --push
```

- GitHub 사용자명이 `every-git`이 아니면 `gh repo create`에서 레포 이름을 원하는 대로 바꿔도 됩니다.
- 완료 후 `https://github.com/every-git/newsletter-project` 에서 레포를 확인할 수 있습니다.

---

## 사전 준비 (배포까지)

### 1. GitHub 레포 생성 후 코드 푸시

위 "레포 아직 없을 때"를 이미 했다면 이 단계는 생략합니다. 다른 레포를 쓰려면:

```bash
git remote add origin https://github.com/YOUR_USERNAME/newsletter-project.git
git push -u origin main
```

### 2. Cloudflare API 토큰 생성

1. [Cloudflare 대시보드](https://dash.cloudflare.com) → **My Profile** → **API Tokens**
2. **Create Token** → **Edit Cloudflare Workers** 템플릿 사용 또는 커스텀:
   - Permissions: **Account** → **Cloudflare Workers Scripts** (Edit), **Account** → **Account Settings** (Read)
   - Account Resources: 본인 계정
3. **Continue to summary** → **Create Token** 후 토큰 값을 복사 (한 번만 표시됨)

### 3. Account ID 확인

Cloudflare 대시보드 **Workers & Pages** 진입 후 오른쪽 패널에서 **Account ID** 복사.

### 4. GitHub 저장소 시크릿 등록

레포 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|------|--------|
| `CLOUDFLARE_API_TOKEN` | 위에서 만든 API 토큰 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID |

## 동작

- **자동**: `main`에 `git push` 시 workflow 실행
- **수동**: 레포 **Actions** 탭 → **Deploy to Cloudflare** → **Run workflow**

## 참고

- **OPENROUTER_API_KEY**: digest 워커용 시크릿은 이미 `wrangler secret put`으로 Cloudflare에 저장되어 있으면, GitHub Secrets에 넣을 필요 없음. 새 환경이면 로컬에서 한 번 `cd workers/digest && npx wrangler secret put OPENROUTER_API_KEY` 실행.
