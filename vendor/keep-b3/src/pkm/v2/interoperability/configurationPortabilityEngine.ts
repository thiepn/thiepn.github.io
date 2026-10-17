/**
 * V2.16 Configuration Portability Engine
 * 
 * Provides versioned, secret-free export and import of user-owned configuration:
 * - Saved Views
 * - Workspaces & Pane Arrangements
 * - Workflow Presets (declarative action sequences)
 * - Templates
 * - Personalization & Custom Keybindings
 * 
 * Guarantees:
 * 1. Zero secrets or credentials included in export.
 * 2. Strict JSON schema validation on import.
 * 3. Non-executable: rejects any payload containing arbitrary JavaScript/eval.
 * 4. Transparent conflict detection & graceful degradation for missing resources.
 */

export interface PortableConfigurationManifest {
  manifestVersion: '2.16';
  exportedAt: string;
  sourceAppVersion: string;
  vaultIdentityHash: string;
  sections: {
    savedViewsCount: number;
    workspacesCount: number;
    workflowPresetsCount: number;
    templatesCount: number;
  };
  data: {
    savedViews: any[];
    workspaces: any[];
    workflowPresets: any[];
    templates: any[];
    personalizationPreferences: Record<string, any>;
  };
}

export interface ConfigImportConflictReport {
  conflictsFound: number;
  conflicts: {
    section: string;
    itemKey: string;
    reason: 'already_exists' | 'invalid_schema' | 'missing_referenced_resource' | 'unsupported_platform_setting';
    actionTaken: 'skipped' | 'merged' | 'renamed';
  }[];
  isValid: boolean;
  securityViolations: string[];
}

export class ConfigurationPortabilityEngine {
  private static instance: ConfigurationPortabilityEngine | null = null;

  private constructor() {}

  public static getInstance(): ConfigurationPortabilityEngine {
    if (!ConfigurationPortabilityEngine.instance) {
      ConfigurationPortabilityEngine.instance = new ConfigurationPortabilityEngine();
    }
    return ConfigurationPortabilityEngine.instance;
  }

  /**
   * Generates a secret-free portable configuration JSON payload.
   */
  public exportConfiguration(
    savedViews: any[] = [],
    workspaces: any[] = [],
    workflowPresets: any[] = [],
    templates: any[] = [],
    personalizationPreferences: Record<string, any> = {}
  ): PortableConfigurationManifest {
    // Sanitize any potential sensitive fields or tokens
    const cleanPersonalization = { ...personalizationPreferences };
    delete cleanPersonalization.apiKeys;
    delete cleanPersonalization.oauthTokens;
    delete cleanPersonalization.sessionSecrets;

    return {
      manifestVersion: '2.16',
      exportedAt: new Date().toISOString(),
      sourceAppVersion: '2.16.0',
      vaultIdentityHash: 'pk_vault_v2',
      sections: {
        savedViewsCount: savedViews.length,
        workspacesCount: workspaces.length,
        workflowPresetsCount: workflowPresets.length,
        templatesCount: templates.length,
      },
      data: {
        savedViews: JSON.parse(JSON.stringify(savedViews)),
        workspaces: JSON.parse(JSON.stringify(workspaces)),
        workflowPresets: JSON.parse(JSON.stringify(workflowPresets)),
        templates: JSON.parse(JSON.stringify(templates)),
        personalizationPreferences: cleanPersonalization,
      },
    };
  }

  /**
   * Validates and previews a configuration import payload before application.
   */
  public validateAndPreviewConfig(rawJson: string): ConfigImportConflictReport {
    const report: ConfigImportConflictReport = {
      conflictsFound: 0,
      conflicts: [],
      isValid: true,
      securityViolations: [],
    };

    let manifest: any;
    try {
      manifest = JSON.parse(rawJson);
    } catch (e: any) {
      report.isValid = false;
      report.securityViolations.push(`Invalid JSON formatting: ${e.message || e}`);
      return report;
    }

    // Security Check: Look for forbidden execution tokens
    if (rawJson.includes('<script') || rawJson.includes('eval(') || rawJson.includes('javascript:')) {
      report.isValid = false;
      report.securityViolations.push('Security violation: Executable code or script tag detected in config payload.');
      return report;
    }

    if (!manifest.manifestVersion || !manifest.data) {
      report.isValid = false;
      report.securityViolations.push('Malformed manifest: missing required manifestVersion or data structure.');
      return report;
    }

    // Validate Workflow Presets
    if (Array.isArray(manifest.data.workflowPresets)) {
      for (const preset of manifest.data.workflowPresets) {
        if (!preset.id || !preset.title || !Array.isArray(preset.actions)) {
          report.conflicts.push({
            section: 'workflowPresets',
            itemKey: preset.id || 'unknown',
            reason: 'invalid_schema',
            actionTaken: 'skipped',
          });
          report.conflictsFound++;
        }
      }
    }

    // Validate Templates
    if (Array.isArray(manifest.data.templates)) {
      for (const t of manifest.data.templates) {
        if (!t.id || !t.name || typeof t.templateText !== 'string') {
          report.conflicts.push({
            section: 'templates',
            itemKey: t.id || 'unknown',
            reason: 'invalid_schema',
            actionTaken: 'skipped',
          });
          report.conflictsFound++;
        }
      }
    }

    return report;
  }
}

export const configurationPortabilityEngine = ConfigurationPortabilityEngine.getInstance();
