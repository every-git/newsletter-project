#!/usr/bin/env bash
# GitHub 레포 생성 + 초기 커밋 + 푸시 (한 번에 실행)
# 사용법: 터미널에서 이 파일이 있는 디렉터리로 이동 후
#   bash scripts/setup-github-repo.sh
# 또는 프로젝트 루트에서
#   bash scripts/setup-github-repo.sh

set -e
cd "$(dirname "$0")/.."

echo "=== 1. Git 초기화 ==="
git init
git branch -M main

echo ""
echo "=== 2. .gitignore 확인 (이미 있음) ==="
# .gitignore 있음

echo ""
echo "=== 3. 전체 추가 및 첫 커밋 ==="
git add .
git status
git commit -m "Initial commit: newsletter project with Astro, Workers, D1, KV, GitHub Actions deploy"

echo ""
echo "=== 4. GitHub 레포 생성 (every-git/newsletter-project) + remote + push ==="
gh repo create newsletter-project --public --source=. --remote=origin --push

echo ""
echo "=== 완료 ==="
echo "레포 주소: https://github.com/every-git/newsletter-project"
echo "이제 GitHub Settings → Secrets에 CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID 추가하면 자동 배포됩니다."
