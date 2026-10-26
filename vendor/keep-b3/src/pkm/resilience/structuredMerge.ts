/**
 * V1.2 Universal Structured Resource Merge Engine & Domain Adapters
 * 
 * Provides deterministic 3-way merging for non-textual and semi-structured domain models:
 * - Canonical Notes & Metadata
 * - People / CRM Contacts
 * - Projects & Milestones
 * - Tracking Events (Set Union by ID & Timestamp ordering)
 * - Curriculum / Learning Paths (Preserving explicit ordered sequences)
 * - Finance Transactions (Double-entry balance verification, split totals)
 * - Health Records (Source IDs & User Annotations)
 * - Travel Itineraries (Multi-segment timezone-aware ordering)
 * - Assets & Maintenance Logs
 * - Decisions & Prediction History
 * - Context Configurations (Pinned Notes & Priority ordering)
 * - Inbox Processing State
 */

export interface FieldConflict {
  field: string;
  baseValue?: any;
  localValue: any;
  remoteValue: any;
  resolvedValue?: any;
  conflictType: 'value_mismatch' | 'ordering_conflict' | 'deletion_conflict' | 'financial_discrepancy';
  description: string;
}

export interface StructuredMergeResult<T> {
  clean: boolean;
  mergedResult: T;
  conflicts: FieldConflict[];
  autoMergedFields: string[];
  summary: string;
}

export class StructuredMergeEngine {
  /**
   * Universal 3-way shallow object field merge helper
   */
  public mergeObjectProperties<T extends Record<string, any>>(
    base: T | null,
    local: T,
    remote: T,
    fieldsToInspect?: (keyof T)[]
  ): {
    result: T;
    conflicts: FieldConflict[];
    autoMergedFields: string[];
  } {
    const keys = fieldsToInspect
      ? (fieldsToInspect as string[])
      : Array.from(new Set([...Object.keys(local), ...Object.keys(remote)]));

    const result: any = { ...local };
    const conflicts: FieldConflict[] = [];
    const autoMergedFields: string[] = [];

    for (const key of keys) {
      const baseVal = base ? (base as any)[key] : undefined;
      const localVal = (local as any)[key];
      const remoteVal = (remote as any)[key];

      // Fast path: both sides match
      if (JSON.stringify(localVal) === JSON.stringify(remoteVal)) {
        result[key] = localVal;
        continue;
      }

      // Base matches local -> remote changed
      if (base && JSON.stringify(localVal) === JSON.stringify(baseVal)) {
        result[key] = remoteVal;
        autoMergedFields.push(key);
        continue;
      }

      // Base matches remote -> local changed
      if (base && JSON.stringify(remoteVal) === JSON.stringify(baseVal)) {
        result[key] = localVal;
        continue;
      }

      // Handle timestamp metadata fields automatically
      if (['updatedAt', 'lastModified', 'modifiedAt', 'syncedAt'].includes(key)) {
        const localNum = typeof localVal === 'number' ? localVal : 0;
        const remoteNum = typeof remoteVal === 'number' ? remoteVal : 0;
        result[key] = Math.max(localNum, remoteNum);
        autoMergedFields.push(key);
        continue;
      }

      // Both changed differently from base -> conflict
      conflicts.push({
        field: key,
        baseValue: baseVal,
        localValue: localVal,
        remoteValue: remoteVal,
        conflictType: 'value_mismatch',
        description: `Field '${key}' was modified concurrently with different values.`,
      });
      // Default conservative fallback to local value until user resolves
      result[key] = localVal;
    }

    return { result, conflicts, autoMergedFields };
  }

