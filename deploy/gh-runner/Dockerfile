# syntax=docker/dockerfile:1.4

FROM ghcr.io/spigell/codex-binary:v0.46.0-27acc7 AS codex

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    RUNNER_VERSION=2.328.0 \
    RUNNER_USER=runner \
    RUNNER_HOME=/home/runner \
    ACTIONS_RUNNER_DIR=/actions-runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        jq \
        git \
        iproute2 \
        libcurl4 \
        libgssapi-krb5-2 \
        libicu70 \
        libkrb5-3 \
        liblttng-ust1 \
        libssl3 \
        libstdc++6 \
        unzip \
        zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY --from=codex /usr/local/bin/codex /usr/local/bin/codex

RUN groupadd --gid 1001 "${RUNNER_USER}" \
    && useradd --home "${RUNNER_HOME}" --create-home --uid 1001 --gid 1001 --shell /bin/bash "${RUNNER_USER}" \
    && mkdir -p "${ACTIONS_RUNNER_DIR}" \
    && chown "${RUNNER_USER}:${RUNNER_USER}" "${ACTIONS_RUNNER_DIR}"

WORKDIR ${ACTIONS_RUNNER_DIR}

RUN curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" -o runner.tar.gz \
    && tar --extract --file runner.tar.gz \
    && rm runner.tar.gz \
    && ./bin/installdependencies.sh \
    && chown -R "${RUNNER_USER}:${RUNNER_USER}" "${ACTIONS_RUNNER_DIR}"

RUN <<'EOF'
cat >/usr/local/bin/entrypoint.sh <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Environment variable ${name} must be set." >&2
    exit 1
  fi
}

require_env "GITHUB_URL"
require_env "RUNNER_TOKEN"

RUNNER_NAME="${RUNNER_NAME:-$(hostname)}"
RUNNER_WORKDIR="${RUNNER_WORKDIR:-_work}"
RUNNER_LABELS="${RUNNER_LABELS:-}"
RUNNER_GROUP="${RUNNER_GROUP:-Default}"

config_args=(--unattended --url "${GITHUB_URL}" --token "${RUNNER_TOKEN}" --name "${RUNNER_NAME}" --work "${RUNNER_WORKDIR}" --ephemeral)
if [[ -n "${RUNNER_GROUP}" ]]; then
  config_args+=(--runnergroup "${RUNNER_GROUP}")
fi
if [[ -n "${RUNNER_LABELS}" ]]; then
  config_args+=(--labels "${RUNNER_LABELS}")
fi

./config.sh "${config_args[@]}"

export RUNNER_FEATURE_FLAG_EPHEMERAL="${RUNNER_FEATURE_FLAG_EPHEMERAL:-1}"

exec ./run.sh --once
SCRIPT
EOF

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && chown "${RUNNER_USER}:${RUNNER_USER}" /usr/local/bin/entrypoint.sh

USER ${RUNNER_USER}

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
