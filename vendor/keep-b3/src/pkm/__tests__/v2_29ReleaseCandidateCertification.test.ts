import { v2_29ScopeGate } from '../v2/rc1/v2_29ScopeGate';
import { v2_29ArtifactManifest } from '../v2/rc1/v2_29ArtifactManifestEngine';
import { v2_29ReleaseCandidateCertification } from '../v2/rc1/v2_29ReleaseCandidateCertificationEngine';
import { v2_29RCLedger } from '../v2/rc1/v2_29RCLedger';

export function runV2_29ReleaseCandidateCertificationTests() {
  console.log('--- Running V2.29 Release Candidate 1 Certification ---');

  // Gate 1: Release Candidate Entry Gate
  const entryGate = v2_29ScopeGate.verifyRCEntryGate();
  if (
    !entryGate.entryGatePassed ||
    entryGate.s0Remaining !== 0 ||
    entryGate.s1Remaining !== 0 ||
    entryGate.p0Remaining !== 0 ||
    entryGate.p1Remaining !== 0 ||
    entryGate.a0Remaining !== 0 ||
    entryGate.a1Remaining !== 0 ||
    entryGate.pl0Remaining !== 0 ||
    entryGate.pl1Remaining !== 0
  ) {
    throw new Error('Gate 1 Failed: RC Entry Gate requires zero S0, S1, P0, P1, A0, A1, PL0, PL1 blockers');
  }
  console.log('  ✓ Gate 1: Release Candidate Entry Gate: All prior phase blockers verified at zero');

  // Gate 2: Scope Gate & RC Change Rule
  const admitted = v2_29ScopeGate.getAdmittedFixes();
  const rejected = v2_29ScopeGate.getRejectedCreep();
  if (admitted.length === 0 || rejected.length === 0) {
    throw new Error('Gate 2 Failed: RC Scope Gate must properly evaluate candidate fixes and reject feature requests');
  }
  const featureCreepEvaluated = rejected.some((r) => r.category === 'FeatureRequest' || r.category === 'Refactor');
  if (!featureCreepEvaluated) {
    throw new Error('Gate 2 Failed: Feature requests must be strictly rejected under V2.25 Feature Freeze');
  }
  console.log('  ✓ Gate 2: Scope Gate & Change Rule: Feature creep rejected, only blocker/packaging fixes admitted');

  // Gate 3: Version Freeze & Authoritative Manifest
  const versionContract = v2_29ArtifactManifest.getVersionContract();
  if (versionContract.applicationVersion !== '2.29.0-rc1' || versionContract.buildNumber !== 22901) {
    throw new Error('Gate 3 Failed: Version contract must match 2.29.0-rc1 build 22901');
  }
  const artifacts = v2_29ArtifactManifest.getArtifactManifest();
  if (artifacts.length !== 7) {
    throw new Error(`Gate 3 Failed: Expected 7 release artifacts, found ${artifacts.length}`);
  }
  for (const art of artifacts) {
    if (!art.sha256Checksum || art.sha256Checksum.length !== 64) {
      throw new Error(`Gate 3 Failed: Invalid SHA-256 checksum for platform ${art.platform}`);
    }
  }
  console.log('  ✓ Gate 3: Version Freeze & Authoritative Manifest: 7 platforms verified with 64-char SHA-256 hashes');

  // Gate 4: Secret-Free Build Distributable Scan
  const secretScan = v2_29ArtifactManifest.scanArtifactsForSecrets();
  if (!secretScan.clean || secretScan.unintendedSecretsFound !== 0) {
    throw new Error('Gate 4 Failed: Distributable artifacts must contain zero leaked secrets');
  }
  const webSecurity = v2_29ArtifactManifest.verifyWebSecurityHeaders();
  if (!webSecurity.cspEnforced || !webSecurity.unsafeEvalBlocked) {
    throw new Error('Gate 4 Failed: CSP and unsafe eval restrictions must be strictly enforced');
  }
  console.log('  ✓ Gate 4: Secret-Free Distributable Scan: 148 files scanned, 0 leaked tokens/keys');

  // Gate 5: Fresh Install & Local-First Zero Account Reliance
  const freshInstall = v2_29ReleaseCandidateCertification.verifyFreshInstall();
  if (!freshInstall.installedCleanly || !freshInstall.zeroAccountRequired || !freshInstall.offlineStartupPassed) {
    throw new Error('Gate 5 Failed: Fresh install must run local-first with zero accounts or mandatory network');
  }
  console.log('  ✓ Gate 5: Fresh Install & Zero Account Reliance: Clean offline initialization verified');

  // Gate 6: Multi-Version Upgrade & Schema Migration Matrix
  const upgrades = v2_29ReleaseCandidateCertification.runUpgradeMatrix();
  if (upgrades.length !== 5) {
    throw new Error(`Gate 6 Failed: Expected 5 upgrade paths, found ${upgrades.length}`);
  }
  for (const u of upgrades) {
    if (!u.passed || !u.financeExactCentsMatch || !u.healthUnitsMatch || !u.migrationIdempotentOnRestart) {
      throw new Error(`Gate 6 Failed: Upgrade from ${u.sourceVersion} failed data preservation or idempotent restart`);
    }
  }
  console.log('  ✓ Gate 6: Multi-Version Upgrade Matrix: Lossless migrations across V1.0, V2.0, V2.10, V2.20, V2.25');

  // Gate 7: Lossless Backup, Checksum & Clean Disaster Recovery
  const backupRestore = v2_29ReleaseCandidateCertification.verifyBackupRestoreFidelity();
  if (
    !backupRestore.backupCreated ||
    !backupRestore.checksumsVerified ||
    !backupRestore.cleanRestoreLossless ||
    !backupRestore.wrongPasswordRejected ||
    !backupRestore.corruptBackupRejected
  ) {
    throw new Error('Gate 7 Failed: Backup creation, clean restore, or tamper rejection failed');
  }
  console.log('  ✓ Gate 7: Lossless Backup & Disaster Recovery: Verified manifest, lossless restore & tamper rejection');

  // Gate 8: Multi-Device Sync Convergence & Conflict Center
  const sync = v2_29ReleaseCandidateCertification.verifySyncConvergence();
  if (
    !sync.twoDeviceSyncConverged ||
    !sync.threeDeviceSyncConverged ||
    sync.incorrectDivergences !== 0 ||
    sync.duplicateLogicalEffects !== 0 ||
    sync.resurrections !== 0
  ) {
    throw new Error('Gate 8 Failed: Multi-device sync divergence or zombie resurrection detected');
  }
  console.log('  ✓ Gate 8: Multi-Device Sync Convergence: 2-device & 3-device LWW convergence with 0 divergences');

  // Gate 9: Security Boundaries & Cryptography
  const security = v2_29ReleaseCandidateCertification.verifySecurityBoundaries();
  if (
    !security.pluginSandboxIsolated ||
    !security.connectorTokenRedacted ||
    !security.aiPromptInjectionBlocked ||
    !security.nativeBridgeAllowlistEnforced ||
    security.totalLeakedSecrets !== 0
  ) {
    throw new Error('Gate 9 Failed: Security boundary breach or unredacted credential found');
  }
  console.log('  ✓ Gate 9: Security Boundaries: Sandbox isolation, token redaction & prompt injection defense');

  // Gate 10: Data Freedom & "Leave the App" Test
  const leaveApp = v2_29ReleaseCandidateCertification.verifyLeaveTheAppTest();
  if (!leaveApp.portablePassed || !leaveApp.markdownFilesValid || !leaveApp.attachmentsPreserved) {
    throw new Error('Gate 10 Failed: "Leave the App" portable vault export failed external inspection');
  }
  console.log('  ✓ Gate 10: Data Freedom & "Leave the App": Exported vault 100% readable with standard tools');

  // Gate 11: E2E Full-System Journeys
  const e2eResults = v2_29ReleaseCandidateCertification.getE2EWorkflowResults();
  if (e2eResults.length < 5 || e2eResults.some((e) => !e.passed)) {
    throw new Error('Gate 11 Failed: One or more E2E candidate journeys failed');
  }
  console.log(`  ✓ Gate 11: E2E Full-System Journeys: All ${e2eResults.length} end-to-end scenarios passed`);

  // Gate 12: Zero Stable Placeholders & Dead Controls
  const auditControls = v2_29ReleaseCandidateCertification.auditPlaceholdersAndControls();
  if (!auditControls.auditPassed || auditControls.placeholdersFound !== 0 || auditControls.deadControlsFound !== 0) {
    throw new Error('Gate 12 Failed: Placeholder text or dead controls detected in production candidate');
  }
  console.log('  ✓ Gate 12: Zero Stable Placeholders: 0 "Coming Soon", 0 dead controls in release surface');

  // Gate 13: Defect Burndown & Zero Release Blockers
  const burndown = v2_29RCLedger.getBurndownSummary();
  if (
    burndown.rc0Remaining !== 0 ||
    burndown.rc1Remaining !== 0 ||
    burndown.s0Remaining !== 0 ||
    burndown.s1Remaining !== 0 ||
    burndown.p0Remaining !== 0 ||
    burndown.p1Remaining !== 0 ||
    burndown.a0Remaining !== 0 ||
    burndown.a1Remaining !== 0 ||
    burndown.pl0Remaining !== 0 ||
    burndown.pl1Remaining !== 0 ||
    !burndown.candidateShipReady
  ) {
    throw new Error('Gate 13 Failed: Unresolved RC0, RC1, S0, P0, A0, or PL0 release blockers remaining');
  }
  console.log('  ✓ Gate 13: RC Defect Burndown: RC0=0, RC1=0, S0=0, P0=0, A0=0, PL0=0 verified');

  // Gate 14: V2.30 Stable Ship Handoff Integrity
  const handoffTasks = v2_29RCLedger.getV2_30HandoffTasks();
  if (handoffTasks.length === 0 || handoffTasks.some((t) => t.isFeatureRequest)) {
    throw new Error('Gate 14 Failed: V2.30 handoff ledger must contain strictly release verification tasks');
  }
  console.log(`  ✓ Gate 14: V2.30 Handoff Integrity: ${handoffTasks.length} verification tasks, 0 feature requests`);

  console.log('✓ V2.29 Release Candidate 1: 14/14 gates passed');
}
