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

link-agent-config() {
  local label="$1"
  local source="$2"
  local dest="$3"

  echo ">>> ${label} for ${USER_NAME}"

  rm -rf "${dest}"
  ln -s "${source}" "${dest}"
}

start-codex-agent() {
  link-agent-config "Codex (local)" "/project/deploy/workbench/codex/codex-config.toml" "${USER_HOME}/.codex/config.toml"
  echo ">>> Starting sleep loop"
  sleep infinity
}

start-gemini-agent() {
  link-agent-config "Gemini-cli (local)" "/project/deploy/workbench/gemini/settings.json" "${USER_HOME}/.gemini/settings.json"
  link-agent-config "Gemini-cli (local)" "/project/deploy/workbench/gemini/commands" "${USER_HOME}/.gemini/commands"
  echo ">>> Starting sleep loop"
  sleep infinity
}

case "${1:-}" in
  codex)
    start-codex-agent
    ;;
  gemini)
    start-gemini-agent
    ;;
  *)
    echo "Usage: $0 {codex|gemini}" >&2
    exit 1
    ;;
esac
