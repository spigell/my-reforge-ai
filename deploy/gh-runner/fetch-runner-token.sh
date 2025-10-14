#!/usr/bin/env bash
set -euo pipefail

github_url="${GITHUB_URL:?GITHUB_URL is required}"
pat="${GITHUB_PAT:?GITHUB_PAT is required}"
github_host="${GITHUB_HOST:-github.com}"
scope="${RUNNER_SCOPE:-repo}"
scope="${scope,,}"

if [[ "${github_host}" == "github.com" ]]; then
  api_base="https://api.${github_host}"
else
  api_base="https://${github_host}/api/v3"
fi

case "${scope}" in
  org*)
    org="${GITHUB_ORG:-}"
    if [[ -z "${org}" ]]; then
      org="$(basename "${github_url}")"
    fi
    if [[ -z "${org}" ]]; then
      echo "GITHUB_ORG must be set when RUNNER_SCOPE is org." >&2
      exit 1
    fi
    request_url="${api_base}/orgs/${org}/actions/runners/registration-token"
    ;;
  enterprise*)
    enterprise="${GITHUB_ENTERPRISE:-}"
    if [[ -z "${enterprise}" ]]; then
      echo "GITHUB_ENTERPRISE must be set when RUNNER_SCOPE is enterprise." >&2
      exit 1
    fi
    request_url="${api_base}/enterprises/${enterprise}/actions/runners/registration-token"
    ;;
  *)
    trimmed="${github_url#http://}"
    trimmed="${trimmed#https://}"
    trimmed="${trimmed#${github_host}/}"
    trimmed="${trimmed%/}"
    owner="${trimmed%%/*}"
    repo="${trimmed#*/}"
    repo="${repo%%.git}"
    if [[ -z "${owner}" || -z "${repo}" || "${repo}" == "${owner}" ]]; then
      echo "Unable to parse owner/repo from GITHUB_URL=${github_url}" >&2
      exit 1
    fi
    request_url="${api_base}/repos/${owner}/${repo}/actions/runners/registration-token"
    ;;
esac

curl -fsSL \
  -X POST \
  -H "Authorization: token ${pat}" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Length: 0" \
  "${request_url}"
