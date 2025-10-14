# syntax=docker/dockerfile:1.4

FROM ghcr.io/spigell/codex-binary:v0.46.0-27acc7 AS codex

FROM ubuntu:24.04

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
        libicu74 \
        libkrb5-3 \
        liblttng-ust1 \
        libssl3 \
        libstdc++6 \
        unzip \
        zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY --from=codex /usr/local/bin/codex /usr/local/bin/codex

RUN groupadd --gid 7000 "${RUNNER_USER}" \
    && useradd --home "${RUNNER_HOME}" --create-home --uid 7000 --gid 7000 --shell /bin/bash "${RUNNER_USER}" \
    && mkdir -p "${ACTIONS_RUNNER_DIR}" \
    && chown "${RUNNER_USER}:${RUNNER_USER}" "${ACTIONS_RUNNER_DIR}"

WORKDIR ${ACTIONS_RUNNER_DIR}

RUN curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" -o runner.tar.gz \
    && tar --extract --file runner.tar.gz \
    && rm runner.tar.gz \
    && ./bin/installdependencies.sh \
    && chown -R "${RUNNER_USER}:${RUNNER_USER}" "${ACTIONS_RUNNER_DIR}"

COPY fetch-runner-token.sh /usr/local/bin/fetch-runner-token.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/fetch-runner-token.sh /usr/local/bin/entrypoint.sh \
    && chown "${RUNNER_USER}:${RUNNER_USER}" /usr/local/bin/fetch-runner-token.sh /usr/local/bin/entrypoint.sh

USER ${RUNNER_USER}

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
