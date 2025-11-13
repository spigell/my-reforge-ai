import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { McpServerMonitoringOptions } from './types.js';

export type McpPodScrapeArgs = {
  name: string;
  namespace: pulumi.Input<string>;
  labels?: Record<string, pulumi.Input<string>>;
  monitoring?: McpServerMonitoringOptions;
};

export const createMcpPodScrape = (
  args: McpPodScrapeArgs,
  opts?: pulumi.CustomResourceOptions,
): k8s.apiextensions.CustomResource | undefined => {
  const monitoring = {
    enabled: true,
    portName: 'http',
    scrapeInterval: '30s',
    ...(args.monitoring ?? {}),
  };

  if (monitoring.enabled === false) {
    return undefined;
  }

  const labels = args.labels ?? {
    app: args.name,
  };

  return new k8s.apiextensions.CustomResource(
    `${args.name}-scrape`,
    {
      apiVersion: 'operator.victoriametrics.com/v1beta1',
      kind: 'VMPodScrape',
      metadata: {
        name: `${args.name}-scraper`,
        namespace: args.namespace,
        labels,
      },
      spec: {
        podMetricsEndpoints: [
          {
            port: monitoring.portName ?? 'http',
            scheme: 'http',
            scrape_interval: monitoring.scrapeInterval ?? '30s',
          },
        ],
        selector: {
          matchLabels: labels,
        },
      },
    },
    opts,
  );
};
