# syntax=docker/dockerfile:1.4

FROM ghcr.io/spigell/codex-workbench:v0.46.0-5fc8ea

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
        libssl3t64 \
        libstdc++6 \
        unzip \
        zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY fetch-runner-token.sh /usr/local/bin/fetch-runner-token.sh

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

RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/fetch-runner-token.sh \
    && chown "${RUNNER_USER}:${RUNNER_USER}" /usr/local/bin/entrypoint.sh /usr/local/bin/fetch-runner-token.sh

USER ${RUNNER_USER}
ENV HOME=${RUNNER_HOME}

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
