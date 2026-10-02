#!/usr/bin/env bash
# git-push-helper.sh — bantu commit & push ke repo webgal (setelah login git/gh)
# Tidak menyimpan password. Login sekali dengan: gh auth login  ATAU  git credential
set -euo pipefail

REPO_URL="${1:-}"
BRANCH="${2:-main}"

echo "Repo target (opsional arg1): $REPO_URL"
echo "Branch: $BRANCH"
echo ""
echo "=== Cara login GitHub (pilih satu) ==="
echo "A) GitHub CLI (disarankan):"
echo "     gh auth login"
echo "     # pilih GitHub.com → HTTPS → Login with browser"
echo ""
echo "B) Tanpa gh — Personal Access Token:"
echo "     git config --global user.name \"ayahelang\""
echo "     git config --global user.email \"EMAIL_GITHUB_ANDA\""
echo "     # Saat git push, username: ayahelang"
echo "     # password: tempel Personal Access Token (bukan password akun)"
echo ""
echo "C) Hanya lewat Chrome (tanpa terminal PC):"
echo "     1. Buka repo di GitHub"
echo "     2. Tekan tombol '.' (titik) → membuka github.dev editor"
echo "     3. Atau: Code → Codespaces → Create codespace (ada terminal di browser)"
echo "     4. Di Codespaces/github.dev terminal, jalankan script cleanup & git"
echo ""

if [[ -n "$REPO_URL" ]]; then
  if [[ ! -d .git ]]; then
    git init
    git branch -M "$BRANCH"
    git remote remove origin 2>/dev/null || true
    git remote add origin "$REPO_URL"
  fi
fi

git status || true
echo ""
echo "Contoh setelah cleanup:"
echo "  bash cleanup-unused.sh"
echo "  git add -A"
echo "  git commit -m \"chore: cleanup + revisi skills dropdown admin\""
echo "  git push -u origin $BRANCH"
