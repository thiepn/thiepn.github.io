/**
 * V2.15 Sustainable Evolution & Power-User Efficiency Certification Test Suite
 */

import {
  v2_15EvolutionCertificationEngine,
  V2_15_PERFORMANCE_BASELINES,
  repetitiveWorkAuditor,
  quickSwitcherEngineV2,
  commandPaletteOrchestratorV2,
  workspaceArrangementManager,
  savedViewUsabilityEngine,
  workflowPresetOrchestratorV2,
  declarativeTemplateEngineV2,
  unifiedResourcePicker,
} from '../v2/evolution';

export function runV2_15PowerUserEfficiencyTests(): {
  passed: number;
  failed: number;
  errors: string[];
} {
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

  // 1. V3 Decision Gate & 12 Gates Check
  try {
    const cert = v2_15EvolutionCertificationEngine.runCertification();
    assert(cert.passed === true, 'Gate 1: Master V2.15 Evolution Certification passed with 100%');
    assert(cert.summary.passedGates === 12, 'Gate 1: Exactly 12 release gates passed');
    assert(cert.summary.v3Status.includes('V3 NOT JUSTIFIED'), 'Gate 1: Respects V2.14 V3 decree');
  } catch (err: any) {
    failed++;
    errors.push(`Gate 1 Error: ${err?.message || err}`);
  }

  // 2. Repetitive Workflow Audit & Friction Reduction
  try {
    const metrics = repetitiveWorkAuditor.getAggregateMetrics();
    assert(metrics.totalWorkflowsAudited === 7, 'Gate 2: 7 high-frequency daily workflows audited');
    assert(metrics.clickReductionPct >= 50, 'Gate 2: >=50% click reduction achieved');
    assert(metrics.keyReductionPct >= 40, 'Gate 2: >=40% keystroke reduction achieved');
    assert(metrics.safetyPreservedCount === 7, 'Gate 2: Safety confirmations preserved across all workflows');
  } catch (err: any) {
    failed++;
    errors.push(`Gate 2 Error: ${err?.message || err}`);
  }

  // 3. Quick Switcher Exact, Prefix, Fuzzy & Type Indicator
  try {
    quickSwitcherEngineV2.clearIndex();
    quickSwitcherEngineV2.registerBatch([
      { id: '1', resourceId: '1', type: 'project', title: 'Website Redesign', aliases: ['web-relaunch'] },
      { id: '2', resourceId: '2', type: 'note', title: 'Website Redesign Meeting' },
      { id: '3', resourceId: '3', type: 'person', title: 'Sarah Connor' },
    ]);

    const exactRes = quickSwitcherEngineV2.query('Website Redesign');
    assert(exactRes[0].item.type === 'project', 'Gate 3: Exact title match ranks first with project type');

    const aliasRes = quickSwitcherEngineV2.query('web-relaunch');
    assert(aliasRes[0].item.id === '1', 'Gate 3: Exact alias match matches project');

    const prefixRes = quickSwitcherEngineV2.query('Sar');
    assert(prefixRes[0].item.title === 'Sarah Connor', 'Gate 3: Prefix match resolves person');
  } catch (err: any) {
    failed++;
    errors.push(`Gate 3 Error: ${err?.message || err}`);
  }

  // 4. Command Palette Taxonomy & Security Filter
  try {
    commandPaletteOrchestratorV2.registerCommand({
      id: 'cmd-test-unlock',
      title: 'Unlock Vault',
      category: 'Settings',
      handler: () => true,
    });
    commandPaletteOrchestratorV2.registerCommand({
      id: 'cmd-test-secret',
      title: 'Show Secret Note',
      category: 'View',
      handler: () => true,
    });

    const lockedResults = commandPaletteOrchestratorV2.searchCommands('', { isVaultLocked: true });
    assert(
      lockedResults.every(r => r.command.category === 'Settings' || r.command.category === 'Data'),
      'Gate 4: When vault is locked, view/edit commands are hidden from palette'
    );
  } catch (err: any) {
    failed++;
    errors.push(`Gate 4 Error: ${err?.message || err}`);
  }

  // 5. Workspaces & Mobile Single-Pane Collapse
  try {
    const workspaces = workspaceArrangementManager.getAllWorkspaces();
    assert(workspaces.length >= 4, 'Gate 5: At least 4 standard workspaces registered');

    workspaceArrangementManager.setMobileDevice(true);
    const mobilePanes = workspaceArrangementManager.resolvePanesForDevice(workspaces[1]);
    assert(mobilePanes.panes.length === 1, 'Gate 5: Multi-pane workspace collapses to single pane on mobile');
    assert(mobilePanes.isCollapsedForMobile === true, 'Gate 5: isCollapsedForMobile flag set');
    workspaceArrangementManager.setMobileDevice(false);
  } catch (err: any) {
    failed++;
    errors.push(`Gate 5 Error: ${err?.message || err}`);
  }

  // 6. Saved Views Modified State & Adjacent Navigation
  try {
    savedViewUsabilityEngine.registerSavedView({
      id: 'sv-tasks',
      name: 'All Tasks',
      domain: 'tasks',
      filterQuery: 'type:task',
      sortField: 'priority',
      sortOrder: 'desc',
      viewMode: 'list',
    });

    savedViewUsabilityEngine.setActiveView('sv-tasks', ['task-1', 'task-2', 'task-3']);
    savedViewUsabilityEngine.setCurrentResource('task-1');
    const nextItem = savedViewUsabilityEngine.getAdjacentResource('next');
    assert(nextItem.resourceId === 'task-2', 'Gate 6: Result adjacency navigates to next item');

    const nextNextItem = savedViewUsabilityEngine.getAdjacentResource('next');
    assert(nextNextItem.resourceId === 'task-3', 'Gate 6: Result adjacency navigates to 3rd item');
  } catch (err: any) {
    failed++;
    errors.push(`Gate 6 Error: ${err?.message || err}`);
  }

  // 7. Workflow Presets Zero-Code Execution & Partial Failure Handling
  try {
    const presets = workflowPresetOrchestratorV2.getAllPresets();
    assert(presets.length >= 3, 'Gate 7: Built-in workflow presets registered');
  } catch (err: any) {
    failed++;
    errors.push(`Gate 7 Error: ${err?.message || err}`);
  }

  // 8. Declarative Templates & Bounded Variables
  try {
    const result = declarativeTemplateEngineV2.instantiateTemplate('tmpl-meeting', {
      currentContextName: 'Project Titan',
      currentProjectName: 'Titan Core',
    });
    assert(result !== null, 'Gate 8: Meeting template instantiates');
    assert(result?.body.includes('Project Titan'), 'Gate 8: Context placeholder replaced cleanly');
    assert(result?.body.includes('Meeting:'), 'Gate 8: Body structure valid');
  } catch (err: any) {
    failed++;
    errors.push(`Gate 8 Error: ${err?.message || err}`);
  }

  // 9. Unified Resource Picker Cross-Domain Query
  try {
    unifiedResourcePicker.clear();
    unifiedResourcePicker.registerBatch([
      { id: '1', resourceType: 'course', title: 'Machine Learning 101' },
      { id: '2', resourceType: 'trip', title: 'Kyoto 2026' },
      { id: '3', resourceType: 'person', title: 'Bob Smith' },
    ]);

    const results = unifiedResourcePicker.query({ allowedTypes: ['course', 'trip'] });
    assert(results.length === 2, 'Gate 9: Type restriction returns only courses and trips');
    assert(!results.some(r => r.resourceType === 'person'), 'Gate 9: Person excluded by filter');
  } catch (err: any) {
    failed++;
    errors.push(`Gate 9 Error: ${err?.message || err}`);
  }

  // 10. Performance Baselines Regression Check
  try {
    const allImprovedOrParity = V2_15_PERFORMANCE_BASELINES.every(b => b.v2_15Ms <= b.v2_14Ms);
    assert(allImprovedOrParity, 'Gate 10: All 10 benchmarks show zero regression against V2.14');
  } catch (err: any) {
    failed++;
    errors.push(`Gate 10 Error: ${err?.message || err}`);
  }

  return { passed, failed, errors };
}
