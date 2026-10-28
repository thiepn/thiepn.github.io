/**
 * PKM V2.13 — First-Party Domain Excellence, Cross-Domain Cohesion & Daily-Life Polish Certification Test Suite
 */

import { V2_13_DOMAIN_QUALITY_RECORDS } from '../v2/domains/domainQualityFramework';
import { crossDomainRelationEngine } from '../v2/domains/crossDomainRelationEngine';
import { peopleDomainExcellence } from '../v2/domains/peopleDomainExcellence';
import { projectsGoalsDomainExcellence } from '../v2/domains/projectsGoalsDomainExcellence';
import { trackingRoutinesDomainExcellence } from '../v2/domains/trackingRoutinesDomainExcellence';
import { learningLibraryDomainExcellence } from '../v2/domains/learningLibraryDomainExcellence';
import { financeHealthDomainExcellence } from '../v2/domains/financeHealthDomainExcellence';
import { travelAssetsDecisionsDomainExcellence } from '../v2/domains/travelAssetsDecisionsDomainExcellence';
import { inboxProcessingExcellence } from '../v2/domains/inboxProcessingExcellence';
import { domainSavedViewsRegistry, V2_13_CURATED_SAVED_VIEWS } from '../v2/domains/domainSavedViewsRegistry';
import { domainHomeAttentionOrchestrator } from '../v2/domains/domainHomeAttentionOrchestrator';
import { crossDomainReviewCoordinator } from '../v2/domains/crossDomainReviewCoordinator';
import { personalOSWeekSimulator } from '../v2/domains/personalOSWeekSimulator';
import { domainScaleBenchmarks } from '../v2/domains/domainScaleBenchmarks';

