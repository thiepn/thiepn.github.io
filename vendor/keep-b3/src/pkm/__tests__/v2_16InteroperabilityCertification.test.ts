/**
 * V2.16 Open Interoperability & Ecosystem Expansion Certification Test Suite
 * 
 * Verifies the 12 release gates and comprehensive unit tests for V2.16:
 * - Unified 8-Stage Import Pipeline
 * - Deterministic Idempotency & Provenance
 * - Portable Markdown Serialization & Query/Wikilink Degradation
 * - Full Portable Vault Architecture
 * - iCalendar (ICS) RFC 5545 Compliance
 * - vCard RFC 6350 Compliance
 * - Bibliography (BibTeX, CSL JSON, RIS) & DOI Preservation
 * - Finance CSV Exact Minor Units & Formula Injection Defense
 * - Health & Metrics Units & Provenance
 * - Secret-Free Configuration Portability & Schema Validation
 * - Connector Lifecycle & Clean Disconnect Guarantee
 * - Plugin Packaging Sandbox & Permission Escalation Defense
 */

import {
  interoperabilityInventory,
  unifiedImportPipeline,
  openStandardsAdapter,
  configurationPortabilityEngine,
  connectorLifecycleManager,
  pluginPackagingValidator,
  v2_16InteroperabilityCertificationEngine,
} from '../v2/interoperability';

