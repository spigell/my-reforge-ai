export const createGithubMcpServerDeployment = (
  args: GithubMcpServerDeploymentArgs,
  opts?: McpServerDeploymentOpts,
) => {
  const allowOrigin = args.allowOrigin ?? '*';
  const port = 8080;
  const volumeName = 'github-server-bin';
  const initImage = args.initImage ?? 'alpine:3.20';
  const githubServerVersion = args.githubServerVersion ?? 'v0.18.0';
  const githubServerArchive =
    args.githubServerArchive ?? 'github-mcp-server_Linux_x86_64.tar.gz';

  const initCommand = [
    'set -euo pipefail',
    'apk add --no-cache curl',
    `VERSION="${githubServerVersion}"`,
    `ARCHIVE="${githubServerArchive}"`,
    'URL="https://github.com/github/github-mcp-server/releases/download/${VERSION}/${ARCHIVE}"',
    'curl -fsSL "${URL}" -o /tmp/github-mcp-server.tar.gz',
    'tar -xzf /tmp/github-mcp-server.tar.gz -C /tmp',
    'cp /tmp/github-mcp-server /github-server/github-mcp-server',
    'chmod +x /github-server/github-mcp-server',
  ].join('\n');

  return new McpServerDeployment(
    {
      name: args.name,
      namespace: args.namespace,
      replicas: args.replicas,
      initContainers: [
        {
          name: `${args.name}-github-server-binary`,
          image: initImage,
          imagePullPolicy: 'IfNotPresent',
          command: ['/bin/sh', '-c'],
          args: [initCommand],
          volumeMounts: [
            {
              name: volumeName,
              mountPath: '/github-server',
            },
          ],
        },
      ],
      volumes: [
        {
          name: volumeName,
          emptyDir: {},
        },
      ],
      proxyContainer: {
        name: 'proxy',
        image: args.proxyImage ?? 'ghcr.io/sparfenyuk/mcp-proxy:v0.9.0',
        env: [
          {
            name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
            valueFrom: {
              secretKeyRef: {
                name: args.personalAccessTokenSecret.name,
                key: args.personalAccessTokenSecret.key,
              },
            },
          },
        ],
        command: ['mcp-proxy'],
        args: [
          '--host=0.0.0.0',
          `--port=${port}`,
          `--allow-origin=${allowOrigin}`,
          '--pass-environment',
          '--',
          '/github-server/github-mcp-server',
          'stdio',
        ],
        ports: [
          {
            containerPort: port,
            name: 'http',
          },
        ],
        volumeMounts: [
          {
            name: volumeName,
            mountPath: '/github-server',
            readOnly: true,
          },
        ],
      },
      monitoring: args.monitoring,
      service: {
        enabled: true,
        port,
        targetPort: 'http',
        ...(args.service ?? {}),
      },
    },
    opts,
  );
};
