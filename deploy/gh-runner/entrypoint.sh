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
require_env "GITHUB_PAT"

readonly _RUNNER_SCOPE="${RUNNER_SCOPE:-repo}"
readonly _GITHUB_HOST="${GITHUB_HOST:-github.com}"
readonly _GITHUB_ORG="${GITHUB_ORG:-}"
readonly _GITHUB_ENTERPRISE="${GITHUB_ENTERPRISE:-}"
readonly _PAT_VALUE="${GITHUB_PAT}"
unset GITHUB_PAT

RUNNER_NAME="${RUNNER_NAME:-$(hostname)}"
RUNNER_WORKDIR="${RUNNER_WORKDIR:-_work}"
RUNNER_LABELS="${RUNNER_LABELS:-}"
RUNNER_GROUP="${RUNNER_GROUP:-Default}"
RUNNER_EPHEMERAL="${RUNNER_EPHEMERAL:-1}"
RUNNER_REPLACE="${RUNNER_REPLACE:-1}"
RUNNER_DISABLE_UPDATES=${RUNNER_DISABLE_UPDATES:-1}

ACTIVE_TOKEN=""

fetch_token() {
  local payload
  if ! payload=$(GITHUB_URL="${GITHUB_URL}" \
                  GITHUB_PAT="${_PAT_VALUE}" \
                  GITHUB_HOST="${_GITHUB_HOST}" \
                  RUNNER_SCOPE="${_RUNNER_SCOPE}" \
                  GITHUB_ORG="${_GITHUB_ORG}" \
                  GITHUB_ENTERPRISE="${_GITHUB_ENTERPRISE}" \
                  /usr/local/bin/fetch-runner-token.sh); then
    echo "Failed to obtain runner registration token." >&2
    exit 1
  fi
  jq -r '.token' <<<"${payload}"
}

cleanup() {
  if [[ -f ".runner" ]]; then
    local token="${ACTIVE_TOKEN}"
    if [[ -z "${token}" || "${token}" == "null" ]]; then
      set +e
      local payload
      payload=$(GITHUB_URL="${GITHUB_URL}" \
                GITHUB_PAT="${_PAT_VALUE}" \
                GITHUB_HOST="${_GITHUB_HOST}" \
                RUNNER_SCOPE="${_RUNNER_SCOPE}" \
                GITHUB_ORG="${_GITHUB_ORG}" \
                GITHUB_ENTERPRISE="${_GITHUB_ENTERPRISE}" \
                /usr/local/bin/fetch-runner-token.sh 2>/dev/null)
      local status=$?
      set -e
      if [[ ${status} -eq 0 ]]; then
        set +e
        local maybe_token
        maybe_token=$(jq -r '.token' <<<"${payload}")
        local jq_status=$?
        set -e
        if [[ ${jq_status} -eq 0 ]]; then
          token="${maybe_token}"
        fi
      fi
    fi
    if [[ -n "${token}" && "${token}" != "null" ]]; then
      ./config.sh remove --token "${token}" || true
    fi
  fi
}

trap cleanup EXIT INT TERM

mkdir -p "${RUNNER_WORKDIR}"

token="$(fetch_token)"
ACTIVE_TOKEN="${token}"

config_args=(
  --unattended
  --url "${GITHUB_URL}"
  --token "${token}"
  --name "${RUNNER_NAME}"
  --work "${RUNNER_WORKDIR}"
)

if [[ "${RUNNER_REPLACE}" == "1" ]]; then
  config_args+=(--replace)
fi

if [[ "${RUNNER_EPHEMERAL}" == "1" ]]; then
  config_args+=(--ephemeral)
fi

if [[ -n "${RUNNER_GROUP}" ]]; then
  config_args+=(--runnergroup "${RUNNER_GROUP}")
fi

if [[ -n "${RUNNER_LABELS}" ]]; then
  config_args+=(--labels "${RUNNER_LABELS}")
fi

if [[ "${RUNNER_DISABLE_UPDATES}" == "1" ]]; then
  config_args+=(--disableupdate)
fi

./config.sh "${config_args[@]}"

exec ./run.sh