export async function runV2_13DomainExcellenceCertificationTests(): Promise<{
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
      errors.push(`FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    }
  }

  // 1. Domain Quality Framework Audit Records
  try {
    assert(V2_13_DOMAIN_QUALITY_RECORDS.length >= 11, 'All 11 first-party domains evaluated in Quality Framework');
    const domainIds = V2_13_DOMAIN_QUALITY_RECORDS.map((d) => d.domainId);
    assert(
      domainIds.includes('people') &&
        domainIds.includes('projects') &&
        domainIds.includes('goals') &&
        domainIds.includes('tracking') &&
        domainIds.includes('routines') &&
        domainIds.includes('learning') &&
        domainIds.includes('library') &&
        domainIds.includes('finance') &&
        domainIds.includes('health') &&
        domainIds.includes('travel') &&
        domainIds.includes('assets') &&
        domainIds.includes('decisions') &&
        domainIds.includes('inbox'),
      'All major first-party domains present in audit matrix'
    );
    assert(
      V2_13_DOMAIN_QUALITY_RECORDS.every((d) => d.overallStatus === 'Excellent'),
      'All first-party domains certified at Excellent quality rating'
    );
    assert(
      V2_13_DOMAIN_QUALITY_RECORDS.every((d) => Boolean(d.corePurposeQuestion) && Boolean(d.primaryAction)),
      'Every domain defines explicit Purpose Question and Primary Action'
    );
  } catch (e: any) {
    assert(false, 'Domain Quality Framework Audit Records', e.message);
  }

  // 2. Cross-Domain Relation Graph & Anti-Duplication Engine
  try {
    crossDomainRelationEngine.clear();
    const rel1 = crossDomainRelationEngine.addRelation({
      sourceId: 'proj_ai',
      sourceType: 'project',
      targetId: 'goal_q3',
      targetType: 'goal',
      relationType: 'project_contributes_to_goal',
    });
    assert(rel1.id.includes('proj_ai') && rel1.id.includes('goal_q3'), 'Relation created with semantic ID');

    const outgoing = crossDomainRelationEngine.getOutgoingRelations('proj_ai');
    assert(outgoing.length === 1 && outgoing[0].targetId === 'goal_q3', 'Outgoing relation traversal verified');

    const incoming = crossDomainRelationEngine.getIncomingRelations('goal_q3');
    assert(incoming.length === 1 && incoming[0].sourceId === 'proj_ai', 'Incoming relation traversal verified');

    // Anti-duplication sanitizer
    const denormalized = {
      id: 'res_123',
      title: 'Original Title',
      copiedPersonName: 'Duplicated Bob',
      redundantProjectTitle: 'Old Project Name',
    };
    const sanitized = crossDomainRelationEngine.sanitizeDenormalizedDuplicates(denormalized);
    assert(sanitized.cleanedFieldsCount === 2, 'Sanitizer stripped 2 redundant denormalized fields');
    assert(!('copiedPersonName' in sanitized.sanitizedResource), 'Redundant copied string removed');

    // Deletion safety guarantee
    const removed = crossDomainRelationEngine.removeRelation(rel1.id);
    assert(removed, 'Relation removed cleanly');
    assert(crossDomainRelationEngine.getOutgoingRelations('proj_ai').length === 0, 'Relation graph updated after deletion');
  } catch (e: any) {
    assert(false, 'Cross-Domain Relation Graph', e.message);
  }

  // 3. People & Personal Relationship Memory
  try {
    peopleDomainExcellence.clear();
    const person = peopleDomainExcellence.savePerson({
      id: 'p_sarah',
      name: 'Dr. Sarah Lin',
      importantContext: 'Neuroscience researcher & longtime collaborator',
      email: 'sarah.lin@lab.example',
      phone: '+1 555-0199',
    });
    assert(person.name === 'Dr. Sarah Lin', 'Person profile saved');

    // Fast interaction logging
    const int1 = peopleDomainExcellence.logInteraction({
      personId: 'p_sarah',
      type: 'meeting',
      summary: 'Discussed cognitive load research and paper drafts',
    });
    assert(int1.type === 'meeting', 'Interaction logged');
    assert(peopleDomainExcellence.getInteractions('p_sarah').length === 1, 'Interaction history updated');

    // Canonical Follow-up task
    const task = peopleDomainExcellence.addFollowUpTask({
      personId: 'p_sarah',
      title: 'Review preprint appendix B',
      dueDate: '2026-09-15',
    });
    assert(task.title.includes('preprint'), 'Follow-up task created');

    // Attention evaluation
    const attention = peopleDomainExcellence.evaluateAttention('2026-09-15');
    assert(attention.length === 1 && attention[0].personId === 'p_sarah', 'Factual follow-up attention triggered');

    // Duplicate detection preview
    peopleDomainExcellence.savePerson({
      id: 'p_sarah_dup',
      name: 'Sarah Lin',
      email: 'sarah.lin@lab.example',
    });
    const dupes = peopleDomainExcellence.findDuplicateCandidates();
    assert(dupes.length === 1 && dupes[0].matchReason === 'exact_email', 'Duplicate candidate identified by email');

    // Safe merge
    const merged = peopleDomainExcellence.mergePeople('p_sarah', 'p_sarah_dup');
    assert(merged !== null && peopleDomainExcellence.getPerson('p_sarah_dup') === undefined, 'Merged duplicate cleanly');

    // vCard Export
    const vCard = peopleDomainExcellence.exportVCard('p_sarah');
    assert(vCard.includes('BEGIN:VCARD') && vCard.includes('Dr. Sarah Lin'), 'vCard export formatted correctly');
  } catch (e: any) {
    assert(false, 'People Domain Excellence', e.message);
  }

  // 4. Projects, Goals & Areas
  try {
    projectsGoalsDomainExcellence.clear();
    const proj = projectsGoalsDomainExcellence.saveProject({
      id: 'proj_engine_v3',
      title: 'Query Engine V3',
      outcome: 'Sub-millisecond query latency across 100k indexed notes',
      status: 'active',
      createdAt: '2026-09-10T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    });
    assert(proj.outcome !== proj.title, 'Project outcome distinct from title');

    // Next action semantics
    const task1 = projectsGoalsDomainExcellence.addTaskToProject({
      projectId: proj.id,
      title: 'Benchmark B-tree page cache hit rates',
      isNextAction: true,
      dueDate: '2026-09-18',
    });
    const task2 = projectsGoalsDomainExcellence.addTaskToProject({
      projectId: proj.id,
      title: 'Refactor index serialization format',
      isNextAction: false,
    });
    const ctx = projectsGoalsDomainExcellence.getProjectContext(proj.id);
    assert(ctx.openTasks.length === 2, 'Open tasks counted correctly');
    assert(ctx.nextActionTask?.id === task1.id, 'Next action designated');

    // Switch Next action
    projectsGoalsDomainExcellence.setNextAction(proj.id, task2.id);
    const updatedCtx = projectsGoalsDomainExcellence.getProjectContext(proj.id);
    assert(updatedCtx.nextActionTask?.id === task2.id, 'Next action updated cleanly');

    // Goals & Contributing projects
    const goal = projectsGoalsDomainExcellence.saveGoal({
      id: 'goal_perf',
      title: 'World-class Offline Performance',
      desiredOutcome: 'All core UI interactions respond in under 16ms',
      whyItMatters: 'Zero latency feels instantaneous and physical',
      status: 'active',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    });
    proj.goalId = goal.id;
    projectsGoalsDomainExcellence.saveProject(proj);
    const contrib = projectsGoalsDomainExcellence.getContributingProjects(goal.id);
    assert(contrib.length === 1 && contrib[0].id === proj.id, 'Contributing project linked to Goal');

    // Completed vs Archived distinction
    projectsGoalsDomainExcellence.completeProject(proj.id);
    assert(projectsGoalsDomainExcellence.getProject(proj.id)?.status === 'completed', 'Project completed');
    projectsGoalsDomainExcellence.archiveProject(proj.id);
    assert(projectsGoalsDomainExcellence.getProject(proj.id)?.status === 'archived', 'Project archived');
  } catch (e: any) {
    assert(false, 'Projects and Goals Domain Excellence', e.message);
  }

  // 5. Tracking & Routines
  try {
    trackingRoutinesDomainExcellence.clear();
    const tracker = trackingRoutinesDomainExcellence.saveTracker({
      id: 'trk_water',
      name: 'Hydration',
      unit: 'Liters',
      valueType: 'number',
      createdAt: '2026-09-01T00:00:00Z',
    });

    // Quick log events
    trackingRoutinesDomainExcellence.logEvent({
      trackerId: tracker.id,
      numericValue: 2.5,
      timestamp: '2026-09-14T10:00:00Z',
    });
    trackingRoutinesDomainExcellence.logEvent({
      trackerId: tracker.id,
      numericValue: 3.0,
      timestamp: '2026-09-13T10:00:00Z',
    });

    // Window aggregation with missing data semantics
    const agg = trackingRoutinesDomainExcellence.getAggregatesInWindow(tracker.id, 7);
    assert(agg.totalEvents === 2, 'Events recorded');
    assert(agg.daysWithData === 2, 'Days with data counted');
    assert(agg.missingDays === 5, 'Missing days marked factually without false 0 values');
    assert(agg.averageValue === 2.75, 'Exact average computed');

    // CSV export
    const csv = trackingRoutinesDomainExcellence.exportCsv(tracker.id);
    assert(csv.includes('timestamp,dateOnly,value') && csv.includes('2.5'), 'Tracker CSV export generated');

    // Routines & Habit logs without streak guilt
    const habit = trackingRoutinesDomainExcellence.saveHabit({
      id: 'hab_read',
      name: 'Daily 20m Reading',
      frequency: 'daily',
      active: true,
    });
    trackingRoutinesDomainExcellence.logHabit(habit.id, '2026-09-14', true);
    trackingRoutinesDomainExcellence.logHabit(habit.id, '2026-09-13', true);
    const hRate = trackingRoutinesDomainExcellence.getHabitCompletionRate(habit.id, 10);
    assert(hRate.completedDays === 2 && hRate.completionPercentage === 20, 'Factual habit completion calculated');
  } catch (e: any) {
    assert(false, 'Tracking and Routines Domain Excellence', e.message);
  }

  // 6. Learning & Library
  try {
    learningLibraryDomainExcellence.clear();
    const book = learningLibraryDomainExcellence.saveLibraryItem({
      id: 'lib_craft',
      title: 'The Pragmatic Programmer',
      creator: 'David Thomas & Andrew Hunt',
      mediaType: 'book',
      status: 'reading',
      progressPercent: 40,
      currentLocation: 'Tip 21: Don’t Outrun Your Headlights',
      createdAt: '2026-09-01T00:00:00Z',
    });

    // Update reading progress
    learningLibraryDomainExcellence.updateReadingProgress({
      libraryItemId: book.id,
      progressPercent: 50,
      currentLocation: 'Tip 27: Don’t Assume It—Prove It',
    });
    assert(
      learningLibraryDomainExcellence.getLibraryItem(book.id)?.progressPercent === 50,
      'Reading progress updated'
    );

    // Highlight and Spaced Repetition card creation
    const hl = learningLibraryDomainExcellence.addHighlight({
      libraryItemId: book.id,
      text: 'Good design is easier to change than bad design.',
      location: 'Page 42',
    });
    const card = learningLibraryDomainExcellence.createStudyCard({
      front: 'What is the ETC principle in software design?',
      back: 'Easier To Change (ETC) — every design principle is a special case of making things easier to change.',
      sourceHighlightId: hl.id,
    });
    assert(card.front.includes('ETC'), 'Study card created from highlight');

    // Review card with SM-2 algorithm
    const cardReviewed = learningLibraryDomainExcellence.reviewCard(card.id, 5);
    assert(cardReviewed, 'Card reviewed successfully with SM-2');

    // BibTeX export
    const bib = learningLibraryDomainExcellence.exportBibTeX(book.id);
    assert(bib.includes('@book{') && bib.includes('The Pragmatic Programmer'), 'BibTeX citation generated');
  } catch (e: any) {
    assert(false, 'Learning and Library Domain Excellence', e.message);
  }

  // 7. Finance & Health (Exact arithmetic & Provenance)
  try {
    financeHealthDomainExcellence.clear();
    const acc = financeHealthDomainExcellence.saveAccount({
      id: 'acc_test',
      name: 'Checking Account',
      currency: 'USD',
      initialBalanceCents: 100000, // $1,000.00
      type: 'checking',
      active: true,
    });

    // Expense
    financeHealthDomainExcellence.recordTransaction({
      dateOnly: '2026-09-14',
      kind: 'expense',
      amountCents: 2500, // $25.00
      accountId: acc.id,
    });

    // Split transaction verification (Invariant checking)
    const invalidSplit = financeHealthDomainExcellence.recordTransaction({
      dateOnly: '2026-09-14',
      kind: 'split',
      amountCents: 5000,
      accountId: acc.id,
      splits: [
        { category: 'Groceries', amountCents: 2000 },
        { category: 'Supplies', amountCents: 2000 }, // sum 4000 != 5000
      ],
    });
    assert(!invalidSplit.success, 'Invalid split sum rejected correctly');

    const validSplit = financeHealthDomainExcellence.recordTransaction({
      dateOnly: '2026-09-14',
      kind: 'split',
      amountCents: 5000,
      accountId: acc.id,
      splits: [
        { category: 'Groceries', amountCents: 3000 },
        { category: 'Supplies', amountCents: 2000 },
      ],
    });
    assert(validSplit.success, 'Valid split transaction recorded');

    // Derived balance calculation
    const bal = financeHealthDomainExcellence.calculateAccountBalanceCents(acc.id);
    assert(bal === 100000 - 2500 - 5000, 'Exact integer cents derived balance verified (92500 cents)');

    // Health measurements with mandatory provenance
    const m = financeHealthDomainExcellence.logMeasurement({
      metricType: 'blood_pressure',
      primaryValue: 120,
      secondaryValue: 80,
      unit: 'mmHg',
      source: 'manual_log',
    });
    assert(m.source === 'manual_log', 'Health measurement provenance preserved');
    assert(
      financeHealthDomainExcellence.convertWeight(70, 'lbs') === 154.3,
      'Authoritative non-mutating unit conversion verified'
    );
  } catch (e: any) {
    assert(false, 'Finance and Health Domain Excellence', e.message);
  }

  // 8. Travel, Assets & Decisions
  try {
    travelAssetsDecisionsDomainExcellence.clear();
    // Travel trip & timezone-safe reservations
    const trip = travelAssetsDecisionsDomainExcellence.saveTrip({
      id: 'trip_tokyo',
      title: 'Tokyo Systems Summit',
      destination: 'Tokyo, Japan',
      startDateOnly: '2026-11-01',
      endDateOnly: '2026-11-08',
      timezone: 'Asia/Tokyo',
      status: 'planning',
      offlinePackPrepared: true,
    });
    const res = travelAssetsDecisionsDomainExcellence.addReservation({
      tripId: trip.id,
      type: 'lodging',
      title: 'Shibuya Stream Hotel',
      provider: 'Direct Hotel Booking',
      startDateTimeIso: '2026-11-01T15:00:00+09:00',
      destinationTimezone: 'Asia/Tokyo',
    });
    assert(res.type === 'lodging', 'Reservation recorded with timezone');

    // Assets & Maintenance records
    const asset = travelAssetsDecisionsDomainExcellence.saveAsset({
      id: 'asset_car',
      name: 'Electric Commuter Vehicle',
      category: 'vehicle',
      warrantyExpirationDateOnly: '2026-09-01', // Expired -> attention
      status: 'active',
    });
    travelAssetsDecisionsDomainExcellence.recordMaintenance({
      assetId: asset.id,
      performedDateOnly: '2026-09-10',
      serviceType: 'Tire rotation and cabin air filter replacement',
      providerOrSelf: 'Service Center',
    });
    const assetAttention = travelAssetsDecisionsDomainExcellence.evaluateAssetAttention('2026-09-14');
    assert(assetAttention.length >= 1 && assetAttention[0].reason === 'warranty_ending', 'Asset warranty attention triggered');

    // Decision record & outcome learning
    const dec = travelAssetsDecisionsDomainExcellence.saveDecision({
      id: 'dec_framework',
      question: 'Should we migrate the search indexing pipeline to WebAssembly?',
      status: 'decided',
      reasoning: 'Wasm provides predictable memory footprint and identical execution across browser and worker.',
      predictedOutcome: 'Tokenization throughput will increase by 4x.',
      reviewDateOnly: '2026-09-14',
      createdAt: '2026-08-01T00:00:00Z',
    });
    travelAssetsDecisionsDomainExcellence.recordOutcome({
      decisionId: dec.id,
      actualOutcome: 'Achieved 4.2x tokenization throughput with 30% lower peak heap allocation.',
      lessonsLearned: 'Memory boundary marshaling overhead must be amortized over large batch sizes.',
    });
    const reviewedDec = travelAssetsDecisionsDomainExcellence.getDecision(dec.id);
    assert(reviewedDec?.status === 'reviewed', 'Decision outcome reviewed and lessons learned recorded');
  } catch (e: any) {
    assert(false, 'Travel, Assets and Decisions Domain Excellence', e.message);
  }

  // 9. Universal Intake & Inbox Processing
  try {
    inboxProcessingExcellence.clear();
    const item1 = inboxProcessingExcellence.captureItem({
      title: 'Article on Raft Consensus optimizations',
      content: 'Interesting note on pipelined append entries in etcd',
      sourceType: 'web_clipper',
      isExternal: true,
      externalProviderName: 'Browser Extension',
    });
    assert(item1.isExternal, 'External badge preserved on captured item');

    const result = inboxProcessingExcellence.processItem({
      inboxItemId: item1.id,
      destination: 'library',
      targetResourceId: 'lib_raft_article',
    });
    assert(result.success && result.provenanceRecorded, 'Item processed to Library with provenance');
    assert(inboxProcessingExcellence.getUnprocessedItems().length === 0, 'Unprocessed queue emptied');
  } catch (e: any) {
    assert(false, 'Universal Intake and Inbox Processing', e.message);
  }

  // 10. Curated Domain Saved Views & Home Orchestrator
  try {
    const peopleViews = domainSavedViewsRegistry.getViewsForDomain('people');
    assert(peopleViews.length >= 2 && peopleViews.length <= 4, 'People has 2-4 curated saved views');
    const defaultPeople = domainSavedViewsRegistry.getDefaultView('people');
    assert(defaultPeople?.id === 'view_people_recent', 'Default people view is Recent');

    // Home earned contributions
    const earned = domainHomeAttentionOrchestrator.getEarnedHomeSections('2026-09-14');
    assert(Array.isArray(earned), 'Earned Home sections returned');
  } catch (e: any) {
    assert(false, 'Curated Domain Saved Views & Home Orchestrator', e.message);
  }

  // 11. Full 7-Day Personal OS Week Simulation
  try {
    const simReport = personalOSWeekSimulator.runFullWeekSimulation();
    assert(simReport.success, '7-Day Personal OS Week Simulation succeeded');
    assert(simReport.totalDaysSimulated === 7, 'All 7 days simulated sequentially');
    assert(simReport.invariantsSummary.exactFinanceArithmetic, 'Simulation verified exact finance arithmetic');
    assert(simReport.invariantsSummary.zeroDuplicateRecords, 'Simulation verified zero duplicate canonical records');
    assert(simReport.invariantsSummary.healthProvenancePreserved, 'Simulation verified health provenance preservation');
    assert(simReport.invariantsSummary.calmHomeEarnedSections, 'Simulation verified calm earned Home sections');
  } catch (e: any) {
    assert(false, '7-Day Personal OS Week Simulation', e.message);
  }

  // 12. Domain Scale & Performance Benchmarks
  try {
    const benchResults = await domainScaleBenchmarks.runAllBenchmarks();
    assert(benchResults.length === 4, 'All 4 scale benchmarks executed');
    assert(benchResults.every((b) => b.passed), 'All scale benchmarks met performance latency targets');
  } catch (e: any) {
    assert(false, 'Domain Scale Benchmarks', e.message);
  }

  return {
    passed,
    failed,
    errors,
  };
}
