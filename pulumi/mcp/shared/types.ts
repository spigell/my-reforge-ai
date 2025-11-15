import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';


export type McpServerArgs = McpBasicServerArgs & {
  namespace: pulumi.Input<string>;
  initContainers?: k8s.types.input.core.v1.Container[];
  automountServiceAccountToken?: pulumi.Input<boolean>;
  volumes?: k8s.types.input.core.v1.Volume[];
  volumeMounts?: k8s.types.input.core.v1.VolumeMount[];
};

export type McpBasicServerArgs = {
  enabled?: boolean;
  image: string;
  labels?: Record<string, pulumi.Input<string>>;
  port?: number;
  allowOrigins?: string[];
  replicas?: number;
  resources: k8s.types.input.core.v1.ResourceRequirements;
  command?: string[];
  args?: string[];
  additionalEnv?: k8s.types.input.core.v1.EnvVar[];
  enableInspector?: boolean;
  inspectorImage?: string;
  monitoring?: McpServerMonitoringOptions;
  serviceAccountName?: pulumi.Input<string> | string;
  sharedCodeMount?: SharedCodeMountOptions;
};

export type SharedCodeMountOptions = {
  enabled?: boolean;
};

export type McpServerSecretRef = {
  name: pulumi.Input<string>;
  key: pulumi.Input<string>;
};

export type McpServerMonitoringOptions = {
  enabled?: boolean;
  portName?: pulumi.Input<string>;
  scrapeInterval?: pulumi.Input<string>;
};
