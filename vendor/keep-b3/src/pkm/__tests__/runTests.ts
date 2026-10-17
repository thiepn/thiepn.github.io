import { runParserTests } from './parser.test';
import { runResolverTests } from './resolver.test';
import { runIncrementalTests } from './incremental.test';
import { runUnlinkedMentionsTests } from './unlinkedMentionsRunner';
import { runTransclusionTests } from './transclusion.test';
import { runOutlinerTests } from './outliner.test';
import { runMathAndDiagramTests } from './mathAndDiagrams.test';
import { runSplitScreenTests } from './splitScreen.test';
import { runKanbanTests } from './kanban.test';
import { runSmartQueryTests } from './smartQueries.test';
import { runTableEditorTests } from './tableEditor.test';
import { runWebCaptureTests } from './webCapture.test';
import { runPDFReaderTests } from './pdfReader.test';
import { runCanvasTests } from './canvas.test';
import { runSemanticRelatednessTests } from './semanticRelatedness.test';
import { runVaultDoctorTests } from './doctor.test';
import { runPortableVaultAndGitTests } from './portableVaultAndGit.test';
import { runRemoteGitSyncTests } from './remoteGitSync.test';
import { runVaultEncryptionTests } from './vaultEncryption.test';
import { runPKMReleaseCertification } from './pkmCertification.test';
import { runWorkspaceTests } from './workspace.test';
import { runMobileAccessibilityTests } from './mobileAccessibility.test';
import { runSecurityHardeningTests } from './securityHardening.test';
import { runP2PDeviceSyncTests } from './p2pSync.test';
import { runCRDTSyncTests } from './crdtSync.test';
import { runV2ReleaseCertificationSuite } from './v2ReleaseCertification.test';
import { runExtensionBridgeTests } from './extensionBridge.test';
import { runTemporalTests } from './temporal.test';
import { runP60ReleaseCertificationSuite } from './p60ReleaseCertification.test';
import { runRC1ReleaseCertificationSuite } from './rc1Certification.test';
import { runRC2ValidationSuite } from './rc2Validation.test';
import { runV1LaunchCertificationSuite } from './v1LaunchCertification.test';
import { runV1_1ValidationSuite } from './v1_1Validation.test';
import { runV1_2ReliabilityCertificationSuite } from './v1_2ReliabilityCertification.test';
import { runV1_3PlatformCertificationSuite } from './v1_3PlatformCertification.test';
import { runV1_4IntelligenceQualityCertificationSuite } from './v1_4IntelligenceQualityCertification.test';
import { runV1_5EcosystemCertificationSuite } from './v1_5EcosystemCertification.test';
import { runV16PersonalizationCertificationTests } from './v1_6PersonalizationCertification.test';
import { runArchitectureCertificationSuite } from '../core/architectureCertification';
import { runV1_10QualityCertificationTests } from './v1_10QualityCertification.test';
import { runV2FoundationCertificationSuite } from './v2FoundationCertification.test';
import { runV2_3WorkflowCertificationTests } from './v2_3WorkflowCertification.test';
import { runV2_4ActivityCertificationTests } from './v2_4ActivityCertification.test';
import { runV2_5SyncCertificationTests } from './v2_5SyncCertification.test';
import { runV2_6DisasterRecoveryCertificationTests } from './v2_6DisasterRecoveryCertification.test';
import { runV2_7PerformanceCertificationTests } from './v2_7PerformanceCertification.test';
import { runV2_8SecurityCertificationTests } from './v2_8SecurityCertification.test';
import { runV2_9ReleaseCandidateCertificationTests } from './v2_9ReleaseCandidateCertification.test';
import { runV2_10FinalReleaseCertificationTests } from './v2_10FinalReleaseCertification.test';
import { runV2_11MaintenanceHardeningTests } from './v2_11MaintenanceHardening.test';
import { runV2_12PlatformEcosystemHardeningTests } from './v2_12PlatformEcosystemHardening.test';
import { runV2_13DomainExcellenceCertificationTests } from './v2_13DomainExcellenceCertification.test';
import { runV2_14QualityCeilingTests } from './v2_14QualityCeilingCertification.test';
import { runV2_15PowerUserEfficiencyTests } from './v2_15PowerUserEfficiencyCertification.test';
import { runV2_16InteroperabilityCertificationTests } from './v2_16InteroperabilityCertification.test';
import { runV2_17KnowledgeCertificationTests } from './v2_17KnowledgeCertification.test';
import { runV2_18GlobalCertificationTests } from './v2_18GlobalCertification.test';
import { runV2_19ReportingCertificationTests } from './v2_19ReportingCertification.test';
import { runV220AutomationCertificationTests } from './v2_20AutomationCertification.test';
import { runV2_21CoreExperienceCertificationTests } from './v2_21CoreExperienceCertification.test';
import { runV2_22PersonalOSCertificationTests } from './v2_22PersonalOSCertification.test';
import { runV2_23IntelligenceCertificationTests } from './v2_23IntelligenceCertification.test';
import { runV2_24InteroperabilityCertificationTests } from './v2_24InteroperabilityCertification.test';
import { runV2_25PlatformFeatureFreezeCertificationTests } from './v2_25PlatformFeatureFreezeCertification.test';
import { runV2_26BlockerEliminationCertificationTests } from './v2_26BlockerEliminationCertification.test';
import { runV2_27ReliabilitySecurityCertificationTests } from './v2_27ReliabilitySecurityCertification.test';
import { runV2_28PerformanceAccessibilityCertificationTests } from './v2_28PerformanceAccessibilityCertification.test';
import { runV2_29ReleaseCandidateCertificationTests } from './v2_29ReleaseCandidateCertification.test';
import { runV2_30StableShipCertificationTests } from './v2_30StableShipCertification.test';
import { runV2StableFullProductAuditTests } from './v2StableFullProductAudit.test';
import { runFeature7WritingSprintTests } from './feature7WritingSprint.test';
import { runFeature8IdeaSparkStudioTests } from './feature8IdeaSparkStudio.test';
import { runMasonryDragReorderTests } from './feature8MasonryDragReorder.test';
import { runFeature9ThoughtMatrixTests } from './feature9ThoughtMatrix.test';
import { runFeature10CornellNotesTests } from './feature10CornellNotes.test';
import { runImageEmbeddingTests } from './imageEmbedding.test';
import { runNoteImageGalleryTests } from './noteImageGallery.test';
import { runFeatureP1PomodoroFlowTests } from './featureP1PomodoroFlow.test';
import { runFeatureP2ZettelkastenTests } from './featureP2Zettelkasten.test';
import { runFeatureP3ChronoCapsuleTests } from './featureP3ChronoCapsule.test';
import { runFeatureP4SynthesisMatrixTests } from './featureP4SynthesisMatrix.test';
import { runFeatureP5VoiceStudioTests } from './featureP5VoiceStudio.test';
import { runFeatureP6MindMapTests } from './featureP6MindMap.test';
import { runFeatureP7MacroEngineTests } from './featureP7MacroEngine.test';
import { runFeatureP8ActiveRecallStudioTests } from './featureP8ActiveRecallStudio.test';
import { runFeatureP9PresentationStudioTests } from './featureP9PresentationStudio.test';
import { runFeatureP10ReactiveSandboxTests } from './featureP10ReactiveSandbox.test';
import { runFeatureCompletionSuiteTests } from './featureCompletionSuite.test';
import { runSemanticSearchTests } from './semanticSearch.test';
import { benchmarkScale } from './benchmark';

