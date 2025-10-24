#!/usr/bin/env bash
# gemini-logout.sh — log out of Gemini CLI (Ubuntu-safe)
set -euo pipefail

GEMINI_DIR="${GEMINI_HOME:-$HOME/.gemini}"
AUTH_FILES=(oauth_creds.json google_accounts.json installation_id)

echo "Gemini config dir: $GEMINI_DIR"
[[ -d "$GEMINI_DIR" ]] || { echo "Nothing to do; $GEMINI_DIR not found."; exit 0; }

echo "Removing auth files…"
for f in "${AUTH_FILES[@]}"; do
  path="$GEMINI_DIR/$f"
  if [[ -f "$path" ]]; then
    rm -fv "$path"
  else
    echo "  $f not present"
  fi
done
