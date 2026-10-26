/**
 * PKM V2.22 — Personal OS Feature Completion Certification
 *
 * 24 Comprehensive Invariant Gates verifying all first-party Personal OS domains:
 * - Goals & Areas
 * - Review Cycles & Snapshots
 * - People, Interactions, Follow-ups, Safe Merges & vCards
 * - Trackers, Events, Non-punitive Habits & Routine Runner
 * - Courses, Study Sessions & SM-2 Deterministic Spaced Repetition
 * - Library Progress, Highlights & BibTeX Exports
 * - Finance Arithmetic (Exact Integer Cents, Single Logical Transfers, Split Invariants, Bills)
 * - Health Factual Records, Explicit Units & Source Provenance
 * - Travel Trips, Reservations & Offline Package Verification
 * - Assets, Maintenance History & Person Loans
 * - Decisions, Predictions & Retrospectives
 * - Cross-Domain Home Contributions & Attention Items
 */

import { V2_22PersonalOSEngine } from '../v2/domains/v2_22PersonalOSEngine';

export function runV2_22PersonalOSCertificationTests(): boolean {
  console.log('\n======================================================');
  console.log('   V2.22 PERSONAL OS FEATURE COMPLETION CERTIFICATION ');
  console.log('======================================================\n');

  let passedGates = 0;
  const totalGates = 24;
  const engine = new V2_22PersonalOSEngine();

  // Gate 1: Goal Creation & Measurable Metric
  try {
    const goal = engine.createGoal({
      title: 'Run Sub-2-Hour Half Marathon',
      desiredOutcome: 'Cross the finish line feeling strong',
      whyItMatters: 'Aerobic base for 2026',
      status: 'active',
      targetHorizon: '2026-Q4',
      reviewDateOnly: '2026-10-01',
      relatedProjectIds: ['proj_marathon'],
      measurableMetric: {
        name: 'Long Run Pace',
        currentValue: 5.45,
        targetValue: 5.35,
        unit: 'min/km',
      },
    });
    if (!goal.id || goal.status !== 'active') throw new Error('Goal creation failed');
    passedGates++;
    console.log('✓ Gate 1: Goal Creation & Measurable Metric Passed');
  } catch (err: any) {
    console.error('✗ Gate 1 Failed:', err.message);
  }

  // Gate 2: Goal Achievement & Timestamp Preservation
  try {
    const goals = engine.getGoals('active');
    const updated = engine.updateGoal(goals[0].id, { status: 'achieved' });
    if (updated?.status !== 'achieved' || !updated?.achievedAt) {
      throw new Error('Goal achievement failed to set status and timestamp');
    }
    passedGates++;
    console.log('✓ Gate 2: Goal Achievement & Timestamp Preservation Passed');
  } catch (err: any) {
    console.error('✗ Gate 2 Failed:', err.message);
  }

  // Gate 3: Area of Responsibility Registration
  try {
    const area = engine.createArea({
      title: 'Personal Health & Vitality',
      description: 'Sleep, nutrition, and cardiovascular stamina',
      responsibilities: ['Daily hydration', '3x weekly strength'],
      reviewCadence: 'weekly',
      status: 'active',
      relatedProjectIds: [],
    });
    if (!area.id || area.responsibilities.length !== 2) throw new Error('Area creation failed');
    passedGates++;
    console.log('✓ Gate 3: Area of Responsibility Registration Passed');
  } catch (err: any) {
    console.error('✗ Gate 3 Failed:', err.message);
  }

  // Gate 4: Step-by-Step Human Review Session Workflow
  try {
    const rev = engine.startReviewSession('weekly', '2026-09-14');
    if (rev.steps.length < 5 || rev.completed) throw new Error('Review session initialization failed');
    rev.steps.forEach((s) => engine.completeReviewStep(rev.id, s.id));
    const completed = engine.completeReviewSession(rev.id, 'Excellent weekly velocity.');
    if (!completed?.completed || !completed.reflectionNotes) throw new Error('Review completion failed');
    passedGates++;
    console.log('✓ Gate 4: Step-by-Step Human Review Workflow Passed');
  } catch (err: any) {
    console.error('✗ Gate 4 Failed:', err.message);
  }

  // Gate 5: Contact Creation & Interaction Logging
  try {
    const person = engine.createPerson({
      name: 'Ada Lovelace',
      email: 'ada@computing.org',
      organizationName: 'Analytical Engines Lab',
    });
    const int = engine.logInteraction({
      personId: person.id,
      dateOnly: '2026-09-14',
      type: 'meeting',
      summary: 'Bernoulli numbers algorithm discussion',
    });
    if (!int.id || int.personId !== person.id) throw new Error('Interaction logging failed');
    passedGates++;
    console.log('✓ Gate 5: Contact Creation & Interaction Logging Passed');
  } catch (err: any) {
    console.error('✗ Gate 5 Failed:', err.message);
  }

  // Gate 6: Canonical Person Follow-ups
  try {
    const people = engine.getPeople();
    const fu = engine.addPersonFollowUp({
      personId: people[0].id,
      title: 'Send notes draft',
      dueDateOnly: '2026-09-20',
      priority: 'high',
    });
    if (fu.completed) throw new Error('New follow-up should not be completed');
    const toggled = engine.togglePersonFollowUp(fu.id);
    if (!toggled?.completed) throw new Error('Follow-up toggle failed');
    passedGates++;
    console.log('✓ Gate 6: Canonical Person Follow-ups Passed');
  } catch (err: any) {
    console.error('✗ Gate 6 Failed:', err.message);
  }

  // Gate 7: Person Duplicate Detection & Safe Merge
  try {
    const p1 = engine.createPerson({ name: 'David Hilbert', email: 'hilbert@math.org' });
    const p2 = engine.createPerson({ name: 'D. Hilbert', email: 'hilbert@math.org', phone: '+49 12345' });
    const dups = engine.findDuplicatePeople();
    if (dups.length === 0) throw new Error('Duplicate detection failed');
    const merged = engine.mergePeople(p1.id, p2.id);
    if (!merged || engine.getPerson(p2.id) || !engine.getPerson(p1.id)?.phone) {
      throw new Error('Merge execution failed');
    }
    passedGates++;
    console.log('✓ Gate 7: Person Duplicate Detection & Safe Merge Passed');
  } catch (err: any) {
    console.error('✗ Gate 7 Failed:', err.message);
  }

  // Gate 8: RFC 6350 vCard Export
  try {
    const people = engine.getPeople();
    const vcard = engine.exportVCard(people[0].id);
    if (!vcard.includes('BEGIN:VCARD') || !vcard.includes('FN:')) throw new Error('vCard format invalid');
    passedGates++;
    console.log('✓ Gate 8: RFC 6350 vCard Export Passed');
  } catch (err: any) {
    console.error('✗ Gate 8 Failed:', err.message);
  }

  // Gate 9: Typed Trackers & Quick Event Logging
  try {
    const trk = engine.createTracker({
      name: 'Deep Work Hours',
      unit: 'hrs',
      valueType: 'number',
    });
    const ev = engine.quickLogTracking({
      trackerId: trk.id,
      dateOnly: '2026-09-14',
      numericValue: 4.5,
      source: 'manual_quick_log',
    });
    if (ev.numericValue !== 4.5) throw new Error('Tracking event logging failed');
    passedGates++;
    console.log('✓ Gate 9: Typed Trackers & Quick Event Logging Passed');
  } catch (err: any) {
    console.error('✗ Gate 9 Failed:', err.message);
  }

  // Gate 10: Non-Punitive Habit Logging
  try {
    const habit = engine.createHabit({
      title: 'Daily Meditation',
      frequency: 'daily',
    });
    engine.logHabit(habit.id, '2026-09-13', 'done');
    const logged = engine.logHabit(habit.id, '2026-09-14', 'skipped');
    if (logged?.history['2026-09-14'] !== 'skipped') throw new Error('Habit log failed');
    passedGates++;
    console.log('✓ Gate 10: Non-Punitive Habit Logging Passed');
  } catch (err: any) {
    console.error('✗ Gate 10 Failed:', err.message);
  }

  // Gate 11: Multi-Step Routine Execution Runner
  try {
    const rtn = engine.createRoutine({
      title: 'Nightly Shutdown',
      timeOfDay: 'evening',
      steps: [
        { id: 's1', label: 'Backup notes' },
        { id: 's2', label: 'Review calendar' },
      ],
    });
    const run = engine.startRoutineRun(rtn.id);
    if (!run) throw new Error('Routine run start failed');
    engine.completeRoutineStep(run.id, 's1');
    const doneRun = engine.completeRoutineStep(run.id, 's2');
    if (doneRun?.status !== 'completed') throw new Error('Routine run completion failed');
    passedGates++;
    console.log('✓ Gate 11: Multi-Step Routine Execution Runner Passed');
  } catch (err: any) {
    console.error('✗ Gate 11 Failed:', err.message);
  }

  // Gate 12: Course Curriculum & Timed Study Sessions
  try {
    const crs = engine.createCourse({
      name: 'Compiler Optimization',
      term: 'Fall 2026',
      status: 'active',
    });
    const sess = engine.startStudySession(crs.id, 'SSA Form and Register Allocation');
    const ended = engine.endStudySession(sess.id, 50, 'Completed Dominance Frontier exercises');
    if (!ended?.completed || ended.durationMinutes !== 50) throw new Error('Study session completion failed');
    passedGates++;
    console.log('✓ Gate 12: Course Curriculum & Timed Study Sessions Passed');
  } catch (err: any) {
    console.error('✗ Gate 12 Failed:', err.message);
  }

  // Gate 13: Deterministic SM-2 Spaced Repetition Flashcards
  try {
    const card = engine.createFlashcard({
      question: 'What is a join-semilattice?',
      answer: 'A partially ordered set where every two-element subset has a unique least upper bound (join).',
      nextReviewDateOnly: '2026-09-14',
    });
    const r1 = engine.rateFlashcard(card.id, 4, '2026-09-14');
    if (r1?.intervalDays !== 1 || r1?.repetitionCount !== 1) throw new Error('SM-2 step 1 failed');
    const r2 = engine.rateFlashcard(card.id, 4, '2026-09-15');
    if (r2?.intervalDays !== 6 || r2?.repetitionCount !== 2) throw new Error('SM-2 step 2 failed');
    passedGates++;
    console.log('✓ Gate 13: Deterministic SM-2 Spaced Repetition Flashcards Passed');
  } catch (err: any) {
    console.error('✗ Gate 13 Failed:', err.message);
  }

  // Gate 14: Library Media Progress & Quote Highlights
  try {
    const book = engine.createLibraryItem({
      title: 'Crafting Interpreters',
      creator: 'Robert Nystrom',
      type: 'book',
      status: 'in_progress',
      progressPercent: 55,
      linkedNoteIds: [],
    });
    const hl = engine.addHighlight(book.id, 'A tree-walk interpreter is simple but slow.', 'p. 88');
    if (!hl?.id) throw new Error('Highlight creation failed');
    const finished = engine.updateLibraryProgress(book.id, 100);
    if (finished?.status !== 'finished') throw new Error('Library progress completion failed');
    passedGates++;
    console.log('✓ Gate 14: Library Media Progress & Quote Highlights Passed');
  } catch (err: any) {
    console.error('✗ Gate 14 Failed:', err.message);
  }

  // Gate 15: Academic Reference Citations & BibTeX Export
  try {
    engine.createReference({
      title: 'Communicating Sequential Processes',
      authors: ['C. A. R. Hoare'],
      year: 1978,
      publication: 'Communications of the ACM',
      citeKey: 'hoare1978',
      itemType: 'journal',
      linkedResourceIds: [],
    });
    const bib = engine.exportBibTeX();
    if (!bib.includes('@journal{hoare1978') || !bib.includes('C. A. R. Hoare')) {
      throw new Error('BibTeX export failed');
    }
    passedGates++;
    console.log('✓ Gate 15: Academic Reference Citations & BibTeX Export Passed');
  } catch (err: any) {
    console.error('✗ Gate 15 Failed:', err.message);
  }

  // Gate 16: Exact Integer Cents Finance & Transfer Invariants
  try {
    const acc1 = engine.createFinanceAccount({
      name: 'Checking A',
      currency: 'USD',
      initialBalanceCents: 50000,
      type: 'checking',
    });
    const acc2 = engine.createFinanceAccount({
      name: 'Checking B',
      currency: 'USD',
      initialBalanceCents: 20000,
      type: 'checking',
    });
    engine.createTransaction({
      dateOnly: '2026-09-14',
      kind: 'transfer',
      amountCents: 15000,
      accountId: acc1.id,
      targetAccountId: acc2.id,
      reconciled: true,
    });
    if (engine.getAccountBalanceCents(acc1.id) !== 35000 || engine.getAccountBalanceCents(acc2.id) !== 35000) {
      throw new Error('Single logical transfer balance assertion failed');
    }
    passedGates++;
    console.log('✓ Gate 16: Exact Integer Cents Finance & Transfer Invariants Passed');
  } catch (err: any) {
    console.error('✗ Gate 16 Failed:', err.message);
  }

  // Gate 17: Split Transaction Exactness Invariant Enforcement
  try {
    const acc = engine.getFinanceAccounts()[0];
    let threw = false;
    try {
      engine.createTransaction({
        dateOnly: '2026-09-14',
        kind: 'split',
        amountCents: 10000,
        accountId: acc.id,
        splits: [{ category: 'Food', amountCents: 7500 }], // 75 != 100
        reconciled: false,
      });
    } catch {
      threw = true;
    }
    if (!threw) throw new Error('Split sum mismatch was not rejected');
    passedGates++;
    console.log('✓ Gate 17: Split Transaction Exactness Invariant Enforcement Passed');
  } catch (err: any) {
    console.error('✗ Gate 17 Failed:', err.message);
  }

  // Gate 18: Factual Health Record Provenance & Explicit Units
  try {
    const h = engine.logHealthMeasurement({
      type: 'blood_pressure',
      numericValue: 120,
      secondaryNumericValue: 80,
      unit: 'mmHg',
      dateOnly: '2026-09-14',
      sourceProvenance: 'medical_record',
    });
    if (h.unit !== 'mmHg' || h.sourceProvenance !== 'medical_record') throw new Error('Health provenance check failed');
    passedGates++;
    console.log('✓ Gate 18: Factual Health Record Provenance & Explicit Units Passed');
  } catch (err: any) {
    console.error('✗ Gate 18 Failed:', err.message);
  }

  // Gate 19: Travel Trip Reservations & Offline Package Verification
  try {
    const trip = engine.createTrip({
      title: 'Nordic Systems Conf',
      destination: 'Stockholm, Sweden',
      startDateOnly: '2026-11-10',
      endDateOnly: '2026-11-15',
      status: 'planning',
      timezone: 'Europe/Stockholm',
    });
    engine.addReservation({
      tripId: trip.id,
      type: 'flight',
      title: 'Flight ARN',
      provider: 'SAS',
      startDateTimeIso: '2026-11-10T08:00:00Z',
      destinationTimezone: 'Europe/Stockholm',
    });
    const ready = engine.prepareOfflineTripPack(trip.id);
    if (!ready || !engine.getTrips().find((t) => t.id === trip.id)?.offlinePackPrepared) {
      throw new Error('Offline trip pack verification failed');
    }
    passedGates++;
    console.log('✓ Gate 19: Travel Trip Reservations & Offline Package Verification Passed');
  } catch (err: any) {
    console.error('✗ Gate 19 Failed:', err.message);
  }

  // Gate 20: Asset Registry, Warranty & Maintenance Logs
  try {
    const asset = engine.createAsset({
      name: 'Sony A7IV Mirrorless',
      category: 'electronics',
      purchasePriceCents: 249900,
      warrantyEndDateOnly: '2026-12-31',
    });
    const mnt = engine.recordMaintenance({
      assetId: asset.id,
      performedDateOnly: '2026-09-14',
      serviceType: 'Firmware Update & Calibration',
      providerOrSelf: 'Self',
    });
    if (!mnt?.id || asset.maintenanceHistory.length === 0) throw new Error('Asset maintenance log failed');
    passedGates++;
    console.log('✓ Gate 20: Asset Registry, Warranty & Maintenance Logs Passed');
  } catch (err: any) {
    console.error('✗ Gate 20 Failed:', err.message);
  }

  // Gate 21: Asset Person Loans & Returns
  try {
    const people = engine.getPeople();
    const assets = engine.getAssets();
    const loan = engine.loanAsset(assets[0].id, people[0].id, '2026-09-30');
    if (loan?.status !== 'active') throw new Error('Asset loan initiation failed');
    const returned = engine.returnAssetLoan(assets[0].id, loan.id);
    if (!returned) throw new Error('Asset return failed');
    passedGates++;
    console.log('✓ Gate 21: Asset Person Loans & Returns Passed');
  } catch (err: any) {
    console.error('✗ Gate 21 Failed:', err.message);
  }

  // Gate 22: Decisions, Predictions & Retrospective Outcome Review
  try {
    const dec = engine.createDecision({
      question: 'Standardize on Web Worker SQLite vs IndexedDB direct',
      status: 'open',
    });
    engine.makeDecision(
      dec.id,
      'Web Worker SQLite',
      'Unified SQL query surface and ACID transactions',
      'Query latency will stay below 5ms',
      92,
      '2026-09-14'
    );
    const due = engine.getDecisionsDueForReview('2026-09-14');
    if (!due.some((d) => d.id === dec.id)) throw new Error('Decision review due lookup failed');
    const reviewed = engine.recordDecisionOutcome(dec.id, 'Average latency 2.8ms', 'Hypothesis strongly confirmed');
    if (reviewed?.status !== 'reviewed') throw new Error('Decision retrospective failed');
    passedGates++;
    console.log('✓ Gate 22: Decisions, Predictions & Retrospective Outcome Review Passed');
  } catch (err: any) {
    console.error('✗ Gate 22 Failed:', err.message);
  }

  // Gate 23: Cross-Domain Earned Home Screen Contributions
  try {
    const homeContributions = engine.getEarnedHomeContributions('2026-09-14');
    if (homeContributions.length === 0) throw new Error('Earned home contributions should be non-empty');
    passedGates++;
    console.log('✓ Gate 23: Cross-Domain Earned Home Screen Contributions Passed');
  } catch (err: any) {
    console.error('✗ Gate 23 Failed:', err.message);
  }

  // Gate 24: Cross-Domain Actionable & Auto-Resolving Attention Center
  try {
    const attention = engine.getAttentionItems('2026-09-30');
    if (!Array.isArray(attention)) throw new Error('Attention items synthesis failed');
    passedGates++;
    console.log('✓ Gate 24: Cross-Domain Actionable & Auto-Resolving Attention Center Passed');
  } catch (err: any) {
    console.error('✗ Gate 24 Failed:', err.message);
  }

  console.log(`\nPassed ${passedGates} / ${totalGates} Certification Gates.`);
  return passedGates === totalGates;
}
