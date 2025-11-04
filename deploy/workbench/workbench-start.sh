#!/usr/bin/env bash
set -euo pipefail

# This script is now intended to be run as USER_NAME (e.g. uid 1000)
# It sets up the user environment and then runs a specific agent's setup.

USER_NAME="ubuntu"
USER_HOME="/home/${USER_NAME}"


# Common environment setup
# Create necessary directories
mkdir -p "${USER_HOME}"/{.home,.cache/gomod,.cache/gobuild,.cache/gopath,go/bin}

# Append to .bashrc
cat >> "${USER_HOME}/.bashrc" <<'EOF'

# -- Appended by workbench-start.sh --
# Source /etc/profile.d scripts
[ -d /etc/profile.d ] && for i in /etc/profile.d/*.sh; do [ -r "$i" ] && . "$i"; done

# Set PATH
export PATH=/usr/local/share/fnm/aliases/default/bin:/usr/local/share/pyenv/shims:/usr/local/share/pyenv/bin:/usr/local/share/dotnet:~/go/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
EOF

# Setup git workbench
setup-git-workbench --name "workbench ai bot" --email spigelly+gh-bot@gmail.com --editor vim


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

    GEMINI_CONFIG_SOURCE="/project/deploy/workbench/gemini/settings.json"
    GEMINI_CONFIG_DEST="${USER_HOME}/.gemini/settings.json"

    rm -rf "${GEMINI_CONFIG_DEST}"
    ln -s "${GEMINI_CONFIG_SOURCE}" "${GEMINI_CONFIG_DEST}"

    echo ">>> Starting sleep loop"
    sleep infinity
    ;;
  *)
    echo "Usage: $0 {codex|gemini}" >&2
    exit 1
    ;;
esac