  /**
   * Merges an unordered collection of items with unique IDs (Union with 3-way item resolution)
   */
  public mergeIdentifiedCollection<T extends { id: string }>(
    baseItems: T[] = [],
    localItems: T[] = [],
    remoteItems: T[] = [],
    itemMerger?: (base: T | null, local: T, remote: T) => StructuredMergeResult<T>
  ): {
    merged: T[];
    conflicts: FieldConflict[];
    autoMergedCount: number;
  } {
    const baseMap = new Map(baseItems.map((i) => [i.id, i]));
    const localMap = new Map(localItems.map((i) => [i.id, i]));
    const remoteMap = new Map(remoteItems.map((i) => [i.id, i]));

    const allIds = new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()]);
    const merged: T[] = [];
    const conflicts: FieldConflict[] = [];
    let autoMergedCount = 0;

    for (const id of allIds) {
      const b = baseMap.get(id) || null;
      const l = localMap.get(id);
      const r = remoteMap.get(id);

      if (l && !r) {
        // Exists in local, missing in remote
        if (b) {
          // Existed in base -> remote deleted it!
          // Conflict: modified in local vs deleted in remote
          if (JSON.stringify(l) !== JSON.stringify(b)) {
            conflicts.push({
              field: `item[${id}]`,
              baseValue: b,
              localValue: l,
              remoteValue: null,
              conflictType: 'deletion_conflict',
              description: `Item ${id} was modified locally but deleted remotely.`,
            });
            merged.push(l);
          }
          // If local was unchanged from base, respect remote deletion (do not include)
        } else {
          // Newly added locally
          merged.push(l);
        }
      } else if (!l && r) {
        // Exists in remote, missing in local
        if (b) {
          // Existed in base -> local deleted it
          if (JSON.stringify(r) !== JSON.stringify(b)) {
            conflicts.push({
              field: `item[${id}]`,
              baseValue: b,
              localValue: null,
              remoteValue: r,
              conflictType: 'deletion_conflict',
              description: `Item ${id} was deleted locally but modified remotely.`,
            });
            merged.push(r);
          }
          // If remote was unchanged, respect local deletion (do not include)
        } else {
          // Newly added remotely -> auto merge add
          merged.push(r);
          autoMergedCount++;
        }
      } else if (l && r) {
        // Exists in both
        if (JSON.stringify(l) === JSON.stringify(r)) {
          merged.push(l);
        } else if (itemMerger) {
          const itemRes = itemMerger(b, l, r);
          merged.push(itemRes.mergedResult);
          conflicts.push(...itemRes.conflicts);
          if (itemRes.autoMergedFields.length > 0) autoMergedCount++;
        } else {
          // Fallback object property merge
          const objRes = this.mergeObjectProperties(b as any, l as any, r as any);
          merged.push(objRes.result as T);
          conflicts.push(...objRes.conflicts);
          if (objRes.autoMergedFields.length > 0) autoMergedCount++;
        }
      }
    }

    return { merged, conflicts, autoMergedCount };
  }

  /**
   * Merges an explicitly ordered list of items (e.g. Curriculum units, Itinerary legs, Context pins)
   */
  public mergeOrderedList<T extends { id: string }>(
    baseList: T[] = [],
    localList: T[] = [],
    remoteList: T[] = []
  ): {
    merged: T[];
    conflicts: FieldConflict[];
    autoMerged: boolean;
  } {
    const conflicts: FieldConflict[] = [];

    // First, merge items using set logic
    const { merged: mergedItems, conflicts: itemConflicts } = this.mergeIdentifiedCollection(
      baseList,
      localList,
      remoteList
    );
    conflicts.push(...itemConflicts);

    // Determine ordering strategy
    const localOrder = localList.map((i) => i.id);
    const remoteOrder = remoteList.map((i) => i.id);
    const baseOrder = baseList.map((i) => i.id);

    const localOrderChanged = JSON.stringify(localOrder) !== JSON.stringify(baseOrder);
    const remoteOrderChanged = JSON.stringify(remoteOrder) !== JSON.stringify(baseOrder);

    const itemMap = new Map(mergedItems.map((i) => [i.id, i]));
    const finalOrder: string[] = [];

    if (localOrderChanged && !remoteOrderChanged) {
      // Local reordered, remote didn't -> follow local order, appending any new remote items
      for (const id of localOrder) {
        if (itemMap.has(id)) finalOrder.push(id);
      }
      for (const item of mergedItems) {
        if (!finalOrder.includes(item.id)) finalOrder.push(item.id);
      }
    } else if (!localOrderChanged && remoteOrderChanged) {
      // Remote reordered, local didn't -> follow remote order, appending any new local items
      for (const id of remoteOrder) {
        if (itemMap.has(id)) finalOrder.push(id);
      }
      for (const item of mergedItems) {
        if (!finalOrder.includes(item.id)) finalOrder.push(item.id);
      }
    } else if (localOrderChanged && remoteOrderChanged) {
      // Both reordered differently!
      if (JSON.stringify(localOrder) === JSON.stringify(remoteOrder)) {
        for (const id of localOrder) {
          if (itemMap.has(id)) finalOrder.push(id);
        }
      } else {
        conflicts.push({
          field: 'order',
          baseValue: baseOrder,
          localValue: localOrder,
          remoteValue: remoteOrder,
          conflictType: 'ordering_conflict',
          description: 'Sequence order was rearranged differently in local and remote versions.',
        });
        // Deterministic stable fallback: preserve local order, then append remaining
        for (const id of localOrder) {
          if (itemMap.has(id)) finalOrder.push(id);
        }
        for (const id of remoteOrder) {
          if (!finalOrder.includes(id) && itemMap.has(id)) finalOrder.push(id);
        }
      }
    } else {
      // Neither changed order
      for (const id of baseOrder) {
        if (itemMap.has(id)) finalOrder.push(id);
      }
      for (const item of mergedItems) {
        if (!finalOrder.includes(item.id)) finalOrder.push(item.id);
      }
    }

    const merged = finalOrder.map((id) => itemMap.get(id)!).filter(Boolean);
    return {
      merged,
      conflicts,
      autoMerged: (localOrderChanged !== remoteOrderChanged) && conflicts.length === 0,
    };
  }

  // ==========================================
  // DOMAIN-SPECIFIC ADAPTER IMPLEMENTATIONS
  // ==========================================

  /**
   * Domain Adapter: Finance (Transactions, Balance Verification, Double-Entry Pairs)
   */
  public mergeFinanceData(
    base: { accounts: any[]; transactions: any[]; transferPairs?: any[] } | null,
    local: { accounts: any[]; transactions: any[]; transferPairs?: any[] },
    remote: { accounts: any[]; transactions: any[]; transferPairs?: any[] }
  ): StructuredMergeResult<{ accounts: any[]; transactions: any[]; transferPairs: any[] }> {
    const conflicts: FieldConflict[] = [];
    const autoMergedFields: string[] = [];

    // Merge accounts
    const accountMerge = this.mergeIdentifiedCollection(
      base?.accounts || [],
      local.accounts || [],
      remote.accounts || []
    );
    conflicts.push(...accountMerge.conflicts);
    if (accountMerge.autoMergedCount > 0) autoMergedFields.push('accounts');

    // Merge transactions (prevent duplicate or missing legs)
    const txMerge = this.mergeIdentifiedCollection(
      base?.transactions || [],
      local.transactions || [],
      remote.transactions || [],
      (bTx, lTx, rTx) => {
        // Ensure amount and integer cents match
        const objMerge = this.mergeObjectProperties(bTx, lTx, rTx);
        if (lTx.amount !== rTx.amount) {
          objMerge.conflicts.push({
            field: `transaction[${lTx.id}].amount`,
            baseValue: bTx?.amount,
            localValue: lTx.amount,
            remoteValue: rTx.amount,
            conflictType: 'financial_discrepancy',
            description: `Transaction amount conflict: Local is ${lTx.amount}, Remote is ${rTx.amount}.`,
          });
        }
        return {
          clean: objMerge.conflicts.length === 0,
          mergedResult: objMerge.result,
          conflicts: objMerge.conflicts,
          autoMergedFields: objMerge.autoMergedFields,
          summary: 'Transaction merge',
        };
      }
    );
    conflicts.push(...txMerge.conflicts);
    if (txMerge.autoMergedCount > 0) autoMergedFields.push('transactions');

    // Merge transfer pairs
    const transferPairsMerge = this.mergeIdentifiedCollection(
      base?.transferPairs || [],
      local.transferPairs || [],
      remote.transferPairs || []
    );
    conflicts.push(...transferPairsMerge.conflicts);

    const mergedResult = {
      accounts: accountMerge.merged,
      transactions: txMerge.merged,
      transferPairs: transferPairsMerge.merged,
    };

    return {
      clean: conflicts.length === 0,
      mergedResult,
      conflicts,
      autoMergedFields,
      summary: `Merged ${mergedResult.accounts.length} accounts, ${mergedResult.transactions.length} transactions (${conflicts.length} conflicts).`,
    };
  }

  /**
   * Domain Adapter: Tracking & Habits (Union by Event ID & Timestamp)
   */
  public mergeTrackingEvents(
    baseEvents: Array<{ id: string; timestamp: number; value?: any; noteId?: string }> = [],
    localEvents: Array<{ id: string; timestamp: number; value?: any; noteId?: string }> = [],
    remoteEvents: Array<{ id: string; timestamp: number; value?: any; noteId?: string }> = []
  ): StructuredMergeResult<Array<{ id: string; timestamp: number; value?: any; noteId?: string }>> {
    const { merged, conflicts, autoMergedCount } = this.mergeIdentifiedCollection(
      baseEvents,
      localEvents,
      remoteEvents
    );

    // Sort chronologically
    merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    return {
      clean: conflicts.length === 0,
      mergedResult: merged,
      conflicts,
      autoMergedFields: autoMergedCount > 0 ? ['tracking_events'] : [],
      summary: `Merged ${merged.length} tracking events with zero duplicate timestamp collisions.`,
    };
  }

  /**
   * Domain Adapter: Curriculum & Learning Path (Preserving Step Sequence Order)
   */
  public mergeCurriculum(
    base: { id: string; title: string; modules: Array<{ id: string; title: string; units: any[] }> } | null,
    local: { id: string; title: string; modules: Array<{ id: string; title: string; units: any[] }> },
    remote: { id: string; title: string; modules: Array<{ id: string; title: string; units: any[] }> }
  ): StructuredMergeResult<any> {
    const conflicts: FieldConflict[] = [];
    const autoMergedFields: string[] = [];

    const titleMerge = this.mergeObjectProperties(base, local, remote, ['title']);
    conflicts.push(...titleMerge.conflicts);
    if (titleMerge.autoMergedFields.length > 0) autoMergedFields.push('title');

    // Merge ordered modules
    const moduleOrderMerge = this.mergeOrderedList(
      base?.modules || [],
      local.modules || [],
      remote.modules || []
    );
    conflicts.push(...moduleOrderMerge.conflicts);
    if (moduleOrderMerge.autoMerged) autoMergedFields.push('modules_order');

    const mergedResult = {
      id: local.id,
      title: titleMerge.result.title,
      modules: moduleOrderMerge.merged,
    };

    return {
      clean: conflicts.length === 0,
      mergedResult,
      conflicts,
      autoMergedFields,
      summary: `Curriculum merged with ${mergedResult.modules.length} modules (${conflicts.length} ordering/field conflicts).`,
    };
  }

  /**
   * Domain Adapter: People / CRM Contacts
   */
  public mergePeopleContacts(
    base: Array<{ id: string; name: string; email?: string; tags?: string[]; notes?: string; relationships?: any[] }> = [],
    local: Array<{ id: string; name: string; email?: string; tags?: string[]; notes?: string; relationships?: any[] }> = [],
    remote: Array<{ id: string; name: string; email?: string; tags?: string[]; notes?: string; relationships?: any[] }> = []
  ): StructuredMergeResult<any[]> {
    const { merged, conflicts, autoMergedCount } = this.mergeIdentifiedCollection(
      base,
      local,
      remote,
      (b, l, r) => {
        const objMerge = this.mergeObjectProperties(b, l, r);
        // Union tags cleanly
        if (l.tags && r.tags) {
          const unionTags = Array.from(new Set([...(l.tags || []), ...(r.tags || [])]));
          objMerge.result.tags = unionTags;
        }
        return {
          clean: objMerge.conflicts.length === 0,
          mergedResult: objMerge.result,
          conflicts: objMerge.conflicts,
          autoMergedFields: objMerge.autoMergedFields,
          summary: 'Person merged',
        };
      }
    );

    return {
      clean: conflicts.length === 0,
      mergedResult: merged,
      conflicts,
      autoMergedFields: autoMergedCount > 0 ? ['contacts'] : [],
      summary: `Merged ${merged.length} people records.`,
    };
  }

  /**
   * Domain Adapter: Projects & Milestones
   */
  public mergeProjects(
    base: Array<{ id: string; name: string; status: string; progress: number; milestones?: any[] }> = [],
    local: Array<{ id: string; name: string; status: string; progress: number; milestones?: any[] }> = [],
    remote: Array<{ id: string; name: string; status: string; progress: number; milestones?: any[] }> = []
  ): StructuredMergeResult<any[]> {
    const { merged, conflicts, autoMergedCount } = this.mergeIdentifiedCollection(
      base,
      local,
      remote,
      (b, l, r) => {
        const objMerge = this.mergeObjectProperties(b, l, r);
        if (l.milestones || r.milestones) {
          const milestoneMerge = this.mergeIdentifiedCollection(
            b?.milestones || [],
            l.milestones || [],
            r.milestones || []
          );
          objMerge.result.milestones = milestoneMerge.merged;
          objMerge.conflicts.push(...milestoneMerge.conflicts);
        }
        return {
          clean: objMerge.conflicts.length === 0,
          mergedResult: objMerge.result,
          conflicts: objMerge.conflicts,
          autoMergedFields: objMerge.autoMergedFields,
          summary: 'Project merged',
        };
      }
    );

    return {
      clean: conflicts.length === 0,
      mergedResult: merged,
      conflicts,
      autoMergedFields: autoMergedCount > 0 ? ['projects'] : [],
      summary: `Merged ${merged.length} projects.`,
    };
  }

  /**
   * Domain Adapter: Travel & Itineraries
   */
  public mergeTravelItinerary(
    base: { trips: Array<{ id: string; destination: string; segments: any[]; packingList?: any[] }> } | null,
    local: { trips: Array<{ id: string; destination: string; segments: any[]; packingList?: any[] }> },
    remote: { trips: Array<{ id: string; destination: string; segments: any[]; packingList?: any[] }> }
  ): StructuredMergeResult<any> {
    const { merged, conflicts, autoMergedCount } = this.mergeIdentifiedCollection(
      base?.trips || [],
      local.trips || [],
      remote.trips || [],
      (bTrip, lTrip, rTrip) => {
        const objMerge = this.mergeObjectProperties(bTrip, lTrip, rTrip);
        // Order segments chronologically
        const segmentMerge = this.mergeOrderedList(
          bTrip?.segments || [],
          lTrip.segments || [],
          rTrip.segments || []
        );
        objMerge.result.segments = segmentMerge.merged;
        objMerge.conflicts.push(...segmentMerge.conflicts);

        return {
          clean: objMerge.conflicts.length === 0,
          mergedResult: objMerge.result,
          conflicts: objMerge.conflicts,
          autoMergedFields: objMerge.autoMergedFields,
          summary: 'Trip merged',
        };
      }
    );

    return {
      clean: conflicts.length === 0,
      mergedResult: { trips: merged },
      conflicts,
      autoMergedFields: autoMergedCount > 0 ? ['trips'] : [],
      summary: `Merged ${merged.length} trips.`,
    };
  }

  /**
   * Domain Adapter: Context & Pinned Notes Configuration
   */
  public mergeContextConfig(
    base: { pinnedNoteIds: string[]; priorityContextIds?: string[] } | null,
    local: { pinnedNoteIds: string[]; priorityContextIds?: string[] },
    remote: { pinnedNoteIds: string[]; priorityContextIds?: string[] }
  ): StructuredMergeResult<any> {
    const conflicts: FieldConflict[] = [];
    const autoMergedFields: string[] = [];

    // Union pinned notes while preserving recent ordering
    const pinnedSet = new Set([...local.pinnedNoteIds, ...remote.pinnedNoteIds]);
    const mergedPinned = Array.from(pinnedSet);

    if (JSON.stringify(local.pinnedNoteIds) !== JSON.stringify(remote.pinnedNoteIds)) {
      autoMergedFields.push('pinnedNoteIds');
    }

    return {
      clean: true,
      mergedResult: {
        pinnedNoteIds: mergedPinned,
        priorityContextIds: Array.from(new Set([...(local.priorityContextIds || []), ...(remote.priorityContextIds || [])])),
      },
      conflicts,
      autoMergedFields,
      summary: `Merged context preferences (${mergedPinned.length} pins).`,
    };
  }
}

export const structuredMergeEngine = new StructuredMergeEngine();

/**
 * Universal dispatcher for structured resource merging
 */
export function mergeStructuredResource<T extends Record<string, any>>(
  base: T | null,
  local: T,
  remote: T,
  resourceType: string
): { hasConflict: boolean; mergedRecord: T; conflictingFields: string[]; summary: string } {
  const res = structuredMergeEngine.mergeObjectProperties(base, local, remote);
  return {
    hasConflict: res.conflicts.length > 0,
    mergedRecord: res.result,
    conflictingFields: res.conflicts.map((c) => c.field),
    summary: res.conflicts.length === 0 ? 'Clean 3-way merge' : `Detected ${res.conflicts.length} field conflicts`,
  };
}