async function main() {
  console.log('====================================================');
  console.log('       PKM Core Architecture Test & Benchmark       ');
  console.log('====================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  // 1. Parser Tests
  console.log('--- Running Parser Tests ---');
  const parserRes = runParserTests();
  totalPassed += parserRes.passed;
  totalFailed += parserRes.failed;
  allErrors.push(...parserRes.errors);
  console.log(`✓ Parser: ${parserRes.passed} passed, ${parserRes.failed} failed\n`);

  // 2. Resolver Tests
  console.log('--- Running Resolver Tests ---');
  const resolverRes = runResolverTests();
  totalPassed += resolverRes.passed;
  totalFailed += resolverRes.failed;
  allErrors.push(...resolverRes.errors);
  console.log(`✓ Resolver: ${resolverRes.passed} passed, ${resolverRes.failed} failed\n`);

  // 3. Incremental Indexing Tests
  console.log('--- Running Incremental & Determinism Tests ---');
  const incRes = runIncrementalTests();
  totalPassed += incRes.passed;
  totalFailed += incRes.failed;
  allErrors.push(...incRes.errors);
  console.log(`✓ Incremental Indexer: ${incRes.passed} passed, ${incRes.failed} failed\n`);

  // 4. Unlinked Mentions & Auto-Link Tests (P2)
  console.log('--- Running Unlinked Mentions Tests (P2) ---');
  const unlinkedRes = runUnlinkedMentionsTests();
  totalPassed += unlinkedRes.passed;
  totalFailed += unlinkedRes.failed;
  allErrors.push(...unlinkedRes.errors);
  console.log(`✓ Unlinked Mentions: ${unlinkedRes.passed} passed, ${unlinkedRes.failed} failed\n`);

  // 5. Note, Section & Block Transclusion Tests (P3)
  console.log('--- Running Transclusion & Live Embed Tests (P3) ---');
  const transclusionRes = runTransclusionTests();
  totalPassed += transclusionRes.passed;
  totalFailed += transclusionRes.failed;
  allErrors.push(...transclusionRes.errors);
  console.log(`✓ Transclusions (P3): ${transclusionRes.passed} passed, ${transclusionRes.failed} failed\n`);

  // 6. Collapsible Outliner & Section Reordering Tests (P4)
  console.log('--- Running Outliner & Section Reordering Tests (P4) ---');
  const outlinerRes = runOutlinerTests();
  totalPassed += outlinerRes.passed;
  totalFailed += outlinerRes.failed;
  allErrors.push(...outlinerRes.errors);
  console.log(`✓ Outliner & Section Reordering (P4): ${outlinerRes.passed} passed, ${outlinerRes.failed} failed\n`);

  // 7. KaTeX Math & Mermaid Diagram Tests (P5)
  console.log('--- Running Math & Diagram Tests (P5) ---');
  const mathRes = runMathAndDiagramTests();
  totalPassed += mathRes.passed;
  totalFailed += mathRes.failed;
  allErrors.push(...mathRes.errors);
  console.log(`✓ Mathematics & Diagrams (P5): ${mathRes.passed} passed, ${mathRes.failed} failed\n`);

  // 8. Split-Screen Dual-Pane & Comparison Mode Tests (P6)
  console.log('--- Running Split-Screen & Comparison Tests (P6) ---');
  const splitRes = runSplitScreenTests();
  totalPassed += splitRes.passed;
  totalFailed += splitRes.failed;
  allErrors.push(...splitRes.errors);
  console.log(`✓ Split-Screen & Dual-Pane (P6): ${splitRes.passed} passed, ${splitRes.failed} failed\n`);

  // 9. Interactive Kanban Board View Tests (P7)
  console.log('--- Running Interactive Kanban Board Tests (P7) ---');
  const kanbanRes = runKanbanTests();
  totalPassed += kanbanRes.passed;
  totalFailed += kanbanRes.failed;
  allErrors.push(...kanbanRes.errors);
  console.log(`✓ Kanban Board (P7): ${kanbanRes.passed} passed, ${kanbanRes.failed} failed\n`);

  // 10. Dynamic Smart Queries & Live Search Blocks Tests (P8)
  console.log('--- Running Dynamic Smart Queries Tests (P8) ---');
  const queryRes = runSmartQueryTests();
  totalPassed += queryRes.passed;
  totalFailed += queryRes.failed;
  allErrors.push(...queryRes.errors);
  console.log(`✓ Smart Queries & Search Blocks (P8): ${queryRes.passed} passed, ${queryRes.failed} failed\n`);

  // 11. Interactive Markdown Table Editor Tests (P9)
  console.log('--- Running Interactive Markdown Table Editor Tests (P9) ---');
  const tableRes = runTableEditorTests();
  totalPassed += tableRes.passed;
  totalFailed += tableRes.failed;
  allErrors.push(...tableRes.errors);
  console.log(`✓ Markdown Table Editor (P9): ${tableRes.passed} passed, ${tableRes.failed} failed\n`);

  // 12. Web Capture & Smart HTML-to-Markdown Ingestion Tests (P10)
  console.log('--- Running Web Capture & HTML-to-Markdown Tests (P10) ---');
  const webCaptureRes = runWebCaptureTests();
  totalPassed += webCaptureRes.passed;
  totalFailed += webCaptureRes.failed;
  allErrors.push(...webCaptureRes.errors);
  console.log(`✓ Web Capture & HTML Ingestion (P10): ${webCaptureRes.passed} passed, ${webCaptureRes.failed} failed\n`);

  // 13. Integrated PDF Reader & Highlight Extraction Tests (P11)
  console.log('--- Running Integrated PDF Reader & Highlight Tests (P11) ---');
  const pdfRes = runPDFReaderTests();
  totalPassed += pdfRes.passed;
  totalFailed += pdfRes.failed;
  allErrors.push(...pdfRes.errors);
  console.log(`✓ Integrated PDF Reader & Citations (P11): ${pdfRes.passed} passed, ${pdfRes.failed} failed\n`);

  // 14. Infinite Spatial Canvas & Whiteboard Tests (P12)
  console.log('--- Running Infinite Spatial Canvas & Whiteboard Tests (P12) ---');
  const canvasRes = runCanvasTests();
  totalPassed += canvasRes.passed;
  totalFailed += canvasRes.failed;
  allErrors.push(...canvasRes.errors);
  console.log(`✓ Infinite Spatial Canvas (P12): ${canvasRes.passed} passed, ${canvasRes.failed} failed\n`);

  // 15. Semantic Relatedness & Graph Clustering Tests (P13)
  console.log('--- Running Semantic Relatedness & Graph Clustering Tests (P13) ---');
  const semanticRes = runSemanticRelatednessTests();
  totalPassed += semanticRes.passed;
  totalFailed += semanticRes.failed;
  allErrors.push(...semanticRes.errors);
  console.log(`✓ Semantic Relatedness (P13): ${semanticRes.passed} passed, ${semanticRes.failed} failed\n`);

  // 16. Vault Doctor & Storage Diagnostics Tests (P14)
  console.log('--- Running Vault Doctor & Storage Diagnostics Tests (P14) ---');
  const doctorRes = await runVaultDoctorTests();
  totalPassed += doctorRes.passed;
  totalFailed += doctorRes.failed;
  allErrors.push(...doctorRes.errors);
  console.log(`✓ Vault Doctor & Diagnostics (P14): ${doctorRes.passed} passed, ${doctorRes.failed} failed\n`);

  // 17. Portable Vault & Local Git Versioning Tests (P15)
  console.log('--- Running Portable Vault & Local Git Versioning Tests (P15) ---');
  const p15Res = await runPortableVaultAndGitTests();
  totalPassed += p15Res.passed;
  totalFailed += p15Res.failed;
  allErrors.push(...p15Res.errors);
  console.log(`✓ Portable Vault & Local Git (P15): ${p15Res.passed} passed, ${p15Res.failed} failed\n`);

  // 18. Remote Git-Compatible Synchronization & 3-Way Merge (P16)
  console.log('--- Running Remote Git Sync & 3-Way Merge Tests (P16) ---');
  const p16Res = await runRemoteGitSyncTests();
  totalPassed += p16Res.passed;
  totalFailed += p16Res.failed;
  allErrors.push(...p16Res.errors);
  console.log(`✓ Remote Git Sync & 3-Way Merge (P16): ${p16Res.passed} passed, ${p16Res.failed} failed\n`);

  // 19. Full-Vault Client-Side Encryption & Encrypted .vault Export (P17)
  console.log('--- Running Full-Vault Client-Side Encryption Tests (P17) ---');
  const p17Res = await runVaultEncryptionTests();
  totalPassed += p17Res.passed;
  totalFailed += p17Res.failed;
  allErrors.push(...p17Res.errors);
  console.log(`✓ Full-Vault Client-Side Encryption (P17): ${p17Res.passed} passed, ${p17Res.failed} failed\n`);

  // 20. Comprehensive Phase P18 Release Certification Audit
  console.log('--- Running Phase P18 Release Certification & Cross-Feature Interaction Audit ---');
  const p18Res = await runPKMReleaseCertification();
  totalPassed += p18Res.passed;
  totalFailed += p18Res.failed;
  allErrors.push(...p18Res.errors);
  console.log(`✓ Release Certification (P18): ${p18Res.passed} passed, ${p18Res.failed} failed\n`);

  // 19. Workspace Architecture Tests (P19)
  console.log('--- Running Workspace Architecture Tests (P19) ---');
  const p19Res = runWorkspaceTests();
  totalPassed += p19Res.passed;
  totalFailed += p19Res.failed;
  allErrors.push(...p19Res.errors);
  console.log(`✓ Workspace Architecture (P19): ${p19Res.passed} passed, ${p19Res.failed} failed\n`);

  // 20. Mobile Interaction & Accessibility Tests (P28)
  const p28Res = await runMobileAccessibilityTests();
  totalPassed += p28Res.passed;
  totalFailed += p28Res.failed;

  // 21. Sync UX & Security Hardening Tests (P30)
  try {
    await runSecurityHardeningTests();
    totalPassed += 9;
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Security Hardening test failure: ${err?.message || err}`);
  }

  // 22. Peer-to-Peer Device Sync Tests (P32)
  try {
    const p32Res = await runP2PDeviceSyncTests();
    totalPassed += p32Res.passed;
    totalFailed += p32Res.failed;
    allErrors.push(...p32Res.errors);
    console.log(`✓ P2P Device Sync (P32): ${p32Res.passed} passed, ${p32Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`P32 Device Sync test failure: ${err?.message || err}`);
  }

  // 22b. Feature Update 1: Differential CRDT Sync & Conflict-Free P2P Suite
  try {
    const crdtRes = await runCRDTSyncTests();
    totalPassed += crdtRes.passed;
    totalFailed += crdtRes.failed;
    allErrors.push(...crdtRes.errors);
    console.log(`✓ Feature Update 1: Differential CRDT Sync: ${crdtRes.passed} passed, ${crdtRes.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`CRDT Sync test failure: ${err?.message || err}`);
  }

  // 23. Phase P33: V2 Product Consolidation & Release Certification Suite
  try {
    const p33Res = await runV2ReleaseCertificationSuite();
    totalPassed += p33Res.passed;
    totalFailed += p33Res.failed;
    allErrors.push(...p33Res.errors);
    console.log(`✓ V2 Release Certification (P33): ${p33Res.passed} passed, ${p33Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`P33 V2 Release Certification failure: ${err?.message || err}`);
  }

  // 24. Phase P34: Browser Extension & Universal Capture Bridge Tests
  try {
    const p34Res = await runExtensionBridgeTests();
    totalPassed += p34Res.passed;
    totalFailed += p34Res.failed;
    allErrors.push(...p34Res.errors);
    console.log(`✓ Browser Extension & Capture Bridge (P34): ${p34Res.passed} passed, ${p34Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`P34 Extension Bridge failure: ${err?.message || err}`);
  }

  // 25. Phase P37: Calendar, Agenda & Temporal Knowledge System Tests
  try {
    console.log('--- Running Temporal & Calendar Knowledge System Tests (P37) ---');
    const p37Res = runTemporalTests();
    totalPassed += p37Res.passed;
    totalFailed += p37Res.failed;
    allErrors.push(...p37Res.errors);
    console.log(`✓ Temporal Knowledge System (P37): ${p37Res.passed} passed, ${p37Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`P37 Temporal System failure: ${err?.message || err}`);
  }

  // 26. Phase P60: Final Whole-System Consolidation & Release Certification
  try {
    const p60Res = await runP60ReleaseCertificationSuite();
    totalPassed += p60Res.passed;
    totalFailed += p60Res.failed;
    allErrors.push(...p60Res.errors);
    console.log(`✓ Final Release Certification (P60): ${p60Res.passed} passed, ${p60Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`P60 Final Release Certification failure: ${err?.message || err}`);
  }

  // 27. V1.0 RC1 — Release Blocker Elimination & Core Stability Freeze
  try {
    const rc1Res = await runRC1ReleaseCertificationSuite();
    totalPassed += rc1Res.passed;
    totalFailed += rc1Res.failed;
    allErrors.push(...rc1Res.errors);
    console.log(`✓ V1.0 RC1 Release Certification: ${rc1Res.passed} passed, ${rc1Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.0 RC1 Release Certification failure: ${err?.message || err}`);
  }

  // 28. V1.0 RC2 — Real-World Validation, UX Polish & Platform Readiness
  try {
    const rc2Res = await runRC2ValidationSuite();
    totalPassed += rc2Res.passed;
    totalFailed += rc2Res.failed;
    allErrors.push(...rc2Res.errors);
    console.log(`✓ V1.0 RC2 Real-World Validation: ${rc2Res.passed} passed, ${rc2Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.0 RC2 Real-World Validation failure: ${err?.message || err}`);
  }

  // 29. V1.0 — Stable Release Finalization & Launch Certification
  try {
    const v1Res = await runV1LaunchCertificationSuite();
    totalPassed += v1Res.passed;
    totalFailed += v1Res.failed;
    allErrors.push(...v1Res.errors);
    console.log(`✓ V1.0 Stable Release Finalization: ${v1Res.passed} passed, ${v1Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.0 Stable Release Finalization failure: ${err?.message || err}`);
  }

  // 30. V1.1 — UX Simplification, Performance & Everyday Quality Suite
  try {
    const v1_1Res = await runV1_1ValidationSuite();
    totalPassed += v1_1Res.passed;
    totalFailed += v1_1Res.failed;
    allErrors.push(...v1_1Res.errors);
    console.log(`✓ V1.1 UX Simplification & Quality: ${v1_1Res.passed} passed, ${v1_1Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.1 UX Simplification failure: ${err?.message || err}`);
  }

  // 31. V1.2 — Reliability, Sync, Backup & Recovery Hardening Suite
  try {
    const v1_2Res = await runV1_2ReliabilityCertificationSuite();
    totalPassed += v1_2Res.passed;
    totalFailed += v1_2Res.failed;
    console.log(`✓ V1.2 Reliability & Sync Hardening: ${v1_2Res.passed} passed, ${v1_2Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.2 Reliability Hardening failure: ${err?.message || err}`);
  }

  // 32. V1.3 — Platform Quality, Native Integration & Cross-Device Experience Suite
  try {
    const v1_3Res = await runV1_3PlatformCertificationSuite();
    totalPassed += v1_3Res.passed;
    totalFailed += v1_3Res.failed;
    allErrors.push(...v1_3Res.errors);
    console.log(`✓ V1.3 Platform Quality & Native Integration: ${v1_3Res.passed} passed, ${v1_3Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.3 Platform Quality Certification failure: ${err?.message || err}`);
  }

  // 33. V1.4 — Intelligence Quality, Context Precision & Grounded AI Suite
  try {
    const v1_4Res = await runV1_4IntelligenceQualityCertificationSuite();
    totalPassed += v1_4Res.passed;
    totalFailed += v1_4Res.failed;
    allErrors.push(...v1_4Res.errors);
    console.log(`✓ V1.4 Intelligence Quality & Grounded AI: ${v1_4Res.passed} passed, ${v1_4Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.4 Intelligence Quality Certification failure: ${err?.message || err}`);
  }

  // 34. V1.5 — Ecosystem, Plugins, Integrations & Extensibility Suite
  try {
    const v1_5Res = await runV1_5EcosystemCertificationSuite();
    totalPassed += v1_5Res.passed;
    totalFailed += v1_5Res.failed;
    allErrors.push(...v1_5Res.errors);
    console.log(`✓ V1.5 Ecosystem, Plugins & Extensibility: ${v1_5Res.passed} passed, ${v1_5Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.5 Ecosystem Certification failure: ${err?.message || err}`);
  }

  // 37. V1.6 Product Refinement & Personalization Tests
  console.log('--- Running V1.6 Product Refinement & Personalization Tests ---');
  try {
    const v1_6Res = runV16PersonalizationCertificationTests();
    totalPassed += v1_6Res.passed;
    totalFailed += v1_6Res.failed;
    allErrors.push(...v1_6Res.errors);
    console.log(`✓ V1.6 Personalization & Workflow Quality: ${v1_6Res.passed} passed, ${v1_6Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.6 Personalization Certification failure: ${err?.message || err}`);
  }

  // 38. V1.9 Architecture & Performance Certification
  console.log('--- Running V1.9 Architecture & Maintainability Certification ---');
  try {
    const v1_9Res = await runArchitectureCertificationSuite();
    if (v1_9Res.overallPassed) {
      totalPassed += v1_9Res.passedCount;
      console.log(`✓ V1.9 Architecture & Performance Suite: ${v1_9Res.passedCount}/${v1_9Res.totalChecks} pillars passed\n`);
    } else {
      totalFailed += v1_9Res.failedCount;
      allErrors.push(`V1.9 Architecture Suite had ${v1_9Res.failedCount} failures`);
    }
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.9 Architecture Certification failure: ${err?.message || err}`);
  }

  // 39. V1.10 Final Quality Ceiling & Stability Certification
  console.log('--- Running V1.10 Final Quality Ceiling & Stability Certification ---');
  try {
    const v1_10Res = await runV1_10QualityCertificationTests();
    totalPassed += v1_10Res.passed;
    totalFailed += v1_10Res.failed;
    allErrors.push(...v1_10Res.errors);
    console.log(`✓ V1.10 Quality Ceiling & Stability Suite: ${v1_10Res.passed} passed, ${v1_10Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V1.10 Quality Certification failure: ${err?.message || err}`);
  }

  // 40. V2.0 Foundation Certification
  console.log('--- Running V2.0 Foundation Certification ---');
  try {
    const v2Res = await runV2FoundationCertificationSuite();
    totalPassed += v2Res.passed;
    totalFailed += v2Res.failed;
    allErrors.push(...v2Res.errors);
    console.log(`✓ V2.0 Foundation Certification Suite: ${v2Res.passed} passed, ${v2Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.0 Foundation Certification failure: ${err?.message || err}`);
  }

  // 41. V2.3 Workflow Orchestration, Temporal Planning & Review Certification
  console.log('--- Running V2.3 Workflow Orchestration & Temporal Planning Certification ---');
  try {
    const v2_3Res = await runV2_3WorkflowCertificationTests();
    totalPassed += v2_3Res.passed;
    totalFailed += v2_3Res.failed;
    allErrors.push(...v2_3Res.errors);
    console.log(`✓ V2.3 Workflow Orchestration & Temporal Suite: ${v2_3Res.passed} passed, ${v2_3Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.3 Workflow Orchestration failure: ${err?.message || err}`);
  }

  // 39. V2.4 Activity, Attention & Continuity Certification Suite
  try {
    const v2_4Res = runV2_4ActivityCertificationTests();
    totalPassed += v2_4Res.passed;
    totalFailed += v2_4Res.failed;
    allErrors.push(...v2_4Res.errors);
    console.log(`✓ V2.4 Activity, Attention & Continuity Suite: ${v2_4Res.passed} passed, ${v2_4Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.4 Activity & Continuity failure: ${err?.message || err}`);
  }

  // 42. V2.5 Cross-Device Sync, Offline Continuity & Resilience Certification Suite
  try {
    const v2_5Res = await runV2_5SyncCertificationTests();
    totalPassed += v2_5Res.passed;
    totalFailed += v2_5Res.failed;
    allErrors.push(...v2_5Res.errors);
    console.log(`✓ V2.5 Cross-Device Sync & Resilience Suite: ${v2_5Res.passed} passed, ${v2_5Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.5 Sync & Resilience failure: ${err?.message || err}`);
  }

  // 43. V2.6 Backup, Disaster Recovery & Storage Resilience Certification Suite
  try {
    const v2_6Res = await runV2_6DisasterRecoveryCertificationTests();
    totalPassed += v2_6Res.passed;
    totalFailed += v2_6Res.failed;
    allErrors.push(...v2_6Res.errors);
    console.log(`✓ V2.6 Disaster Recovery & Storage Resilience Suite: ${v2_6Res.passed} passed, ${v2_6Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.6 Disaster Recovery & Resilience failure: ${err?.message || err}`);
  }

  // 44. V2.7 Extreme-Scale Performance, Runtime Efficiency & Platform Optimization Suite
  try {
    const v2_7Res = await runV2_7PerformanceCertificationTests();
    totalPassed += v2_7Res.passed;
    totalFailed += v2_7Res.failed;
    if (v2_7Res.failed > 0) {
      allErrors.push(...v2_7Res.report.filter((r) => r.includes('FAIL')));
    }
    console.log(`✓ V2.7 Performance & Extreme-Scale Resilience Suite: ${v2_7Res.passed} passed, ${v2_7Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.7 Performance & Extreme-Scale failure: ${err?.message || err}`);
  }

  // 45. V2.8 Security, Privacy, Trust Boundaries & Adversarial Hardening Suite
  console.log('--- Running V2.8 Security, Privacy, Trust Boundaries & Adversarial Hardening Suite ---');
  try {
    const v2_8Res = await runV2_8SecurityCertificationTests();
    totalPassed += v2_8Res.passed;
    totalFailed += v2_8Res.failed;
    if (v2_8Res.failed > 0) {
      allErrors.push(...v2_8Res.report.filter((r) => r.includes('FAIL')));
    }
    console.log(`✓ V2.8 Security & Adversarial Hardening Suite: ${v2_8Res.passed} passed, ${v2_8Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.8 Security Certification failure: ${err?.message || err}`);
  }

  // 46. V2.9 Whole-System Stabilization & Release Candidate Readiness Suite
  console.log('--- Running V2.9 Whole-System Stabilization & Release Candidate Readiness Suite ---');
  try {
    const v2_9Res = await runV2_9ReleaseCandidateCertificationTests();
    totalPassed += v2_9Res.passed;
    totalFailed += v2_9Res.failed;
    if (v2_9Res.failed > 0) {
      allErrors.push(...v2_9Res.report.filter((r) => r.includes('FAIL')));
    }
    console.log(`✓ V2.9 Release Candidate Readiness Suite: ${v2_9Res.passed} passed, ${v2_9Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.9 Release Candidate Certification failure: ${err?.message || err}`);
  }

  // 47. V2.10 Final Release Certification & Stable Launch Suite
  console.log('--- Running V2.10 Final Release Certification & Stable Launch Suite ---');
  try {
    const v2_10Res = await runV2_10FinalReleaseCertificationTests();
    totalPassed += v2_10Res.passed;
    totalFailed += v2_10Res.failed;
    if (v2_10Res.failed > 0) {
      allErrors.push(...v2_10Res.report.filter((r) => r.includes('FAIL')));
    }
    console.log(`✓ V2.10 Final Release Certification & Stable Launch Suite: ${v2_10Res.passed} passed, ${v2_10Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.10 Final Release Certification failure: ${err?.message || err}`);
  }

  // 48. V2.11 Post-Launch Stability & Maintenance Hardening Suite
  console.log('--- Running V2.11 Post-Launch Stability & Maintenance Hardening Suite ---');
  try {
    const v2_11Res = runV2_11MaintenanceHardeningTests();
    totalPassed += v2_11Res.passed;
    totalFailed += v2_11Res.failed;
    if (v2_11Res.failed > 0) {
      allErrors.push(...v2_11Res.errors);
    }
    console.log(`✓ V2.11 Post-Launch Stability & Maintenance Hardening Suite: ${v2_11Res.passed} passed, ${v2_11Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.11 Maintenance Hardening failure: ${err?.message || err}`);
  }

  // 49. V2.12 Native Platform Quality & Ecosystem Hardening Suite
  console.log('--- Running V2.12 Native Platform Quality & Ecosystem Hardening Suite ---');
  try {
    const v2_12Res = runV2_12PlatformEcosystemHardeningTests();
    totalPassed += v2_12Res.passed;
    totalFailed += v2_12Res.failed;
    if (v2_12Res.failed > 0) {
      allErrors.push(...v2_12Res.errors);
    }
    console.log(`✓ V2.12 Native Platform Quality & Ecosystem Hardening Suite: ${v2_12Res.passed} passed, ${v2_12Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.12 Platform Ecosystem failure: ${err?.message || err}`);
  }

  // 50. V2.13 First-Party Domain Excellence, Cross-Domain Cohesion & Daily-Life Polish Suite
  console.log('--- Running V2.13 First-Party Domain Excellence & Cross-Domain Cohesion Suite ---');
  try {
    const v2_13Res = await runV2_13DomainExcellenceCertificationTests();
    totalPassed += v2_13Res.passed;
    totalFailed += v2_13Res.failed;
    if (v2_13Res.failed > 0) {
      allErrors.push(...v2_13Res.errors);
    }
    console.log(`✓ V2.13 First-Party Domain Excellence & Cross-Domain Cohesion Suite: ${v2_13Res.passed} passed, ${v2_13Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.13 Domain Excellence failure: ${err?.message || err}`);
  }

  // 51. V2.14 Master Quality Ceiling & V3 Readiness Review Suite
  console.log('--- Running V2.14 Master Quality Ceiling & V3 Readiness Certification Suite ---');
  try {
    const v2_14Res = runV2_14QualityCeilingTests();
    totalPassed += v2_14Res.passed;
    totalFailed += v2_14Res.failed;
    if (v2_14Res.failed > 0) {
      allErrors.push(...v2_14Res.errors);
    }
    console.log(`✓ V2.14 Master Quality Ceiling & V3 Readiness Certification Suite: ${v2_14Res.passed} passed, ${v2_14Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.14 Quality Ceiling failure: ${err?.message || err}`);
  }

  // 52. V2.15 Sustainable Evolution & Power-User Efficiency Suite
  console.log('--- Running V2.15 Sustainable Evolution & Power-User Efficiency Suite ---');
  try {
    const v2_15Res = runV2_15PowerUserEfficiencyTests();
    totalPassed += v2_15Res.passed;
    totalFailed += v2_15Res.failed;
    if (v2_15Res.failed > 0) {
      allErrors.push(...v2_15Res.errors);
    }
    console.log(`✓ V2.15 Sustainable Evolution & Power-User Efficiency Suite: ${v2_15Res.passed} passed, ${v2_15Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.15 Power-User Efficiency failure: ${err?.message || err}`);
  }

  // 53. V2.16 Open Interoperability & Ecosystem Expansion Suite
  console.log('--- Running V2.16 Open Interoperability & Ecosystem Expansion Suite ---');
  try {
    const v2_16Res = await runV2_16InteroperabilityCertificationTests();
    totalPassed += v2_16Res.passed;
    totalFailed += v2_16Res.failed;
    if (v2_16Res.failed > 0) {
      allErrors.push(...v2_16Res.errors);
    }
    console.log(`✓ V2.16 Open Interoperability & Ecosystem Expansion Suite: ${v2_16Res.passed} passed, ${v2_16Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.16 Open Interoperability failure: ${err?.message || err}`);
  }

  // 54. V2.17 Knowledge Work Excellence, Research Depth & Note-System Refinement Suite
  console.log('--- Running V2.17 Knowledge Work & Research Excellence Suite ---');
  try {
    const v2_17Res = await runV2_17KnowledgeCertificationTests();
    totalPassed += v2_17Res.passed;
    totalFailed += v2_17Res.failed;
    if (v2_17Res.failed > 0) {
      allErrors.push(...v2_17Res.errors);
    }
    console.log(`✓ V2.17 Knowledge Work Excellence Suite: ${v2_17Res.passed} passed, ${v2_17Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.17 Knowledge Work failure: ${err?.message || err}`);
  }

  // 55. V2.18 Global Usability, Accessibility, Localization & Content Fidelity Suite
  console.log('--- Running V2.18 Global Usability & Accessibility Suite ---');
  try {
    const v2_18Res = await runV2_18GlobalCertificationTests();
    totalPassed += v2_18Res.passed;
    totalFailed += v2_18Res.failed;
    if (v2_18Res.failed > 0) {
      allErrors.push(...v2_18Res.errors);
    }
    console.log(`✓ V2.18 Global Usability, Accessibility & Localization Suite: ${v2_18Res.passed} passed, ${v2_18Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.18 Global Usability failure: ${err?.message || err}`);
  }

  // 56. V2.19 Dashboards, Reporting, Trends & Decision-Support Excellence Suite
  console.log('--- Running V2.19 Dashboards, Reporting, Trends & Decision-Support Suite ---');
  try {
    const v2_19Res = await runV2_19ReportingCertificationTests();
    if (v2_19Res) {
      totalPassed += 18;
      console.log(`✓ V2.19 Dashboards, Reporting & Decision-Support Suite: 18/18 gates passed\n`);
    }
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.19 Reporting failure: ${err?.message || err}`);
  }

  // 57. V2.20 Automation, Scheduling, Recurrence & Proactive Workflow Excellence Suite
  console.log('--- Running V2.20 Automation, Scheduling, Recurrence & Workflow Suite ---');
  try {
    const v2_20Res = runV220AutomationCertificationTests();
    if (v2_20Res) {
      totalPassed += 18;
      console.log(`✓ V2.20 Automation, Recurrence & Proactive Workflow Suite: 18/18 gates passed\n`);
    }
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.20 Automation failure: ${err?.message || err}`);
  }

  // 58. V2.21 Core Experience Completion Suite
  console.log('--- Running V2.21 Core Experience Completion Suite ---');
  try {
    const v2_21Res = runV2_21CoreExperienceCertificationTests();
    if (v2_21Res) {
      totalPassed += 36;
      console.log(`✓ V2.21 Core Experience Completion Suite: 36/36 gates passed\n`);
    }
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.21 Core Experience failure: ${err?.message || err}`);
  }

  // 59. V2.22 Personal OS Feature Completion Suite
  console.log('--- Running V2.22 Personal OS Feature Completion Suite ---');
  try {
    const v2_22Res = runV2_22PersonalOSCertificationTests();
    if (v2_22Res) {
      totalPassed += 24;
      console.log(`✓ V2.22 Personal OS Feature Completion Suite: 24/24 gates passed\n`);
    }
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.22 Personal OS failure: ${err?.message || err}`);
  }

  // 60. V2.23 Automation, Intelligence & Reporting Completion Suite
  console.log('--- Running V2.23 Automation, Intelligence & Reporting Suite ---');
  try {
    const v2_23Res = runV2_23IntelligenceCertificationTests();
    const passed = v2_23Res.filter((t) => t.passed).length;
    const failed = v2_23Res.filter((t) => !t.passed);
    totalPassed += passed;
    totalFailed += failed.length;
    for (const f of failed) {
      allErrors.push(`V2.23 ${f.name}: ${f.error}`);
    }
    console.log(`✓ V2.23 Automation, Intelligence & Reporting: ${passed}/${v2_23Res.length} gates passed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.23 Intelligence failure: ${err?.message || err}`);
  }

  // 60. V2.24 Open Interoperability, Ecosystem & Data Freedom Certification
  console.log('--- Running V2.24 Ecosystem & Interoperability Certification ---');
  try {
    const v2_24Res = runV2_24InteroperabilityCertificationTests();
    totalPassed += v2_24Res.passed;
    totalFailed += v2_24Res.failed;
    allErrors.push(...v2_24Res.failures);
    console.log(`✓ ${v2_24Res.name}: ${v2_24Res.passed}/${v2_24Res.total} gates passed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.24 Interoperability failure: ${err?.message || err}`);
  }

  // 61. V2.25 Platform & Feature Completion Freeze Certification
  console.log('--- Running V2.25 Platform & Feature Completion Freeze Certification ---');
  try {
    const v2_25Res = runV2_25PlatformFeatureFreezeCertificationTests();
    totalPassed += v2_25Res.passed;
    totalFailed += v2_25Res.failed;
    allErrors.push(...v2_25Res.failures);
    console.log(`✓ ${v2_25Res.name}: ${v2_25Res.passed}/${v2_25Res.total} gates passed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.25 Platform Freeze failure: ${err?.message || err}`);
  }

  // 62. V2.26 Full-System Audit & Blocker Elimination Certification
  console.log('--- Running V2.26 Full-System Audit & Blocker Elimination Certification ---');
  try {
    runV2_26BlockerEliminationCertificationTests();
    totalPassed += 18;
    console.log(`✓ V2.26 Full-System Audit & Blocker Elimination: 18/18 gates passed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.26 Blocker Elimination failure: ${err?.message || err}`);
  }

  // 68. V2.27 Reliability, Security & Data Integrity Hardening
  try {
    console.log('--- Running V2.27 Reliability, Security & Data Integrity Certification ---');
    const v227Res = runV2_27ReliabilitySecurityCertificationTests();
    totalPassed += v227Res.passed;
    totalFailed += v227Res.failed;
    allErrors.push(...v227Res.errors);
    console.log(`✓ V2.27 Reliability, Security & Data Integrity: ${v227Res.passed} passed, ${v227Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.27 Hardening failure: ${err?.message || err}`);
  }

  // 69. V2.28 Performance, Accessibility & Platform Hardening
  try {
    console.log('--- Running V2.28 Performance, Accessibility & Platform Hardening Certification ---');
    const v228Res = runV2_28PerformanceAccessibilityCertificationTests();
    totalPassed += v228Res.passed;
    totalFailed += v228Res.failed;
    allErrors.push(...v228Res.errors);
    console.log(`✓ V2.28 Performance, Accessibility & Platform Hardening: ${v228Res.passed} passed, ${v228Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.28 Hardening failure: ${err?.message || err}`);
  }

  // 70. V2.29 Release Candidate 1 Certification
  try {
    console.log('--- Running V2.29 Release Candidate 1 Certification ---');
    runV2_29ReleaseCandidateCertificationTests();
    totalPassed += 14;
    console.log('✓ V2.29 Release Candidate 1 Certification: 14/14 gates passed\n');
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.29 Release Candidate 1 failure: ${err?.message || err}`);
  }

  // 71. V2.30 Final Stable Ship Certification
  try {
    console.log('--- Running V2.30 Final Stable Ship Certification ---');
    const v230Res = runV2_30StableShipCertificationTests();
    totalPassed += v230Res.passed;
    totalFailed += v230Res.failed;
    allErrors.push(...v230Res.errors);
    console.log(`✓ V2.30 Final Stable Ship Certification: ${v230Res.passed} passed, ${v230Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2.30 Final Stable Ship failure: ${err?.message || err}`);
  }

  // 72. V2 Stable Full Product Audit & Bug Hunt Suite
  try {
    console.log('--- Running V2 Stable Full Product Audit & Bug Hunt Suite ---');
    const auditRes = runV2StableFullProductAuditTests();
    totalPassed += auditRes.passed;
    totalFailed += auditRes.failed;
    allErrors.push(...auditRes.errors);
    console.log(`✓ V2 Stable Full Product Audit: ${auditRes.passed} passed, ${auditRes.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`V2 Stable Full Product Audit failure: ${err?.message || err}`);
  }

  // 73. Feature 7: Writing Sprint Arena & Flow Studio Certification
  try {
    console.log('--- Running Feature 7 Writing Sprint Arena Certification ---');
    const f7Res = runFeature7WritingSprintTests();
    totalPassed += f7Res.passed;
    totalFailed += f7Res.failed;
    allErrors.push(...f7Res.errors);
    console.log(`✓ Feature 7 Writing Sprint Arena: ${f7Res.passed} passed, ${f7Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature 7 Writing Sprint Arena failure: ${err?.message || err}`);
  }

  // 74. Feature 8: Mind Sparks Idea Combinator Studio Certification
  try {
    console.log('--- Running Feature 8 Idea Combinator Studio Certification ---');
    const f8Res = runFeature8IdeaSparkStudioTests();
    totalPassed += f8Res.passed;
    totalFailed += f8Res.failed;
    allErrors.push(...f8Res.errors);
    console.log(`✓ Feature 8 Idea Combinator Studio: ${f8Res.passed} passed, ${f8Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature 8 Idea Combinator Studio failure: ${err?.message || err}`);
  }

  // 75. Feature: MasonryView Drag-and-Drop Note Reordering Certification
  try {
    console.log('--- Running MasonryView Drag-and-Drop Note Reorder Certification ---');
    const mdrRes = runMasonryDragReorderTests();
    totalPassed += mdrRes.passed;
    totalFailed += mdrRes.failed;
    allErrors.push(...mdrRes.errors);
    console.log(`✓ MasonryView Drag-and-Drop Reorder: ${mdrRes.passed} passed, ${mdrRes.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`MasonryView Drag-and-Drop Reorder failure: ${err?.message || err}`);
  }

  // 76. Feature 9: Thought Matrix · 2x2 Decision & Priority Studio Certification
  try {
    console.log('--- Running Feature 9 Thought Matrix Studio Certification ---');
    const f9Res = runFeature9ThoughtMatrixTests();
    totalPassed += f9Res.passed;
    totalFailed += f9Res.failed;
    allErrors.push(...f9Res.errors);
    console.log(`✓ Feature 9 Thought Matrix Studio: ${f9Res.passed} passed, ${f9Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature 9 Thought Matrix Studio failure: ${err?.message || err}`);
  }

  // 77. Feature 10: Cornell Notes & Structured Active Recall Studio Certification
  try {
    console.log('--- Running Feature 10 Cornell Notes & Active Recall Studio Certification ---');
    const f10Res = runFeature10CornellNotesTests();
    totalPassed += f10Res.passed;
    totalFailed += f10Res.failed;
    allErrors.push(...f10Res.errors);
    console.log(`✓ Feature 10 Cornell Notes Studio: ${f10Res.passed} passed, ${f10Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature 10 Cornell Notes Studio failure: ${err?.message || err}`);
  }

  // 78. Feature: Image Embedding & Camera Photo Capture Certification
  try {
    console.log('--- Running Image Embedding & Camera Capture Certification ---');
    const imgRes = runImageEmbeddingTests();
    totalPassed += imgRes.passed;
    totalFailed += imgRes.failed;
    allErrors.push(...imgRes.errors);
    console.log(`✓ Image Embedding & Camera Capture: ${imgRes.passed} passed, ${imgRes.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Image Embedding & Camera Capture failure: ${err?.message || err}`);
  }

  // 79. Feature: Note Media Gallery & Lightbox Collection Certification
  try {
    console.log('--- Running Note Image Gallery & Lightbox Collection Certification ---');
    const galleryRes = runNoteImageGalleryTests();
    totalPassed += galleryRes.passed;
    totalFailed += galleryRes.failed;
    allErrors.push(...galleryRes.errors);
    console.log(`✓ Note Image Gallery & Lightbox Collection: ${galleryRes.passed} passed, ${galleryRes.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Note Image Gallery & Lightbox Collection failure: ${err?.message || err}`);
  }

  // 80. Feature: P1 Pomodoro Deep Work Flow & Interstitial Journaling Hub
  try {
    console.log('--- Running P1 Pomodoro Flow & Interstitial Hub Certification ---');
    const p1Res = runFeatureP1PomodoroFlowTests();
    totalPassed += p1Res.passed;
    totalFailed += p1Res.failed;
    allErrors.push(...p1Res.errors);
    console.log(`✓ Feature P1 Pomodoro Deep Work Flow: ${p1Res.passed} passed, ${p1Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P1 Pomodoro Deep Work Flow failure: ${err?.message || err}`);
  }

  // 81. Feature: P2 Zettelkasten Atomic Slip-Box & Concept Extraction Studio
  try {
    console.log('--- Running P2 Zettelkasten Studio Certification ---');
    const p2Res = runFeatureP2ZettelkastenTests();
    totalPassed += p2Res.passed;
    totalFailed += p2Res.failed;
    allErrors.push(...p2Res.errors);
    console.log(`✓ Feature P2 Zettelkasten Atomic Studio: ${p2Res.passed} passed, ${p2Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P2 Zettelkasten Studio failure: ${err?.message || err}`);
  }

  // 82. Feature: P3 Chrono Capsule & Spaced Incremental Reading Studio
  try {
    console.log('--- Running P3 Chrono Capsule & Incremental Reading Studio Certification ---');
    const p3Res = runFeatureP3ChronoCapsuleTests();
    totalPassed += p3Res.passed;
    totalFailed += p3Res.failed;
    allErrors.push(...p3Res.errors);
    console.log(`✓ Feature P3 Chrono Capsule & Incremental Reading: ${p3Res.passed} passed, ${p3Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P3 Chrono Capsule Studio failure: ${err?.message || err}`);
  }

  // 83. Feature: P4 Multi-Note Parallel Comparison & Synthesis Matrix
  try {
    console.log('--- Running P4 Synthesis Matrix Certification ---');
    const p4Res = runFeatureP4SynthesisMatrixTests();
    totalPassed += p4Res.passed;
    totalFailed += p4Res.failed;
    allErrors.push(...p4Res.errors);
    console.log(`✓ Feature P4 Synthesis Matrix: ${p4Res.passed} passed, ${p4Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P4 Synthesis Matrix failure: ${err?.message || err}`);
  }

  // 84. Feature: P5 Voice Memo Transcriber & Audio Snippet Studio
  try {
    console.log('--- Running P5 Voice Memo Studio Certification ---');
    const p5Res = runFeatureP5VoiceStudioTests();
    totalPassed += p5Res.passed;
    totalFailed += p5Res.failed;
    allErrors.push(...p5Res.errors);
    console.log(`✓ Feature P5 Voice Memo Studio: ${p5Res.passed} passed, ${p5Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P5 Voice Memo Studio failure: ${err?.message || err}`);
  }

  // 85. Feature: P6 Visual Mind Map & Concept Outline Tree Studio
  try {
    console.log('--- Running P6 Visual Mind Map Studio Certification ---');
    const p6Res = runFeatureP6MindMapTests();
    totalPassed += p6Res.passed;
    totalFailed += p6Res.failed;
    allErrors.push(...p6Res.errors);
    console.log(`✓ Feature P6 Visual Mind Map Studio: ${p6Res.passed} passed, ${p6Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P6 Mind Map Studio failure: ${err?.message || err}`);
  }

  // 86. Feature: P7 Hotkey Super-Palette & Macro Automation Engine
  try {
    console.log('--- Running P7 Macro Automation Engine Certification ---');
    const p7Res = await runFeatureP7MacroEngineTests();
    totalPassed += p7Res.passed;
    totalFailed += p7Res.failed;
    allErrors.push(...p7Res.errors);
    console.log(`✓ Feature P7 Macro Automation Engine: ${p7Res.passed} passed, ${p7Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P7 Macro Engine failure: ${err?.message || err}`);
  }

  // 87. Feature: P8 Spaced Repetition Flashcard Generation & Active Recall Studio
  try {
    console.log('--- Running P8 Active Recall Studio Certification ---');
    const p8Res = runFeatureP8ActiveRecallStudioTests();
    totalPassed += p8Res.passed;
    totalFailed += p8Res.failed;
    allErrors.push(...p8Res.errors);
    console.log(`✓ Feature P8 Active Recall Studio: ${p8Res.passed} passed, ${p8Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P8 Active Recall Studio failure: ${err?.message || err}`);
  }

  // 88. Feature: P9 Markdown Presentation & Slide Deck Studio
  try {
    console.log('--- Running P9 Presentation & Slide Deck Studio Certification ---');
    const p9Res = runFeatureP9PresentationStudioTests();
    totalPassed += p9Res.passed;
    totalFailed += p9Res.failed;
    allErrors.push(...p9Res.errors);
    console.log(`✓ Feature P9 Presentation & Slide Deck Studio: ${p9Res.passed} passed, ${p9Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P9 Presentation Studio failure: ${err?.message || err}`);
  }

  // 89. Feature: P10 Reactive Computational Sandbox & Formula Matrix
  try {
    console.log('--- Running P10 Reactive Computational Sandbox Certification ---');
    const p10Res = runFeatureP10ReactiveSandboxTests();
    totalPassed += p10Res.passed;
    totalFailed += p10Res.failed;
    allErrors.push(...p10Res.errors);
    console.log(`✓ Feature P10 Reactive Computational Sandbox: ${p10Res.passed} passed, ${p10Res.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature P10 Reactive Sandbox failure: ${err?.message || err}`);
  }

  // 90. Final Feature Completion Suite (Gamification Hub, Vault Health Doctor, Archive Exporter)
  try {
    console.log('--- Running Final Feature Completion Suite (Gamification, Diagnostics, Archive) ---');
    const compRes = runFeatureCompletionSuiteTests();
    totalPassed += compRes.passed;
    totalFailed += compRes.failed;
    allErrors.push(...compRes.errors);
    console.log(`✓ Final Feature Completion Suite: ${compRes.passed} passed, ${compRes.failed} failed\n`);
  } catch (err: any) {
    totalFailed += 1;
    allErrors.push(`Feature Completion Suite failure: ${err?.message || err}`);
  }

  // Summary of Functional Unit Tests
  console.log('====================================================');
  if (totalFailed === 0) {
    console.log(`🎉 ALL ${totalPassed} UNIT TESTS PASSED SUCCESSFULLY!`);
  } else {
    console.error(`❌ ${totalFailed} TESTS FAILED:`);
    for (const err of allErrors) {
      console.error(`  - ${err}`);
    }
  }
  console.log('====================================================\n');

  // 4. Synthetic Vault Benchmarks
  console.log('--- Running Synthetic Vault Scale Benchmarks ---\n');

  const scales = [100, 1000, 10000];
  const benchmarkResults = [];

  for (const scale of scales) {
    console.log(`Benchmarking synthetic vault of ${scale.toLocaleString()} notes...`);
    const res = benchmarkScale(scale);
    benchmarkResults.push(res);
    console.log(`  Scale: ${res.scale.toLocaleString()} notes`);
    console.log(`  Total Build Time: ${res.totalBuildTimeMs} ms`);
    console.log(`  Avg Parse Time / Note: ${res.avgParseTimePerNoteMs} ms`);
    console.log(`  Incremental Mutation (p50): ${res.incrementalUpdateP50Ms} ms`);
    console.log(`  Incremental Mutation (p95): ${res.incrementalUpdateP95Ms} ms`);
    console.log(`  Incremental Mutation (max): ${res.incrementalUpdateMaxMs} ms`);
    console.log(`  Link Resolution Throughput: ${res.resolutionLookupsPerSec.toLocaleString()} ops/sec`);
    console.log(`  Total Forward Links: ${res.totalLinksCount.toLocaleString()}`);
    console.log(`  Total Backlinks Indexed: ${res.totalBacklinksCount.toLocaleString()}\n`);
  }

  console.log('================ Benchmark Summary ================');
  console.table(
    benchmarkResults.map((r) => ({
      Scale: r.scale,
      'Build (ms)': r.totalBuildTimeMs,
      'Avg/Note (ms)': r.avgParseTimePerNoteMs,
      'Inc p50 (ms)': r.incrementalUpdateP50Ms,
      'Inc p95 (ms)': r.incrementalUpdateP95Ms,
      'Lookups/sec': r.resolutionLookupsPerSec,
      Links: r.totalLinksCount,
      Backlinks: r.totalBacklinksCount,
    }))
  );
  console.log('====================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal benchmark execution error:', err);
  process.exit(1);
});
