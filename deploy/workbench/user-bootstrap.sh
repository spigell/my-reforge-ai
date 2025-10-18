#!/usr/bin/env bash
set -euo pipefail

USER_NAME="ubuntu"
USER_HOME="/home/${USER_NAME}"
HH_TOKEN_SECRET_SOURCE="/secrets/hh-token/hh-token.txt"
HH_TOKEN_SECRET_DEST="${USER_HOME}/.hh-token.txt"

# This script is now intended to be run as USER_NAME (e.g. uid 1000)
# It sets up the user environment and then runs a specific agent's setup.

# Common environment setup
# Create necessary directories
mkdir -p "${USER_HOME}"/{.home,.cache/gomod,.cache/gobuild,.cache/gopath,go/bin}

# Create symbolic link for hh-token
ln -sf "${HH_TOKEN_SECRET_SOURCE}" "${HH_TOKEN_SECRET_DEST}"

# Append to .bashrc
cat >> "${USER_HOME}/.bashrc" <<'EOF'

# -- Appended by user-bootstrap.sh --
# Completions (ignore errors if not present)
[ -f /usr/share/bash-completion/completions/make ] && source /usr/share/bash-completion/completions/make

export PATH=/usr/local/share/fnm/aliases/default/bin:/usr/local/share/pyenv/shims:/usr/local/share/pyenv/bin:/usr/local/share/dotnet:~/go/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
EOF

# Setup git workbench
setup-git-workbench --name "workbench bot" --email spigelly+gh-bot@gmail.com --editor vim


case "${1:-}" in
  codex)
    echo ">>> Codex (local) for ${USER_NAME}"

    CODEX_CONFIG_SOURCE="/project/deploy/workbench/codex/codex-config.toml"
    CODEX_CONFIG_DEST="${USER_HOME}/.codex/config.toml"

    rm -rf "${CODEX_CONFIG_DEST}"
    ln -s "${CODEX_CONFIG_SOURCE}" "${CODEX_CONFIG_DEST}"
    
    echo ">>> Starting sleep loop"
    sleep infinity
    ;;
  gemini)
    echo ">>> Gemini-cli (local) for ${USER_NAME}"
    echo ">>> Starting sleep loop"
    sleep infinity
    ;;
  *)
    echo "Usage: $0 {codex|gemini}" >&2
    exit 1
    ;;
esac
