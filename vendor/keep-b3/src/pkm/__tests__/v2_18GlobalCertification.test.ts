/**
 * PKM V2.18 Global Usability, Accessibility, Localization & Content Fidelity Certification Tests
 */

import {
  v2GlobalizationEngine,
  v2UnicodeAndBidiEngine,
  v2MultilingualSearchEngine,
  v2AccessibilityEngine,
  v2_18GlobalCertificationEngine,
} from '../v2/globalization';

export async function runV2_18GlobalCertificationTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`V2.18 Test Failure [${testName}]: ${detail || 'Condition evaluated to false'}`);
    }
  }

  // 1. Master Certification Run
  try {
    const report = await v2_18GlobalCertificationEngine.runFullCertification();
    assert(report.overallPassed, 'Master 18-Gate Certification', `Passed ${report.passedGates}/${report.totalGates} gates`);
    assert(report.classification === 'V2.18 — GLOBAL USABILITY & ACCESSIBILITY READY', 'V2.18 Ready Classification');
    assert(report.gates.length === 18, '18 Release Gates Present');
  } catch (err: any) {
    failed++;
    errors.push(`Master certification exception: ${err?.message || err}`);
  }

  // 2. Canonical Data Invariance
  try {
    const testDoc = {
      id: 'doc-canonical-999',
      date: '2026-09-14',
      amount: 4999,
      currency: 'USD',
      status: 'active',
    };
    const jsonBefore = JSON.stringify(testDoc);

    v2GlobalizationEngine.setConfig({ language: 'de', locale: 'de-DE' });
    const formattedDate = v2GlobalizationEngine.formatDateOnly(testDoc.date);
    const formattedMoney = v2GlobalizationEngine.formatCurrency(testDoc.amount / 100, testDoc.currency);
    v2GlobalizationEngine.setConfig({ language: 'en', locale: 'en-US' });

    const jsonAfter = JSON.stringify(testDoc);
    assert(jsonBefore === jsonAfter, 'Canonical Data Invariance Under Locale Switch');
    assert(formattedDate.includes('2026'), 'Date formatting produced valid year');
    assert(formattedMoney.includes('49'), 'Money formatting preserved value');
  } catch (err: any) {
    failed++;
    errors.push(`Canonical data invariance error: ${err?.message || err}`);
  }

  // 3. Numeric & Comma Decimal Input Parsing
  try {
    const p1 = v2GlobalizationEngine.parseNumber('1,5');
    const p2 = v2GlobalizationEngine.parseNumber('10.000,50');
    const p3 = v2GlobalizationEngine.parseNumber('10 000,50');
    const p4 = v2GlobalizationEngine.parseNumber('invalid_str');

    assert(p1.isValid && p1.value === 1.5, 'Parse decimal comma "1,5"');
    assert(p2.isValid && p2.value === 10000.5, 'Parse German format "10.000,50"');
    assert(p3.isValid && p3.value === 10000.5, 'Parse French/Space format "10 000,50"');
    assert(!p4.isValid, 'Reject malformed number string');
  } catch (err: any) {
    failed++;
    errors.push(`Number parsing error: ${err?.message || err}`);
  }

  // 4. ICU Pluralization & Missing Key Fallback
  try {
    const plZero = v2GlobalizationEngine.t('tasks', 'items_count', { count: 0 }, 'en');
    const plOne = v2GlobalizationEngine.t('tasks', 'items_count', { count: 1 }, 'en');
    const plMany = v2GlobalizationEngine.t('tasks', 'items_count', { count: 12 }, 'en');
    const missing = v2GlobalizationEngine.t('unknown_domain', 'unknown_key', undefined, 'en');

    assert(plZero === 'No items', 'Plural rule zero');
    assert(plOne === '1 item', 'Plural rule one');
    assert(plMany === '12 items', 'Plural rule other');
    assert(missing === '[unknown_domain.unknown_key]', 'Safe fallback for missing translation key');
  } catch (err: any) {
    failed++;
    errors.push(`Pluralization & translation error: ${err?.message || err}`);
  }

  // 5. Grapheme Clusters, Surrogate Pairs & Emoji
  try {
    const complex = '👍🏽👩‍💻';
    const count = v2UnicodeAndBidiEngine.getGraphemeCount(complex);
    const sliced = v2UnicodeAndBidiEngine.sliceGraphemes(complex, 0, 1);

    assert(count >= 2, 'Grapheme count for complex emojis');
    assert(sliced.length > 0, 'Safe grapheme slice');
  } catch (err: any) {
    failed++;
    errors.push(`Grapheme cluster error: ${err?.message || err}`);
  }

  // 6. Filename Sanitization & Collision Detection
  try {
    const san = v2UnicodeAndBidiEngine.sanitizeFilename('Projekt/Übersicht: 2026?');
    const col = v2UnicodeAndBidiEngine.detectFilenameCollision('notiz.md', 'NOTIZ.MD');

    assert(san.isWindowsSafe, 'Sanitized filename is Windows safe');
    assert(!san.safeFilename.includes('/') && !san.safeFilename.includes(':'), 'Forbidden characters removed');
    assert(col.collidesCaseInsensitive, 'Case-insensitive collision detected');
  } catch (err: any) {
    failed++;
    errors.push(`Filename safety error: ${err?.message || err}`);
  }

  // 7. BiDi Security & Spoofing Defense
  try {
    const maliciousFilename = 'annual_report_\u202Efdp.exe';
    const sanitized = v2UnicodeAndBidiEngine.sanitizeSecurityIdentifier(maliciousFilename);

    assert(sanitized.hasBidiSpoofingControls, 'Detected BiDi spoofing controls');
    assert(!sanitized.sanitized.includes('\u202E'), 'Removed RLO character');
  } catch (err: any) {
    failed++;
    errors.push(`BiDi security error: ${err?.message || err}`);
  }

  // 8. Multilingual Offline Search
  try {
    v2MultilingualSearchEngine.clear();
    v2MultilingualSearchEngine.indexDocument({
      id: 'doc-search-1',
      title: '한국어 검색 테스트',
      body: '완전한 로컬 지식 관리 시스템',
      tags: ['pkm', 'korean'],
    });

    const results = v2MultilingualSearchEngine.search('한국어');
    assert(results.length === 1 && results[0].resourceId === 'doc-search-1', 'Korean keyword search');
    assert(results[0].highlightedTitle.includes('<mark>'), 'Unicode-safe search highlight');
  } catch (err: any) {
    failed++;
    errors.push(`Multilingual search error: ${err?.message || err}`);
  }

  // 9. Turkish Casing Rules
  try {
    const trUpper = v2GlobalizationEngine.toTurkishUpper('istanbul');
    const trLower = v2GlobalizationEngine.toTurkishLower('İSTANBUL');

    assert(trUpper.includes('İ'), 'Turkish upper converts i to dotted İ');
    assert(trLower.includes('i'), 'Turkish lower converts dotted İ to i');
  } catch (err: any) {
    failed++;
    errors.push(`Turkish casing error: ${err?.message || err}`);
  }

  // 10. Accessible Non-Spatial Alternatives
  try {
    const chartData = v2AccessibilityEngine.generateAccessibleChartData(
      'Blood Pressure',
      'Systolic',
      [
        { label: 'Day 1', value: 120 },
        { label: 'Day 2', value: 124 },
      ],
      'mmHg'
    );

    assert(chartData.min === 120 && chartData.max === 124, 'Accessible chart min/max values');
    assert(chartData.dataPoints.length === 2, 'Accessible chart data table rows');
  } catch (err: any) {
    failed++;
    errors.push(`Accessibility alternative error: ${err?.message || err}`);
  }

  return { passed, failed, errors };
}
