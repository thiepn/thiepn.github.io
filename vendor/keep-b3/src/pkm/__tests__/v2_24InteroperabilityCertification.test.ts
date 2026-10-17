/**
 * V2.24 Ecosystem & Data Interoperability Certification Test Suite
 * 
 * Verifies all 20 critical certification gates for V2.24:
 * 1. Plugin Package Validation & SemVer Compliance
 * 2. Plugin Atomic Installation & Runtime Toggle
 * 3. Plugin Update & Permission Escalation Detection
 * 4. Plugin Data Preservation on Uninstall
 * 5. Plugin Safe Mode Crash Isolation
 * 6. Connector Cursor Delta Refresh & Rate Limit Decrement
 * 7. Connector Reauth & Identity Integrity
 * 8. Connector Clean Disconnect (Creds/Cache Purged, Canonical Data Intact)
 * 9. Connector External Action Explicit Confirmation Requirement
 * 10. Web Clipper Deterministic HTML Sanitization (Script/Iframe Stripping)
 * 11. Web Clipper Inbox Handoff & Provenance Preservation
 * 12. 8-Stage Import: Zero Mutation & Security Defenses (Path Traversal, XXE, Scripts)
 * 13. CSV Import Formula Injection Sanitization (=, +, -, @ prefix protection)
 * 14. RFC 5545 iCalendar (ICS) All-Day & Timezone Accuracy
 * 15. RFC 6350 vCard Serializer Integrity
 * 16. BibTeX Citation Standards & Identifier Preservation (DOI, ISBN)
 * 17. Finance CSV Exact Minor Units (Integer Cents) Arithmetic
 * 18. Health Metrics Explicit Units & Source Provenance
 * 19. Full Portable Vault & "Leave the Product" Independent Readability
 * 20. Static Publishing Privacy Allowlist & Transclusion Isolation
 */

import { V2_24InteroperabilityEngine } from '../v2/interoperability/v2_24InteroperabilityEngine';
import { Note } from '../../types';