export interface V2_16_TestResult {
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

export async function runV2_16InteroperabilityCertificationTests(): Promise<V2_16_TestResult> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`V2.16 Interoperability Assertion Failed: ${message}`);
    }
  }

  console.log('--- Running V2.16 Open Interoperability & Ecosystem Expansion Suite ---');

  // ==========================================================================
  // 1. FORMAT CAPABILITY MATRIX & INVENTORY
  // ==========================================================================
  try {
    const matrix = interoperabilityInventory.getFormatMatrix();
    assert(matrix.length >= 10, 'Format matrix contains at least 10 documented open formats');

    const mdRecord = interoperabilityInventory.getRecord('Markdown (Portable)');
    assert(mdRecord !== undefined && mdRecord.importSupported && mdRecord.exportSupported, 'Markdown portable format supported for import and export');

    const icsRecord = interoperabilityInventory.getRecord('.ics');
    assert(icsRecord !== undefined && icsRecord.roundTripCapable, 'ICS calendar format certified round-trip capable');

    const finRecord = interoperabilityInventory.getRecord('Finance CSV (Exact Minor Units)');
    assert(finRecord !== undefined && finRecord.lossinessLevel === 'none', 'Finance CSV certified with zero lossiness');
  } catch (err: any) {
    failed++;
    errors.push(`Format Inventory Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 2. UNIFIED 8-STAGE IMPORT PIPELINE & SECURITY
  // ==========================================================================
  try {
    // Path traversal defense
    const maliciousFiles = [
      { path: '../etc/passwd', name: 'passwd', size: 100, mimeType: 'text/plain', content: 'root:x:0:0' },
    ];
    const securityAnalysis = await unifiedImportPipeline.analyzeSource(maliciousFiles);
    assert(!securityAnalysis.securityPass, 'Security validation rejects path traversal with ../');

    // Valid Markdown analysis
    const validFiles = [
      { path: 'notes/Research.md', name: 'Research.md', size: 250, mimeType: 'text/markdown', content: '# Research\n[[Topic A]]' },
      { path: 'notes/Attachment.png', name: 'Attachment.png', size: 1024, mimeType: 'image/png', content: '' },
    ];
    const validAnalysis = await unifiedImportPipeline.analyzeSource(validFiles);
    assert(validAnalysis.securityPass && validAnalysis.totalFiles === 2, 'Valid source files pass analysis without errors');
    assert(validAnalysis.attachmentsCount === 1, 'Attachment image correctly identified');

    // Preview generation
    const previews = unifiedImportPipeline.generatePreview(validFiles);
    assert(previews.length === 1 && previews[0].sourceTitle === 'Research', 'Preview accurately extracts document title without attachment noise');

    // Script tag stripping
    const xssFile = [
      { path: 'notes/xss.md', name: 'xss.md', size: 100, mimeType: 'text/markdown', content: '<script>alert("pwn")</script>Safe Content' },
    ];
    let createdNotes: any[] = [];
    const execResult = await unifiedImportPipeline.executeImport(
      xssFile,
      unifiedImportPipeline.generatePreview(xssFile),
      [],
      (notes) => { createdNotes = notes; }
    );
    assert(execResult.status === 'completed' && execResult.importedCount === 1, 'Import executes and commits clean note');
    assert(!createdNotes[0].content.includes('<script>'), 'Dangerous script tag stripped before canonical commit');
  } catch (err: any) {
    failed++;
    errors.push(`Import Pipeline Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 3. IMPORT IDEMPOTENCY & FINGERPRINTING
  // ==========================================================================
  try {
    const fpA = unifiedImportPipeline.generateFingerprint('file_import', 'notes/doc1.md', '# Content A');
    const fpB = unifiedImportPipeline.generateFingerprint('file_import', 'notes/doc1.md', '# Content A');
    const fpC = unifiedImportPipeline.generateFingerprint('file_import', 'notes/doc2.md', '# Content B');

    assert(fpA === fpB, 'Identical source path and content generates identical fingerprint');
    assert(fpA !== fpC, 'Different source file generates distinct fingerprint');
  } catch (err: any) {
    failed++;
    errors.push(`Import Fingerprint Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 4. OPEN STANDARDS: MARKDOWN PORTABILITY
  // ==========================================================================
  try {
    const rawMd = '# Overview\nSee [[Design System|UI Specs]] and transclusion ![[Footer Note]]\n```query\ntag: active\n```';
    const portableMd = openStandardsAdapter.transformMarkdownForExport(rawMd, {
      mode: 'portable',
      rewriteWikilinksToMarkdown: true,
      materializeTransclusions: true,
      materializeQueries: true,
    });

    assert(portableMd.includes('[UI Specs](./Design%20System.md)'), 'Wikilink converted to standard markdown relative link');
    assert(portableMd.includes('[Transcluded Content: See [Footer Note](./Footer%20Note.md)]'), 'Transclusion converted to clean citation reference');
    assert(portableMd.includes('> *[Portable Export: Dynamic query preserved below]*'), 'Interactive query block converted to readable quote');
  } catch (err: any) {
    failed++;
    errors.push(`Markdown Portability Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 5. OPEN STANDARDS: iCALENDAR (ICS) RFC 5545
  // ==========================================================================
  try {
    const events = [
      { uid: 'evt-all-day-1', summary: 'Global Summit', startDate: '2026-10-01', isAllDay: true },
      { uid: 'evt-timed-2', summary: 'Team Sync', startDate: '2026-10-02T14:30:00.000Z', isAllDay: false, recurrenceRule: 'FREQ=WEEKLY' },
    ];

    const icsString = openStandardsAdapter.serializeToICS(events);
    assert(icsString.includes('BEGIN:VCALENDAR') && icsString.includes('END:VCALENDAR'), 'ICS envelope generated');
    assert(icsString.includes('DTSTART;VALUE=DATE:20261001'), 'All-day event formatted with VALUE=DATE');
    assert(icsString.includes('RRULE:FREQ=WEEKLY'), 'Recurrence rule preserved');

    const parsedEvents = openStandardsAdapter.parseICS(icsString);
    assert(parsedEvents.length === 2, 'Parsed exactly 2 events from ICS');
    assert(parsedEvents[0].isAllDay && parsedEvents[0].summary === 'Global Summit', 'All-day event parsed accurately');
    assert(!parsedEvents[1].isAllDay && parsedEvents[1].recurrenceRule === 'FREQ=WEEKLY', 'Timed event and RRULE parsed accurately');
  } catch (err: any) {
    failed++;
    errors.push(`ICS Calendar Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 6. OPEN STANDARDS: vCARD RFC 6350
  // ==========================================================================
  try {
    const contacts = [
      { fn: 'Grace Hopper', org: 'US Navy', email: 'hopper@example.mil', tel: '+1-202-555-0199', bday: '1906-12-09' },
    ];
    const vcardStr = openStandardsAdapter.serializeToVCard(contacts);
    assert(vcardStr.includes('BEGIN:VCARD') && vcardStr.includes('VERSION:4.0'), 'vCard 4.0 header generated');
    assert(vcardStr.includes('FN:Grace Hopper') && vcardStr.includes('ORG:US Navy'), 'Full name and organization encoded');
    assert(vcardStr.includes('EMAIL;type=INTERNET:hopper@example.mil'), 'Email encoded with standard type');
  } catch (err: any) {
    failed++;
    errors.push(`vCard Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 7. OPEN STANDARDS: BIBLIOGRAPHY & CITATIONS
  // ==========================================================================
  try {
    const references = [
      {
        citeKey: 'shannon1948',
        type: 'article' as const,
        title: 'A Mathematical Theory of Communication',
        authors: ['Claude E. Shannon'],
        year: 1948,
        journalOrBooktitle: 'Bell System Technical Journal',
        doi: '10.1002/j.1538-7305.1948.tb01338.x',
      },
    ];

    const bibtex = openStandardsAdapter.serializeToBibTeX(references);
    assert(bibtex.includes('@article{shannon1948,'), 'BibTeX citekey and entry type formatted');
    assert(bibtex.includes('author = {Claude E. Shannon}'), 'Author list preserved');
    assert(bibtex.includes('doi = {10.1002/j.1538-7305.1948.tb01338.x}'), 'Global DOI persistent identifier preserved');
  } catch (err: any) {
    failed++;
    errors.push(`Bibliography Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 8. OPEN STANDARDS: FINANCE CSV & FORMULA SAFETY
  // ==========================================================================
  try {
    const txs = [
      {
        date: '2026-09-14',
        amountMinor: 5432,
        formattedAmount: '54.32',
        currency: 'USD',
        account: 'Business Checking',
        category: 'Software Subscriptions',
        payee: '@CloudHost=SUM(1,2)', // Formula injection attack attempt
      },
    ];

    const finCsv = openStandardsAdapter.serializeFinanceCSV(txs);
    assert(finCsv.includes('5432'), 'Exact integer cents (5432) serialized in minor units');
    assert(finCsv.includes("'@CloudHost=SUM(1,2)"), 'Formula injection attempt sanitized with leading quote');
  } catch (err: any) {
    failed++;
    errors.push(`Finance CSV Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 9. CONFIGURATION PORTABILITY & SECRET STRIPPING
  // ==========================================================================
  try {
    const configExport = configurationPortabilityEngine.exportConfiguration(
      [{ id: 'v1', name: 'Kanban View' }],
      [{ id: 'w1', name: 'Deep Work' }],
      [{ id: 'wf1', title: 'Start Day', actions: [] }],
      [{ id: 't1', name: 'Journal', templateText: '# Daily Journal' }],
      { theme: 'dark', apiKeys: 'secret_live_key_99', oauthTokens: 'token_abc' }
    );

    const jsonStr = JSON.stringify(configExport);
    assert(!jsonStr.includes('secret_live_key_99'), 'API keys stripped from configuration export');
    assert(!jsonStr.includes('token_abc'), 'OAuth tokens stripped from configuration export');

    const preview = configurationPortabilityEngine.validateAndPreviewConfig(jsonStr);
    assert(preview.isValid && preview.securityViolations.length === 0, 'Clean configuration passes validation');

    // Executable injection test
    const maliciousConfig = JSON.stringify({
      manifestVersion: '2.16',
      data: {
        payload: '<script>window.pwned=true</script>',
      },
    });
    const maliciousPreview = configurationPortabilityEngine.validateAndPreviewConfig(maliciousConfig);
    assert(!maliciousPreview.isValid && maliciousPreview.securityViolations.length > 0, 'Executable script detected and rejected during config preview');
  } catch (err: any) {
    failed++;
    errors.push(`Config Portability Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 10. CONNECTOR LIFECYCLE & ISOLATION
  // ==========================================================================
  try {
    const refreshRes = await connectorLifecycleManager.refreshConnector('conn_gcal_personal');
    assert(refreshRes.success && refreshRes.status === 'connected', 'Connector refresh executes incrementally');

    const disconnectRes = connectorLifecycleManager.disconnectConnector('conn_gcal_personal');
    assert(disconnectRes.success && disconnectRes.preservedCanonicalItems, 'Connector disconnect preserves canonical imported resources');
  } catch (err: any) {
    failed++;
    errors.push(`Connector Lifecycle Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 11. PLUGIN PACKAGING & SANDBOX INVARIANTS
  // ==========================================================================
  try {
    const validManifest = {
      id: 'org.pkm.formatter',
      name: 'Text Formatter',
      version: '1.0.0',
      minCoreVersion: '2.10.0',
      permissions: ['storage:read'],
    };
    const validRes = pluginPackagingValidator.validatePackage(validManifest, 20000);
    assert(validRes.isValid, 'Valid plugin package passes manifest verification');

    // Escalation test
    const escalatedManifest = {
      id: 'org.pkm.formatter',
      name: 'Text Formatter',
      version: '1.1.0',
      minCoreVersion: '2.10.0',
      permissions: ['storage:read', 'network:bounded_cors'],
    };
    // Install valid first
    pluginPackagingValidator.installPlugin(validManifest as any);
    const escalatedRes = pluginPackagingValidator.validatePackage(escalatedManifest, 20000);
    assert(escalatedRes.escalatedPermissions.includes('network:bounded_cors'), 'Permission escalation accurately flagged for user review');

    // Preservation test
    const uninstalled = pluginPackagingValidator.uninstallPlugin('org.pkm.formatter');
    assert(uninstalled.success && uninstalled.dataPreserved, 'Plugin uninstall preserves created user data');
  } catch (err: any) {
    failed++;
    errors.push(`Plugin Packaging Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 12. RELEASE CERTIFICATION GATES LEDGER
  // ==========================================================================
  try {
    const cert = v2_16InteroperabilityCertificationEngine.runCertification();
    assert(cert.overallPassed, 'V2.16 Certification engine reports overallPassed === true');
    assert(cert.passedGates === 12 && cert.failedGates === 0, 'All 12 certification gates passed (100% score)');
    assert(cert.classification === 'V2.16 — OPEN INTEROPERABILITY & ECOSYSTEM READY', 'Certified classification matches ready threshold');
  } catch (err: any) {
    failed++;
    errors.push(`Release Certification Exception: ${err.message || err}`);
  }

  return {
    total: passed + failed,
    passed,
    failed,
    errors,
  };
}
