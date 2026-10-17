/**
 * V1 Plugin Compatibility Layer
 * Verifies plugin manifests against V2 permission policies and provides
 * non-breaking action execution shims.
 */

export interface V1PluginManifest {
  id: string;
  name: string;
  version: string;
  permissions?: string[];
  main?: string;
}

export interface PluginCompatibilityCheck {
  pluginId: string;
  isCompatible: boolean;
  status: 'compatible_unchanged' | 'compatible_via_shim' | 'requires_update' | 'unsupported';
  reason?: string;
}

export class V1PluginCompatService {
  public checkCompatibility(manifest: V1PluginManifest): PluginCompatibilityCheck {
    if (!manifest.id || !manifest.name) {
      return {
        pluginId: manifest.id || 'unknown',
        isCompatible: false,
        status: 'unsupported',
        reason: 'Missing required manifest identification fields',
      };
    }

    // Check permissions
    const forbiddenPerms = ['network:unrestricted', 'filesystem:raw_access'];
    const hasForbidden = (manifest.permissions || []).some((p) => forbiddenPerms.includes(p));
    if (hasForbidden) {
      return {
        pluginId: manifest.id,
        isCompatible: false,
        status: 'requires_update',
        reason: 'Plugin requests unrestricted V1 permissions forbidden in V2 security sandbox',
      };
    }

    return {
      pluginId: manifest.id,
      isCompatible: true,
      status: 'compatible_unchanged',
    };
  }
}

export const v1PluginCompatService = new V1PluginCompatService();
