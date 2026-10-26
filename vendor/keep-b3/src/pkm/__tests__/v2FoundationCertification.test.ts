import { resourceRegistryV2 } from '../v2/core/resource/resourceRegistry';
import { connectionIndexV2 } from '../v2/core/connections/connectionIndex';
import { unifiedQueryEngineV2 } from '../v2/core/query/unifiedQueryEngine';
import { moduleRegistryV2 } from '../v2/core/modules/moduleRegistry';
import { actionSystemV2 } from '../v2/core/actions/actionSystem';
import { undoFoundationV2 } from '../v2/core/actions/undoFoundation';
import { v1ToV2MigrationEngine } from '../v2/migration/v1ToV2MigrationEngine';
import { v1CompatibilityBridge } from '../v2/compat/v1CompatibilityBridge';
import { v1PluginCompatService } from '../v2/compat/v1PluginCompat';

export async function runV2FoundationCertificationSuite(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${testName}`);
    }
  }

  try {
    // 1. Resource Registry & Capability Matrix Tests
    const noteDef = resourceRegistryV2.get('note');
    assert(!!noteDef, 'Resource Registry retrieves note definition');
    assert(noteDef?.capabilities.searchable === true, 'Note capability is searchable');
    assert(noteDef?.capabilities.linkable === true, 'Note capability is linkable');
    assert(noteDef?.capabilities.customFields === true, 'Note capability supports custom fields');

    const searchableTypes = resourceRegistryV2.getSearchableTypes();
    assert(searchableTypes.includes('note'), 'Searchable types list contains note');
    assert(searchableTypes.includes('task'), 'Searchable types list contains task');
    assert(searchableTypes.includes('person'), 'Searchable types list contains person');

    // 2. Unified Connection Index Tests
    connectionIndexV2.clear();
    connectionIndexV2.addEdge({
      id: 'edge_1',
      sourceId: 'note_a',
      sourceType: 'note',
      targetId: 'note_b',
      targetType: 'note',
      edgeType: 'wikilink',
      createdAt: Date.now(),
    });
    connectionIndexV2.addEdge({
      id: 'edge_2',
      sourceId: 'note_b',
      sourceType: 'note',
      targetId: 'note_c',
      targetType: 'note',
      edgeType: 'typed_relation',
      relationLabel: 'depends_on',
      createdAt: Date.now(),
    });

    const connsA = connectionIndexV2.getConnectionsFor('note_a', 'note');
    assert(connsA.outgoing.length === 1, 'Note A has 1 outgoing edge');
    assert(connsA.wikilinks.length === 1, 'Note A has 1 wikilink edge');

    const connsB = connectionIndexV2.getConnectionsFor('note_b', 'note');
    assert(connsB.backlinks.length === 1, 'Note B has 1 backlink incoming');
    assert(connsB.relations.length === 1, 'Note B has 1 relation edge');

    const neighborsA = connectionIndexV2.getNeighbors('note_a', 2);
    assert(neighborsA.has('note_b'), 'Neighbors of Note A includes Note B');
    assert(neighborsA.has('note_c'), '2-hop BFS Neighbors of Note A includes Note C');

    // 3. Unified Query Engine Tests
    const testItems = [
      { id: '1', type: 'note', title: 'Architecture V2 Plan', content: 'Design notes with #pkm and #v2', tags: ['pkm', 'v2'], archived: false },
      { id: '2', type: 'note', title: 'Shopping List', content: 'Apples and milk', tags: ['groceries'], archived: false },
      { id: '3', type: 'task', title: 'Ship V2 Foundation', content: 'Finish all tests with #v2', tags: ['v2'], archived: false },
      { id: '4', type: 'note', title: 'Old Archive Doc', content: 'Legacy system #pkm', tags: ['pkm'], archived: true },
    ];

    const ast = unifiedQueryEngineV2.parseLegacyQuery('#v2');
    const qRes = unifiedQueryEngineV2.execute(testItems, ast);
    assert(qRes.totalMatches === 2, 'Query for #v2 returns exactly 2 non-archived items');

    const astArchived = unifiedQueryEngineV2.parseLegacyQuery('#pkm');
    const qArchivedRes = unifiedQueryEngineV2.execute(testItems, astArchived, { includeArchived: true });
    assert(qArchivedRes.totalMatches === 2, 'Query for #pkm with includeArchived returns 2 items');

    // 4. Modular Product Architecture Tests
    const coreCount = moduleRegistryV2.getAll().filter((m) => m.manifest.isCore).length;
    assert(coreCount >= 5, 'At least 5 core modules registered');
    assert(moduleRegistryV2.isEnabled('core.notes') === true, 'Core notes module is always enabled');

    // Toggle domain module
    moduleRegistryV2.setEnabled('domain.finance', false);
    assert(moduleRegistryV2.isEnabled('domain.finance') === false, 'Domain finance module disabled');
    moduleRegistryV2.setEnabled('domain.finance', true);
    assert(moduleRegistryV2.isEnabled('domain.finance') === true, 'Domain finance module re-enabled');

    // 5. Action System & Undo Foundation Tests
    undoFoundationV2.clear();
    let stateVal = 'initial';

    actionSystemV2.register({
      id: 'test.update_state',
      label: 'Update State',
      category: 'edit',
      risk: 'safe',
      handler: (newVal: string) => {
        const old = stateVal;
        stateVal = newVal;
        return {
          success: true,
          actionId: 'test.update_state',
          data: stateVal,
          timestamp: Date.now(),
          undo: {
            description: `Revert state from ${newVal} to ${old}`,
            revert: () => {
              stateVal = old;
              return true;
            },
          },
        };
      },
    });

    await actionSystemV2.execute('test.update_state', 'updated_val');
    assert(stateVal === 'updated_val', 'Action updated state value');
    assert(undoFoundationV2.getHistory().length === 1, 'Undo entry pushed to stack');

    await undoFoundationV2.undoLatest();
    assert(stateVal === 'initial', 'Undo reverted state value back to initial');

    // 6. V1 Compatibility Bridge Tests
    const term = v1CompatibilityBridge.normalizeLegacyTerm('Smart View');
    assert(term === 'Saved View', 'Normalized legacy term Smart View to Saved View');

    const settings = v1CompatibilityBridge.normalizeLegacySettings({ smart_query_mode: 'advanced' });
    assert(settings.saved_view_filters === 'advanced', 'Normalized legacy smart_query_mode setting');

    const pluginCheck = v1PluginCompatService.checkCompatibility({
      id: 'valid-plugin',
      name: 'Valid Plugin',
      version: '1.0.0',
    });
    assert(pluginCheck.isCompatible === true, 'Plugin compatibility check passed for valid plugin');

    const dangerousPlugin = v1PluginCompatService.checkCompatibility({
      id: 'bad-plugin',
      name: 'Bad Plugin',
      version: '1.0.0',
      permissions: ['network:unrestricted'],
    });
    assert(dangerousPlugin.isCompatible === false, 'Dangerous plugin blocked by V2 security sandbox check');
  } catch (err: any) {
    failed++;
    errors.push(`V2 Certification Exception: ${err?.message || String(err)}`);
  }

  return { passed, failed, errors };
}
