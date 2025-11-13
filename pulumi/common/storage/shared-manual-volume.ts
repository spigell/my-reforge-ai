import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

export type SharedVolumeArgs = {
  namespace: pulumi.Input<string>;
  hostPath?: pulumi.Input<string>;
  nodeHostname?: pulumi.Input<string>;
  storageSize?: pulumi.Input<string>;
  claimSize?: pulumi.Input<string>;
  volumeName?: pulumi.Input<string>;
  claimName?: pulumi.Input<string>;
};

export class SharedManualVolume extends pulumi.ComponentResource {
  public readonly volume: k8s.core.v1.PersistentVolume;
  public readonly claim: k8s.core.v1.PersistentVolumeClaim;

  constructor(name: string, args: SharedVolumeArgs, opts?: pulumi.ComponentResourceOptions) {
    super('my-reforge-ai:storage:SharedManualVolume', name, {}, opts);

    const volumeResourceName = `${name}-pv`;
    const claimResourceName = `${name}-pvc`;
    const volumeMetadataName = args.volumeName ?? volumeResourceName;
    const claimMetadataName = args.claimName ?? claimResourceName;
    const hostPath = args.hostPath ?? '/var/local-path-provisioner/pvc-bd327295-3488-4d8b-af44-ef20a0194833_sync-hub_dragonfish-shared/my-reforge-ai-1';
    const nodeHostname = args.nodeHostname ?? 'master-1';

    this.volume = new k8s.core.v1.PersistentVolume(
      volumeResourceName,
      {
        metadata: { name: volumeMetadataName },
        spec: {
          storageClassName: '',
          capacity: {
            storage: args.storageSize ?? '5Gi',
          },
          accessModes: ['ReadWriteOnce'],
          hostPath: {
            path: hostPath,
          },
          nodeAffinity: {
            required: {
              nodeSelectorTerms: [
                {
                  matchExpressions: [
                    {
                      key: 'kubernetes.io/hostname',
                      operator: 'In',
                      values: [nodeHostname],
                    },
                  ],
                },
              ],
            },
          },
          claimRef: {
            name: claimMetadataName,
            namespace: args.namespace,
          },
        },
      },
      { parent: this },
    );

    this.claim = new k8s.core.v1.PersistentVolumeClaim(
      claimResourceName,
      {
        metadata: {
          name: claimMetadataName,
          namespace: args.namespace,
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: {
            requests: {
              storage: args.claimSize ?? '1Gi',
            },
          },
          volumeName: this.volume.metadata.name,
        },
      },
      { parent: this, dependsOn: this.volume },
    );

    this.registerOutputs({
      volumeName: this.volume.metadata.name,
      claimName: this.claim.metadata.name,
    });
  }
}