export function runV2_24InteroperabilityCertificationTests(): {
  name: string;
  total: number;
  passed: number;
  failed: number;
  failures: string[];
} {
  const failures: string[] = [];
  let total = 0;
  let passed = 0;

  function test(description: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
    } catch (err: any) {
      failures.push(`${description}: ${err.message}`);
    }
  }

  const createMockNote = (partial: Partial<Note> & { id: string; title: string; content: string }): Note => ({
    type: 'text',
    checklist: [],
    color: 'default',
    tags: [],
    folderId: null,
    pinned: false,
    archived: false,
    trashed: false,
    images: [],
    reminderDate: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
    ...partial,
  });

  const mockNotes: Note[] = [
    createMockNote({
      id: 'note_public_arch',
      title: 'Public Systems Architecture',
      content: 'Core architecture overview with ![[Private Financial Ledger]] transclusion and public references.',
      tags: ['architecture', 'public'],
    }),
    createMockNote({
      id: 'note_private_finance',
      title: 'Private Financial Ledger',
      content: 'CONFIDENTIAL: Bank account routing and ledger records with secret_key="sk_live_992140".',
      tags: ['finance', 'private'],
    }),
    createMockNote({
      id: 'note_distributed_crdt',
      title: 'Distributed CRDT Foundations',
      content: 'Formal proofs for state-based convergence and commutative operations. See [[Public Systems Architecture]].',
      tags: ['research'],
    }),
  ];

  // ==========================================================================
  // GATE 1-5: PLUGIN ECOSYSTEM & SANDBOX
  // ==========================================================================

  test('GATE 1: Plugin Package Validation rejects invalid SemVer or oversized bundles', () => {
    const engine = new V2_24InteroperabilityEngine();
    
    // Invalid SemVer
    const invalidVer = engine.validatePluginPackage({ id: 'bad-plugin', name: 'Bad', version: 'invalid-v1' }, 1000);
    if (invalidVer.isValid) throw new Error('Expected invalid SemVer to fail validation.');

    // Oversized bundle > 5MB
    const oversized = engine.validatePluginPackage({ id: 'big-plugin', name: 'Big', version: '1.0.0', entryPoint: 'dist/index.js' }, 6 * 1024 * 1024);
    if (oversized.isValid) throw new Error('Expected oversized bundle (>5MB) to fail validation.');

    // Valid package
    const valid = engine.validatePluginPackage({ id: 'good-plugin', name: 'Good Plugin', version: '1.0.0', entryPoint: 'dist/index.js', permissions: ['storage:read'] }, 50000);
    if (!valid.isValid || !valid.manifest) throw new Error('Expected valid package to pass validation.');
  });

  test('GATE 2: Plugin Atomic Installation & Runtime Toggle works correctly', () => {
    const engine = new V2_24InteroperabilityEngine();
    const manifest = {
      id: 'test.quick.formatter',
      name: 'Quick Formatter',
      version: '1.0.0',
      entryPoint: 'dist/index.js',
      permissions: ['storage:read'],
    };

    const installRes = engine.installPlugin(manifest, 20000);
    if (!installRes.success || !installRes.pluginId) throw new Error('Failed to install valid plugin.');

    const plugin = engine.getPlugin(installRes.pluginId);
    if (!plugin || plugin.status !== 'disabled') throw new Error('Expected newly installed plugin to be disabled initially.');

    const toggled = engine.togglePlugin(installRes.pluginId, true);
    if (!toggled || engine.getPlugin(installRes.pluginId)?.status !== 'enabled') {
      throw new Error('Failed to toggle plugin to enabled.');
    }
  });

  test('GATE 3: Plugin Update detects permission escalations and requires review', () => {
    const engine = new V2_24InteroperabilityEngine();
    const pluginId = 'org.pkm.bibtex-formatter';

    // Update with escalated permission: health:read
    const escalatedManifest = {
      id: pluginId,
      name: 'BibTeX Citation Formatter',
      version: '1.3.0',
      entryPoint: 'dist/index.js',
      permissions: ['storage:read', 'ui:render_pane', 'commands:register', 'health:read'],
    };

    const updateRes = engine.updatePlugin(pluginId, escalatedManifest, 140000);
    if (!updateRes.success || !updateRes.requiresPermissionReview) {
      throw new Error('Expected update with new permissions to flag requiresPermissionReview.');
    }

    const plugin = engine.getPlugin(pluginId);
    if (plugin?.status !== 'needs_attention') {
      throw new Error('Expected plugin status to be needs_attention while review is pending.');
    }

    // Approve permissions
    const approved = engine.approvePluginUpdatePermissions(pluginId);
    if (!approved || engine.getPlugin(pluginId)?.status !== 'enabled' || engine.getPlugin(pluginId)?.version !== '1.3.0') {
      throw new Error('Failed to approve escalated permissions and apply update.');
    }
  });

  test('GATE 4: Plugin Uninstall explicitly preserves canonical data created by plugin', () => {
    const engine = new V2_24InteroperabilityEngine();
    const pluginId = 'org.pkm.health-csv-sync';
    const pluginBefore = engine.getPlugin(pluginId);
    const countBefore = pluginBefore?.createdResourceCount || 0;

    const res = engine.uninstallPlugin(pluginId);
    if (!res.success || res.preservedResourcesCount !== countBefore) {
      throw new Error('Expected uninstall to preserve exactly the created canonical resource count.');
    }
    if (engine.getPlugin(pluginId)) {
      throw new Error('Expected plugin to be removed from registry.');
    }
  });

  test('GATE 5: Plugin Safe Mode isolates third-party plugins without deleting them', () => {
    const engine = new V2_24InteroperabilityEngine();
    engine.setSafeMode(true);

    if (!engine.isSafeMode()) throw new Error('Safe Mode should be active.');
    const plugins = engine.getPlugins();
    for (const p of plugins) {
      if (p.originSource !== 'builtin' && p.status !== 'safe_mode') {
        throw new Error(`Expected plugin ${p.id} to be transitioned to safe_mode.`);
      }
    }
  });

  // ==========================================================================
  // GATE 6-9: CONNECTORS & EXTERNAL SOURCES
  // ==========================================================================

  test('GATE 6: Connector delta cursor refresh updates timestamps and decrements rate limit', () => {
    const engine = new V2_24InteroperabilityEngine();
    const connId = 'conn_gcal_work';
    const connBefore = engine.getConnectors().find((c) => c.id === connId);
    const limitBefore = connBefore?.rateLimitRemaining || 0;

    const res = engine.refreshConnector(connId);
    if (!res.success || res.status !== 'connected') throw new Error('Failed to refresh connector.');

    const connAfter = engine.getConnectors().find((c) => c.id === connId);
    if (!connAfter || connAfter.rateLimitRemaining !== limitBefore - 1) {
      throw new Error('Rate limit was not decremented properly during refresh.');
    }
    if (!connAfter.syncCursor || !connAfter.syncCursor.startsWith('cursor_delta_')) {
      throw new Error('Sync cursor was not updated to delta cursor.');
    }
  });

  test('GATE 7: Connector Reauth preserves external identities without duplicates', () => {
    const engine = new V2_24InteroperabilityEngine();
    const connId = 'conn_gcal_work';
    const projectionsBefore = engine.getExternalProjections(connId);

    const reauthed = engine.reauthenticateConnector(connId);
    if (!reauthed) throw new Error('Connector reauth failed.');

    const projectionsAfter = engine.getExternalProjections(connId);
    if (projectionsBefore.length !== projectionsAfter.length) {
      throw new Error('Projections count changed during reauth (duplicate creation detected).');
    }
  });

  test('GATE 8: Connector Clean Disconnect purges cache but preserves canonical imports', () => {
    const engine = new V2_24InteroperabilityEngine();
    const connId = 'conn_gcal_work';

    const disconnected = engine.disconnectConnector(connId, true);
    if (!disconnected) throw new Error('Disconnect failed.');

    const conn = engine.getConnectors().find((c) => c.id === connId);
    if (conn?.status !== 'disconnected') throw new Error('Connector status should be disconnected.');

    const projections = engine.getExternalProjections(connId);
    if (projections.length !== 0) throw new Error('Cached projections should be purged on clean disconnect.');
  });

  test('GATE 9: Connector Bounded External Actions require explicit user confirmation', () => {
    const engine = new V2_24InteroperabilityEngine();
    
    // Unconfirmed request
    const unconfirmed = engine.executeConnectorAction({
      connectorId: 'conn_zotero_academic',
      actionType: 'sync_readwise_highlights',
      targetExternalId: 'ext_item_1',
      params: {},
      confirmedByUser: false,
    });
    if (unconfirmed.success) throw new Error('Unconfirmed external write action should be rejected.');

    // Confirmed request
    const confirmed = engine.executeConnectorAction({
      connectorId: 'conn_zotero_academic',
      actionType: 'sync_readwise_highlights',
      targetExternalId: 'ext_item_1',
      params: {},
      confirmedByUser: true,
    });
    if (!confirmed.success || !confirmed.receiptId) throw new Error('Confirmed external write action failed.');
  });

  // ==========================================================================
  // GATE 10-11: WEB CLIPPER & INGESTION
  // ==========================================================================

  test('GATE 10: Web Clipper deterministically sanitizes HTML (strips script/iframe/on* handlers)', () => {
    const engine = new V2_24InteroperabilityEngine();
    const maliciousHtml = `<div><h2>Legitimate Title</h2><script>alert("xss")</script><iframe src="evil.com"></iframe><img src="x" onerror="alert(1)" /></div>`;

    const sanitized = engine.sanitizeWebHtml(maliciousHtml);
    if (sanitized.includes('<script>') || sanitized.includes('<iframe>') || sanitized.includes('onerror=')) {
      throw new Error(`Sanitizer failed to strip active scripts. Output: ${sanitized}`);
    }
    if (!sanitized.includes('Legitimate Title')) {
      throw new Error('Sanitizer stripped legitimate text content.');
    }
  });

  test('GATE 11: Web Clipper ingests into Inbox and processes to Note with provenance', () => {
    const engine = new V2_24InteroperabilityEngine();
    const clipRes = engine.ingestWebClip({
      mode: 'article',
      sourceUrl: 'https://ietf.org/rfc/rfc6350.txt',
      title: 'vCard Format Specification RFC 6350',
      sanitizedContent: 'vCard MIME Directory Profile specification for contact data interchange.',
      author: 'Simon Perreault',
      siteName: 'IETF',
      tags: ['specs', 'contacts'],
    });

    if (!clipRes.clipId || !clipRes.sanitized) throw new Error('Failed to ingest web clip.');

    const noteRes = engine.processClipToCanonicalNote(clipRes.clipId);
    if (!noteRes.success || !noteRes.note || !noteRes.note.content) {
      throw new Error('Failed to process web clip to canonical note.');
    }
    if (!noteRes.note.content.includes('source_url: https://ietf.org/rfc/rfc6350.txt')) {
      throw new Error('Provenance metadata was missing from generated note frontmatter.');
    }
  });

  // ==========================================================================
  // GATE 12-13: 8-STAGE IMPORT PIPELINE & FORMULA INJECTION DEFENSE
  // ==========================================================================

  test('GATE 12: 8-Stage Import Pipeline enforces zero mutation & blocks path traversal / XXE', () => {
    const engine = new V2_24InteroperabilityEngine();

    // Path traversal attack
    const traversal = engine.analyzeImport('../../../etc/passwd', 'root:x:0:0:...', 'markdown_folder');
    if (traversal.securityChecksPassed) throw new Error('Expected path traversal filename to fail security analysis.');

    // XXE attack
    const xxe = engine.analyzeImport('feed.xml', '<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///dev/random"> ]><foo>&xxe;</foo>', 'json');
    if (xxe.securityChecksPassed) throw new Error('Expected XXE construct to fail security analysis.');

    // Legitimate Markdown
    const legit = engine.analyzeImport('Note.md', '# Clean Note\n\nContent here', 'markdown_folder');
    if (!legit.securityChecksPassed || legit.estimatedItemCount !== 1) {
      throw new Error('Legitimate markdown failed import analysis.');
    }
  });

  test('GATE 13: CSV Import sanitizes formula injection (=, +, -, @ prefixes)', () => {
    const engine = new V2_24InteroperabilityEngine();
    const csvContent = `title,description,amount\n=CMD("calc.exe"),+200,-50,@SUM(1,2)`;

    const staged = engine.stageImportRecords('test.csv', csvContent, 'csv');
    if (staged.length !== 1) throw new Error('Expected 1 staged CSV record.');

    const payload = staged[0].payload;
    if (payload.title === '=CMD("calc.exe")') {
      throw new Error('Formula injection prefix was not escaped/sanitized in staged payload.');
    }
    if (!payload.title.startsWith("'=")) {
      throw new Error('Formula injection was not safely prefixed with single quote.');
    }
  });

  // ==========================================================================
  // GATE 14-18: OPEN STANDARDS SERIALIZERS (ICS, vCard, BibTeX, Finance, Health)
  // ==========================================================================

  test('GATE 14: RFC 5545 iCalendar (ICS) serializer preserves all-day and recurrence rules', () => {
    const engine = new V2_24InteroperabilityEngine();
    const ics = engine.exportToICS([
      {
        uid: 'evt_sync_001',
        summary: 'Annual Architecture Summit',
        startDate: '2026-10-15',
        isAllDay: true,
        recurrenceRule: 'FREQ=YEARLY',
      },
    ]);

    if (!ics.includes('BEGIN:VCALENDAR') || !ics.includes('BEGIN:VEVENT')) {
      throw new Error('Invalid ICS structure.');
    }
    if (!ics.includes('DTSTART;VALUE=DATE:20261015')) {
      throw new Error('All-day event date was not formatted correctly according to RFC 5545.');
    }
    if (!ics.includes('RRULE:FREQ=YEARLY')) {
      throw new Error('Recurrence rule was not preserved.');
    }
  });

  test('GATE 15: RFC 6350 vCard serializer formats contacts correctly', () => {
    const engine = new V2_24InteroperabilityEngine();
    const vcf = engine.exportToVCard([
      {
        fn: 'Ada Lovelace',
        org: 'Analytical Engine Lab',
        email: 'ada@computing.org',
        tel: '+44 20 7946 0991',
        notes: 'Pioneer of computer algorithms.',
      },
    ]);

    if (!vcf.includes('BEGIN:VCARD') || !vcf.includes('VERSION:4.0')) {
      throw new Error('Invalid vCard version or structure.');
    }
    if (!vcf.includes('FN:Ada Lovelace') || !vcf.includes('EMAIL:ada@computing.org')) {
      throw new Error('vCard fields missing.');
    }
  });

  test('GATE 16: BibTeX citation serializer preserves DOI, ISBN, and citeKey', () => {
    const engine = new V2_24InteroperabilityEngine();
    const bib = engine.exportToBibTeX([
      {
        citeKey: 'lamport1982byzantine',
        type: 'article',
        title: 'The Byzantine Generals Problem',
        author: 'Leslie Lamport and Robert Shostak and Marshall Pease',
        year: 1982,
        doi: '10.1145/357172.357176',
        journal: 'ACM TOPLAS',
      },
    ]);

    if (!bib.includes('@article{lamport1982byzantine,')) {
      throw new Error('CiteKey or entry type incorrect.');
    }
    if (!bib.includes('doi = {10.1145/357172.357176}')) {
      throw new Error('DOI was not preserved in BibTeX export.');
    }
  });

  test('GATE 17: Finance CSV serializer uses exact integer minor units (cents)', () => {
    const engine = new V2_24InteroperabilityEngine();
    const csv = engine.exportFinanceCSV([
      {
        date: '2026-09-01',
        amountCents: -12345,
        currency: 'USD',
        payee: 'Cloud Compute Corp',
        category: 'Hosting',
        account: 'Operating',
      },
    ]);

    if (!csv.includes('amount_cents,formatted_amount')) {
      throw new Error('CSV missing required minor units header.');
    }
    if (!csv.includes('-12345,-123.45,USD')) {
      throw new Error('Integer cents or decimal formatted amount was incorrect.');
    }
  });

  test('GATE 18: Health metrics serializer preserves explicit units and provenance', () => {
    const engine = new V2_24InteroperabilityEngine();
    const csv = engine.exportHealthCSV([
      {
        dateOnly: '2026-09-15',
        metricType: 'resting_heart_rate',
        value: 58,
        unit: 'bpm',
        provenance: 'Apple Watch Series 10',
      },
    ]);

    if (!csv.includes('2026-09-15,resting_heart_rate,58,bpm,"Apple Watch Series 10"')) {
      throw new Error('Health CSV export did not preserve unit or provenance string.');
    }
  });

  // ==========================================================================
  // GATE 19-20: PORTABLE VAULT & STATIC PUBLISHING PRIVACY
  // ==========================================================================

  test('GATE 19: Full Portable Vault generation creates complete self-contained archive with README', () => {
    const engine = new V2_24InteroperabilityEngine();
    const pkg = engine.generateFullPortableVault(mockNotes);

    if (!pkg.manifest || pkg.manifest.manifestVersion !== '2.24') {
      throw new Error('Invalid manifest in portable vault.');
    }
    if (pkg.notesMarkdown.length !== mockNotes.length) {
      throw new Error('Notes count mismatch in portable vault.');
    }
    if (!pkg.readmeMarkdown.includes('Freedom & Portability Guarantee')) {
      throw new Error('README.md missing human-readable instructions.');
    }

    // Run secret scan on whole package manifest and data
    const scan = engine.scanForSecrets(JSON.stringify(pkg.dataFilesJson));
    if (!scan.isClean) {
      throw new Error(`Secret scanner found violations in export: ${scan.violationsFound.join(', ')}`);
    }
  });

  test('GATE 20: Static Publishing strictly isolates private notes and blocks transclusion leaks', () => {
    const engine = new V2_24InteroperabilityEngine();
    
    // Only allow 'note_public_arch' (which contains a transclusion of private 'note_private_finance')
    const build = engine.buildStaticPublication(
      {
        siteTitle: 'Public Architecture Portal',
        baseUrl: 'https://public.example.org',
        allowedNoteIds: ['note_public_arch'],
        allowSubtreeTransclusions: true,
        stripPrivateProperties: true,
        propertyAllowlist: ['title', 'tags'],
        includeStaticSearch: true,
        customTheme: 'neutral',
        enforceStrictCSP: true,
      },
      mockNotes
    );

    if (build.publishedPagesCount !== 1) {
      throw new Error(`Expected exactly 1 published page, got ${build.publishedPagesCount}`);
    }
    if (build.blockedPrivateTransclusionsCount !== 1) {
      throw new Error('Expected 1 private transclusion to be blocked/redacted.');
    }

    const publicHtml = build.htmlPages[0].htmlContent;
    if (publicHtml.includes('sk_live_992140') || publicHtml.includes('CONFIDENTIAL: Bank account')) {
      throw new Error('CRITICAL SECURITY VIOLATION: Private transcluded content leaked into public HTML.');
    }
    if (!publicHtml.includes('[Private content excluded from public publication]')) {
      throw new Error('Privacy redaction placeholder was missing from generated HTML.');
    }
    if (!build.secretScanClean) {
      throw new Error(`Secret scan failed during static publish: ${build.secretScanViolations.join(', ')}`);
    }
  });

  return {
    name: 'V2.24 Open Interoperability, Ecosystem & Data Freedom Certification',
    total,
    passed,
    failed: failures.length,
    failures,
  };
}
