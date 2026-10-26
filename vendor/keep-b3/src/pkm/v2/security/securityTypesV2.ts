/**
 * V2.8 Security, Privacy, Trust Boundaries & Adversarial Hardening
 * Central Security Types & Capability Models
 */

export type TrustLevelV2 =
  | 'core_trusted'                 // Reviewed core engine code
  | 'sandboxed_extension'          // Third-party / user plugin code (untrusted code)
  | 'external_authenticated_source' // OAuth connectors / known sync remotes (untrusted data)
  | 'external_untrusted_data'       // Files, imports, URLs, remote HTML, deep links, backups
  | 'generated_untrusted_data';     // AI generation / transformed data

export type DomainSensitivityV2 =
  | 'highly_sensitive' // Health, Finance, Credentials, Private Keys
  | 'sensitive'        // People contacts, Future Travel, Private Decisions, Asset IDs
  | 'standard_vault';  // Notes, Projects, Courses, Tasks, Canvas

export type SecurityCapabilityV2 =
  | 'vault.read'
  | 'vault.write'
  | 'notes.read'
  | 'notes.write'
  | 'finance.read'
  | 'finance.write'
  | 'health.read'
  | 'health.write'
  | 'credentials.use'
  | 'network.request'
  | 'filesystem.read.selected'
  | 'filesystem.write.selected'
  | 'notifications.schedule'
  | 'ai.invoke'
  | 'native.openExternal'
  | 'native.filePicker'
  | 'backup.manage'
  | 'sync.manage'
  | 'publication.manage';

export type ThreatSeverityV2 = 'S0_CRITICAL' | 'S1_HIGH' | 'S2_MEDIUM' | 'S3_LOW';

export interface SecurityGrantV2 {
  subjectId: string; // plugin ID, connector ID, or session ID
  subjectType: 'plugin' | 'connector' | 'ai_context' | 'workflow' | 'system';
  grantedCapabilities: Set<SecurityCapabilityV2>;
  allowedOrigins?: string[];
  expiresAt?: number;
  revoked: boolean;
  grantSessionGeneration: number;
}

export interface SecurityViolationV2 {
  id: string;
  timestamp: number;
  subjectId: string;
  attemptedCapability: SecurityCapabilityV2 | string;
  trustLevel: TrustLevelV2;
  severity: ThreatSeverityV2;
  reason: string;
  blocked: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface DataEgressChannelV2 {
  channelId: string;
  channelName: string;
  dataExfiltratable: string;
  userActionRequired: boolean;
  defaultSensitiveDomainPolicy: 'excluded' | 'explicit_opt_in' | 'prompt_per_use';
  destination: string;
  encryptedInTransit: boolean;
  retainsThirdPartyData: boolean;
  credentialsInvolved: boolean;
}

export interface SecurityAuditReportV2 {
  timestamp: number;
  version: '2.8.0';
  threatModelVerified: boolean;
  trustBoundariesAuditPassed: boolean;
  zeroTelemetryVerified: boolean;
  encryptionLifecycleCertified: boolean;
  redTeamSuitesPassed: boolean;
  totalSecurityViolationsBlocked: number;
  dataEgressMatrix: DataEgressChannelV2[];
}
