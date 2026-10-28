/**
 * V2.11 Post-Launch Issue Model & Incident Classes
 * 
 * Defines the standard production issue model and operational dimensions
 * for post-launch maintenance, patch triage, and disaster recovery.
 */

export type PostLaunchSeverity = 'S0' | 'S1' | 'S2' | 'S3';

export type IncidentClass =
  | 'Data Integrity Incident'   // Potential canonical data loss or corruption
  | 'Security Incident'         // Unauthorized access, credential leak, or sandbox escape
  | 'Availability Incident'     // App/feature unusable but data remains completely safe
  | 'Compatibility Incident'    // Platform, browser, plugin, connector, or version mismatch
  | 'Performance Incident'      // Severe latency regression or unbounded memory growth
  | 'UX Regression';            // Broken workflow or layout defect without data/security risk

export interface OperationalDimensions {
  isReproducible: boolean;
  hasDataRisk: boolean;
  hasSecurityRisk: boolean;
  isPlatformSpecific: boolean;
  affectedPlatform?: 'All' | 'Web/PWA' | 'macOS' | 'Windows' | 'Linux' | 'Android' | 'iOS';
  isMigrationRelated: boolean;
  isPluginRelated: boolean;
  isConnectorRelated: boolean;
  isPerformanceRelated: boolean;
  isRecoveryAvailable: boolean;
  recoveryMechanism?: string;
}

export interface PostLaunchIssue {
  id: string;
  title: string;
  firstAffectedVersion: string;
  affectedFeature: string;
  severity: PostLaunchSeverity;
  incidentClass: IncidentClass;
  dimensions: OperationalDimensions;
  reproductionSteps: string[];
  rootCause: string;
  affectsStableContract: boolean;
  requiresMigration: boolean;
  fixDescription: string;
  regressionTestId: string;
  requiresBackport: boolean;
  finalState:
    | 'Fixed'
    | 'Accepted limitation'
    | 'Beta limitation'
    | 'Experimental limitation'
    | 'Platform limitation'
    | 'Not reproducible';
}

export class PostLaunchIssueModelService {
  private static instance: PostLaunchIssueModelService;

  public static getInstance(): PostLaunchIssueModelService {
    if (!PostLaunchIssueModelService.instance) {
      PostLaunchIssueModelService.instance = new PostLaunchIssueModelService();
    }
    return PostLaunchIssueModelService.instance;
  }

  public validateIssue(issue: PostLaunchIssue): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!issue.id || !issue.id.startsWith('MNT-')) {
      errors.push('Issue ID must follow MNT-XXX format');
    }
    if (!issue.title) errors.push('Title is required');
    if (!issue.firstAffectedVersion) errors.push('First affected version is required');
    if (!issue.affectedFeature) errors.push('Affected feature is required');
    if (!issue.rootCause) errors.push('Root cause must be documented');
    if (!issue.fixDescription) errors.push('Fix description is required');
    if (!issue.regressionTestId) errors.push('Regression test ID must be specified');

    // Rule: S0 incidents must have data risk or security risk explicitly flagged
    if (issue.severity === 'S0' && !issue.dimensions.hasDataRisk && !issue.dimensions.hasSecurityRisk) {
      errors.push('S0 severity requires hasDataRisk or hasSecurityRisk to be true');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const postLaunchIssueModel = PostLaunchIssueModelService.getInstance();
