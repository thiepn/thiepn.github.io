import { ResourceCore } from '../core/resource/resourceCore';
import { UnifiedQueryAST } from '../core/query/queryTypes';
import { unifiedQueryEngineV2 } from '../core/query/unifiedQueryEngine';
import { connectionIndexV2 } from '../core/connections/connectionIndex';

export interface BenchmarkResult {
  suiteName: string;
  itemCount: number;
  executionTimeMs: number;
  throughputOpsPerSec: number;
  matchesFound: number;
  passed: boolean;
  targetMs: number;
}

export class V2_2PerformanceBenchmarkRunner {
  private generateSyntheticDataset(count: number): ResourceCore[] {
    const types: any[] = ['task', 'note', 'project', 'book', 'person', 'asset', 'decision', 'transaction'];
    const statuses = ['todo', 'in_progress', 'done', 'active', 'completed', 'reading'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const tagsList = ['work', 'personal', 'urgent', 'health', 'finance', 'reading', 'travel'];

    const items: ResourceCore[] = new Array(count);
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const status = statuses[i % statuses.length];
      const priority = priorities[i % priorities.length];
      const tag1 = tagsList[i % tagsList.length];
      const tag2 = tagsList[(i + 3) % tagsList.length];
      const dueDaysOffset = (i % 60) - 30; // -30 to +30 days
      const dueDate = new Date(now + dueDaysOffset * 86400000).toISOString().split('T')[0];

      items[i] = {
        id: `synthetic_res_${i}`,
        type,
        title: `Resource Item #${i} ${tag1} target`,
        tags: [tag1, tag2],
        metadata: {
          content: `Detailed notes and body text for resource ${i} with references to ${tag2}`,
          priority,
          status,
          dueDate,
        },
        archived: i % 50 === 0,
        trashed: false,
        pinned: i % 20 === 0,
        createdAt: now - (count - i) * 1000,
        updatedAt: now - (count - i) * 500,
      };
    }

    return items;
  }

  public runAllBenchmarks(): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];

    // Dataset A: 10,000 resources
    const set10k = this.generateSyntheticDataset(10000);

    // Dataset B: 100,000 resources
    const set100k = this.generateSyntheticDataset(100000);

    // 1. Simple Indexed Filter (10k items)
    {
      const start = performance.now();
      const query: UnifiedQueryAST = {
        version: 2,
        resourceTypes: ['task'],
        filter: {
          conjunction: 'AND',
          criteria: [{ field: 'status', operator: 'equals', value: 'todo' }],
        },
      };
      const res = unifiedQueryEngineV2.execute(set10k, query, { bypassCache: true });
      const duration = performance.now() - start;
      results.push({
        suiteName: '1. Simple Indexed Filter (10k items)',
        itemCount: 10000,
        executionTimeMs: Number(duration.toFixed(2)),
        throughputOpsPerSec: Math.round(10000 / (duration / 1000)),
        matchesFound: res.totalMatches,
        passed: duration < 50,
        targetMs: 50,
      });
    }

    // 2. 3-Filter Compound Query with AND/OR (100k items)
    {
      const start = performance.now();
      const query: UnifiedQueryAST = {
        version: 2,
        resourceTypes: ['task', 'project'],
        filter: {
          conjunction: 'AND',
          criteria: [
            {
              field: 'priority',
              operator: 'in',
              value: ['high', 'urgent'],
            },
            {
              conjunction: 'OR',
              criteria: [
                { field: 'dueDate', operator: 'is_this_week' },
                { field: 'has_tag', operator: 'has_tag', value: 'urgent' },
              ],
            },
          ],
        },
        sort: [{ field: 'dueDate', direction: 'asc' }],
      };
      const res = unifiedQueryEngineV2.execute(set100k, query, { bypassCache: true });
      const duration = performance.now() - start;
      results.push({
        suiteName: '2. 3-Filter Compound Query (100k items)',
        itemCount: 100000,
        executionTimeMs: Number(duration.toFixed(2)),
        throughputOpsPerSec: Math.round(100000 / (duration / 1000)),
        matchesFound: res.totalMatches,
        passed: duration < 250,
        targetMs: 250,
      });
    }

    // 3. Multi-Sort & Grouping Query (100k items)
    {
      const start = performance.now();
      const query: UnifiedQueryAST = {
        version: 2,
        group: { field: 'status' },
        sort: [
          { field: 'priority', direction: 'desc' },
          { field: 'updatedAt', direction: 'desc' },
        ],
      };
      const res = unifiedQueryEngineV2.execute(set100k, query, { bypassCache: true });
      const duration = performance.now() - start;
      results.push({
        suiteName: '3. Multi-Sort & Grouping (100k items)',
        itemCount: 100000,
        executionTimeMs: Number(duration.toFixed(2)),
        throughputOpsPerSec: Math.round(100000 / (duration / 1000)),
        matchesFound: res.totalMatches,
        passed: duration < 300,
        targetMs: 300,
      });
    }

    // 4. Saved View Opening Latency (Cached vs Fresh)
    {
      const query: UnifiedQueryAST = {
        version: 2,
        resourceTypes: ['book'],
        filter: {
          conjunction: 'AND',
          criteria: [{ field: 'status', operator: 'equals', value: 'reading' }],
        },
      };
      // Warm cache
      unifiedQueryEngineV2.execute(set10k, query);
      const start = performance.now();
      const res = unifiedQueryEngineV2.execute(set10k, query);
      const duration = performance.now() - start;
      results.push({
        suiteName: '4. Cached Saved View Opening Latency',
        itemCount: 10000,
        executionTimeMs: Number(duration.toFixed(2)),
        throughputOpsPerSec: Math.round(10000 / (Math.max(duration, 0.01) / 1000)),
        matchesFound: res.totalMatches,
        passed: duration < 5,
        targetMs: 5,
      });
    }

    // 5. Connection Graph Relation Filter
    {
      connectionIndexV2.addRelation('synthetic_res_10', 'task', 'synthetic_res_20', 'project', 'belongs_to');
      connectionIndexV2.addRelation('synthetic_res_15', 'task', 'synthetic_res_20', 'project', 'belongs_to');

      const start = performance.now();
      const query: UnifiedQueryAST = {
        version: 2,
        filter: {
          conjunction: 'AND',
          criteria: [
            { field: 'project', operator: 'is_related_to', value: 'synthetic_res_20' },
          ],
        },
      };
      const res = unifiedQueryEngineV2.execute(set10k, query, { bypassCache: true });
      const duration = performance.now() - start;
      results.push({
        suiteName: '5. Connection Graph Relation Filter (10k items)',
        itemCount: 10000,
        executionTimeMs: Number(duration.toFixed(2)),
        throughputOpsPerSec: Math.round(10000 / (duration / 1000)),
        matchesFound: res.totalMatches,
        passed: duration < 30,
        targetMs: 30,
      });
    }

    return results;
  }
}

export const v2_2BenchmarkRunner = new V2_2PerformanceBenchmarkRunner();
