#!/usr/bin/env bash
# 1) 이미 커밋된 .wrangler 제거 후 2) workflow 권한 추가 3) 푸시
# 실행: bash scripts/fix-push-and-clean-wrangler.sh

set -e
cd "$(dirname "$0")/.."

echo "=== 1. .wrangler 추적 해제 및 .gitignore 반영 ==="
git rm -r --cached .wrangler 2>/dev/null || true
git rm -r --cached workers/digest/.wrangler 2>/dev/null || true
git add .gitignore
git commit --amend --no-edit

echo "=== 2. GitHub 토큰에 workflow 권한 추가 ==="
gh auth refresh -s workflow

echo "=== 3. 푸시 ==="
git push -u origin main

echo "=== 완료 ==="
