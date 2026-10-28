/**
 * Phase P36: Local Automation, Rules & Recurring Workflow Engine
 * Central Orchestrator & Rule Execution Engine
 */

import { Note, Folder, AppSettings } from '../../types';
import {
  AutomationRule,
  AutomationAction,
  CanonicalDomainEvent,
  AutomationLogEntry,
  ActionResultItem,
  AutomationSuggestion,
  DryRunResult,
  AutomationExecutionContext,
  ExecutionChain,
  MAX_EXECUTION_DEPTH,
  AUTOMATION_SCHEMA_VERSION,
  DEFAULT_BULK_IMPACT_LIMIT,
  EditorSmartSuggestionsResult,
  EditorSmartTagSuggestion,
  EditorSmartRelatedNoteSuggestion,
  EditorSmartRuleSuggestion,
} from './automationTypes';
import { automationStorageService } from './automationStorageService';
import { evaluateConditionGroup } from './conditionEvaluator';
import { interpolateVariables } from './variableInterpolator';
import { formatLocalDateOnly } from '../temporal/dateUtils';
import { generateRuleSummary } from './ruleSummaryGenerator';
import { schedulerEngine } from './schedulerEngine';
import { setPropertyInContent, removePropertyFromContent, parseFrontmatterAST } from '../properties/frontmatterEngine';
import { toggleTaskInNote } from '../tasks/taskMutator';
import { extractTasksFromNote } from '../tasks/taskParser';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';
import { BUILTIN_RECIPES } from './recipes';
import { suggestTagsForNote } from '../intelligence/tagRecommender';
import { tokenizeText } from '../lexicalRelatedness';

export type AutomationEventListener = () => void;
export type SuggestionEventListener = (suggestions: AutomationSuggestion[]) => void;

class AutomationEngine {
  private rules: AutomationRule[] = [];
  private isInitialized = false;
  private paused = false;
  private executionContext: AutomationExecutionContext | null = null;
  private listeners: Set<AutomationEventListener> = new Set();
  private suggestionListeners: Set<SuggestionEventListener> = new Set();
  private pendingSuggestions: AutomationSuggestion[] = [];

  /**
   * Initializes the engine and loads saved rules
   */
  public async initialize(context?: AutomationExecutionContext): Promise<void> {
    if (context) {
      this.executionContext = context;
    }

    try {
      this.paused = await automationStorageService.isPaused();
      let loadedRules = await automationStorageService.loadRules();

      // If empty, install initial default recipe rules
      if (!loadedRules || loadedRules.length === 0) {
        loadedRules = BUILTIN_RECIPES.map((recipe) => ({
          ...recipe.rule,
          id: `rule-${recipe.id}`,
          schemaVersion: AUTOMATION_SCHEMA_VERSION,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));
        await automationStorageService.saveAllRules(loadedRules);
      }

      this.rules = loadedRules;
      this.pendingSuggestions = await automationStorageService.loadSuggestions();

      // Hook scheduler execution
      schedulerEngine.setExecutionCallback(async (rule, occurrenceKey, scheduledTime) => {
        return this.executeScheduledRule(rule, occurrenceKey, scheduledTime);
      });

      schedulerEngine.start();
      this.isInitialized = true;
      this.notifyListeners();
    } catch (err) {
      console.error('[AutomationEngine] Failed to initialize:', err);
    }
  }

  public setExecutionContext(context: AutomationExecutionContext) {
    this.executionContext = context;
  }

  public getExecutionContext(): AutomationExecutionContext | null {
    return this.executionContext;
  }

  public subscribe(listener: AutomationEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeSuggestions(listener: SuggestionEventListener): () => void {
    this.suggestionListeners.add(listener);
    listener(this.pendingSuggestions);
    return () => this.suggestionListeners.delete(listener);
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {}
    }
  }

  private notifySuggestionListeners() {
    for (const listener of this.suggestionListeners) {
      try {
        listener([...this.pendingSuggestions]);
      } catch (e) {}
    }
  }

  // --- Suggestions ---

  public getSuggestions(): AutomationSuggestion[] {
    return [...this.pendingSuggestions];
  }

  public async applySuggestion(suggestionId: string): Promise<boolean> {
    const suggestionIndex = this.pendingSuggestions.findIndex((s) => s.id === suggestionId);
    if (suggestionIndex === -1) return false;
    const suggestion = this.pendingSuggestions[suggestionIndex];

    const chain: ExecutionChain = {
      id: `chain-sugg-${Date.now()}`,
      depth: 0,
      visitedRuleIds: new Set([suggestion.ruleId]),
      originatingRuleId: suggestion.ruleId,
    };

    await this.executeActionList(
      suggestion.actions,
      suggestion.contextEvent,
      suggestion.ruleName,
      suggestion.ruleId,
      chain
    );

    this.pendingSuggestions.splice(suggestionIndex, 1);
    await automationStorageService.dismissSuggestion(suggestionId);
    this.notifySuggestionListeners();
    this.notifyListeners();
    return true;
  }

  public async dismissSuggestion(suggestionId: string): Promise<void> {
    this.pendingSuggestions = this.pendingSuggestions.filter((s) => s.id !== suggestionId);
    await automationStorageService.dismissSuggestion(suggestionId);
    this.notifySuggestionListeners();
    this.notifyListeners();
  }

  public async dismissAllSuggestions(): Promise<void> {
    this.pendingSuggestions = [];
    await automationStorageService.clearSuggestions();
    this.notifySuggestionListeners();
    this.notifyListeners();
  }

  /**
   * Generates real-time contextual smart suggestions (tags, related notes, and matching automation rules)
   * for the note editor as the user types.
   */
  public getSmartEditorSuggestions(params: {
    noteId?: string;
    title: string;
    content: string;
    currentTags?: string[];
    allNotes: Note[];
    folders?: Folder[];
  }): EditorSmartSuggestionsResult {
    const {
      noteId,
      title = '',
      content = '',
      currentTags = [],
      allNotes = [],
      folders = [],
    } = params;

    const normalizedCurrentTags = new Set(
      currentTags.map((t) => t.toLowerCase().replace(/^#/, ''))
    );

    // 1. Evaluate Active Automation Rules for Content & Update Triggers
    const matchingRuleSuggestions: EditorSmartRuleSuggestion[] = [];
    const ruleSuggestedTags = new Map<string, { ruleName: string; confidence: number }>();

    // Synthesize dummy note object for condition evaluation
    const nowIso = new Date().toISOString();
    const syntheticNote: Note = {
      id: noteId || 'temp-draft',
      title: title || '',
      content: content || '',
      type: 'text',
      checklist: [],
      images: [],
      color: 'default',
      tags: currentTags,
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      reminderDate: null,
    };

    const simulatedEvent: CanonicalDomainEvent = {
      id: `sim-evt-${Date.now()}`,
      type: 'note_updated',
      timestamp: Date.now(),
      origin: 'user-action',
      noteId: syntheticNote.id,
      note: syntheticNote,
      folderId: syntheticNote.folderId,
    };

    for (const rule of this.rules) {
      if (!rule.enabled || rule.status !== 'active') continue;

      if (rule.trigger.type === 'note_updated' || rule.trigger.type === 'note_created') {
        const condResult = evaluateConditionGroup(rule.conditions, rule.conditionGroup, {
          note: syntheticNote,
          folders,
          event: simulatedEvent,
        });

        if (condResult.passed) {
          // If the rule has add_tag actions, extract suggested tags
          for (const act of rule.actions) {
            if (act.type === 'add_tag' && act.tag) {
              const clean = act.tag.toLowerCase().replace(/^#/, '');
              if (clean && !normalizedCurrentTags.has(clean)) {
                ruleSuggestedTags.set(clean, {
                  ruleName: rule.name,
                  confidence: 0.95,
                });
              }
            }
          }

          if (rule.actions.length > 0) {
            matchingRuleSuggestions.push({
              id: `rule-sugg-${rule.id}`,
              ruleId: rule.id,
              ruleName: rule.name,
              title: rule.name,
              description: generateRuleSummary(rule, folders),
              actions: rule.actions,
            });
          }
        }
      }
    }

    // 2. Intelligent Tag Suggestions
    const suggestedTags: EditorSmartTagSuggestion[] = [];

    // Add rule-based tags first
    for (const [tag, info] of ruleSuggestedTags.entries()) {
      suggestedTags.push({
        tag,
        source: 'rule',
        ruleName: info.ruleName,
        confidence: info.confidence,
      });
    }

    // Extract hashtags typed directly in content that aren't yet in note.tags
    const hashtagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g;
    let match;
    const foundInContent = new Set<string>();
    while ((match = hashtagRegex.exec(content)) !== null) {
      const rawTag = match[1].toLowerCase();
      if (rawTag && !normalizedCurrentTags.has(rawTag) && !ruleSuggestedTags.has(rawTag) && !foundInContent.has(rawTag)) {
        foundInContent.add(rawTag);
        suggestedTags.push({
          tag: rawTag,
          source: 'content',
          confidence: 0.9,
        });
      }
    }

    // Recommend tags based on co-occurrence and text matching across the vault
    try {
      const coOccurTags = suggestTagsForNote(syntheticNote, allNotes, undefined, {
        limit: 5,
        minScore: 0.2,
      });
      for (const st of coOccurTags) {
        const clean = st.tag.toLowerCase().replace(/^#/, '');
        if (!normalizedCurrentTags.has(clean) && !ruleSuggestedTags.has(clean) && !foundInContent.has(clean)) {
          suggestedTags.push({
            tag: clean,
            source: 'co-occurrence',
            confidence: Math.min(0.85, st.score),
          });
        }
      }
    } catch (e) {
      // Fallback gracefully
    }

    // 3. Related Notes / Wikilink Suggestions
    const combinedText = `${title} ${content}`.toLowerCase();
    const tokenList = tokenizeText(combinedText);
    const uniqueTokens = new Set(tokenList.filter((t) => t.length > 2));
    const suggestedRelatedNotes: EditorSmartRelatedNoteSuggestion[] = [];

    // Also extract existing wikilinks in content to avoid re-suggesting already linked notes
    const existingWikiLinks = new Set<string>();
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let wlMatch;
    while ((wlMatch = wikilinkRegex.exec(content)) !== null) {
      existingWikiLinks.add(wlMatch[1].trim().toLowerCase());
    }

    for (const targetNote of allNotes) {
      if (targetNote.id === noteId || targetNote.trashed || targetNote.archived) continue;
      const targetTitle = (targetNote.title || '').trim();
      if (!targetTitle) continue;
      const targetTitleLower = targetTitle.toLowerCase();

      if (existingWikiLinks.has(targetTitleLower)) continue;

      let score = 0;
      let reason = '';

      // Direct title occurrence in content
      if (targetTitle.length > 2 && combinedText.includes(targetTitleLower)) {
        score = 0.95;
        reason = `Matches keyword in note`;
      } else {
        // Tag overlap
        const targetTags = (targetNote.tags || []).map((t) => t.toLowerCase().replace(/^#/, ''));
        const sharedTags = targetTags.filter((t) => normalizedCurrentTags.has(t) || foundInContent.has(t));
        if (sharedTags.length > 0) {
          score += 0.4 + Math.min(0.3, sharedTags.length * 0.15);
          reason = `Shares #${sharedTags.slice(0, 2).join(', #')}`;
        }

        // Shared token overlap
        const targetTokens = tokenizeText(`${targetNote.title} ${targetNote.content || ''}`.toLowerCase());
        const sharedTokenCount = targetTokens.filter((tok) => uniqueTokens.has(tok)).length;
        if (sharedTokenCount >= 3) {
          const overlapScore = Math.min(0.4, (sharedTokenCount / Math.max(1, uniqueTokens.size)) * 1.5);
          score = Math.max(score, 0.35 + overlapScore);
          if (!reason) {
            reason = `${sharedTokenCount} shared topics`;
          }
        }
      }

      if (score >= 0.4) {
        suggestedRelatedNotes.push({
          id: targetNote.id,
          title: targetTitle,
          reason: reason || 'Related context',
          confidence: score,
        });
      }
    }

    suggestedRelatedNotes.sort((a, b) => b.confidence - a.confidence);

    return {
      tags: suggestedTags.slice(0, 6),
      relatedNotes: suggestedRelatedNotes.slice(0, 5),
      ruleSuggestions: matchingRuleSuggestions.slice(0, 3),
    };
  }

  // --- Rule Management ---

  public getRules(): AutomationRule[] {
    return [...this.rules];
  }

  public getRule(id: string): AutomationRule | undefined {
    return this.rules.find((r) => r.id === id);
  }

  public async saveRule(ruleData: Partial<AutomationRule> & { name: string }): Promise<AutomationRule> {
    const isNew = !ruleData.id;
    const rule: AutomationRule = {
      id: ruleData.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      schemaVersion: AUTOMATION_SCHEMA_VERSION,
      name: ruleData.name,
      description: ruleData.description || '',
      enabled: ruleData.enabled !== undefined ? ruleData.enabled : true,
      status: ruleData.status || 'active',
      statusReason: ruleData.statusReason,
      priority: ruleData.priority || 'normal',
      targetScope: ruleData.targetScope || 'vault',
      trigger: ruleData.trigger || { type: 'note_created' },
      conditionGroup: ruleData.conditionGroup || 'ALL',
      conditions: ruleData.conditions || [],
      actions: ruleData.actions || [],
      options: {
        stopOnError: ruleData.options?.stopOnError !== false,
        requireConfirmation: Boolean(ruleData.options?.requireConfirmation),
        runOnImport: Boolean(ruleData.options?.runOnImport),
        runOnSync: Boolean(ruleData.options?.runOnSync),
        maxImpact: ruleData.options?.maxImpact || DEFAULT_BULK_IMPACT_LIMIT,
      },
      consecutiveFailures: ruleData.consecutiveFailures || 0,
      createdAt: ruleData.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const idx = this.rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      this.rules[idx] = rule;
    } else {
      this.rules.push(rule);
    }

    await automationStorageService.saveRule(rule);
    this.notifyListeners();
    return rule;
  }

  public async deleteRule(ruleId: string): Promise<void> {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
    await automationStorageService.deleteRule(ruleId);
    this.notifyListeners();
  }

  public async toggleRule(ruleId: string, enabled: boolean): Promise<void> {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return;
    rule.enabled = enabled;
    rule.status = enabled ? 'active' : 'disabled';
    rule.updatedAt = Date.now();
    await automationStorageService.saveRule(rule);
    this.notifyListeners();
  }

  public async duplicateRule(ruleId: string): Promise<AutomationRule | null> {
    const original = this.rules.find((r) => r.id === ruleId);
    if (!original) return null;

    const duplicate: AutomationRule = {
      ...JSON.parse(JSON.stringify(original)),
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      consecutiveFailures: 0,
      lastExecutedAt: undefined,
      lastOccurrenceId: undefined,
    };

    this.rules.push(duplicate);
    await automationStorageService.saveRule(duplicate);
    this.notifyListeners();
    return duplicate;
  }

  // --- Master Pause / Resume ---

  public isPaused(): boolean {
    return this.paused;
  }

  public async setPaused(paused: boolean): Promise<void> {
    this.paused = paused;
    await automationStorageService.setPaused(paused);
    this.notifyListeners();
  }

  // --- Domain Event Dispatching ---

  public async dispatchEvent(event: CanonicalDomainEvent): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.paused) return;

    // Safety guard: do not execute automation on encrypted vault when locked
    if (vaultEncryptionService.isVaultLocked()) {
      return;
    }

    const normalizedEvent: CanonicalDomainEvent = {
      ...event,
      id: event.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      origin: event.origin || 'user-action',
      noteId: event.noteId || event.note?.id,
      timestamp: event.timestamp || Date.now(),
    };

    // Filter candidate rules matching the trigger type
    const candidateRules = this.rules.filter((rule) => {
      if (!rule.enabled || rule.status !== 'active') return false;
      return this.isTriggerMatching(rule.trigger, normalizedEvent);
    });

    if (candidateRules.length === 0) return;

    // Initialize or continue Execution Chain
    let chain: ExecutionChain;
    if (normalizedEvent.executionChainId) {
      chain = {
        id: normalizedEvent.executionChainId,
        depth: 1,
        visitedRuleIds: new Set<string>(),
      };
    } else {
      chain = {
        id: `chain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        depth: 0,
        visitedRuleIds: new Set<string>(),
      };
    }

    for (const rule of candidateRules) {
      await this.evaluateAndExecuteRule(rule, normalizedEvent, chain);
    }
  }

  /**
   * Evaluates if a trigger definition matches the dispatched domain event
   */
  private isTriggerMatching(trigger: any, event: CanonicalDomainEvent): boolean {
    if (trigger.type !== event.type) return false;

    // Note lifecycle triggers
    if (trigger.type === 'note_created' || trigger.type === 'note_updated') {
      if (trigger.folderId !== undefined && trigger.folderId !== event.folderId) {
        return false;
      }
      if (trigger.tag) {
        const clean = trigger.tag.toLowerCase().replace(/^#/, '');
        const noteTags = (event.note?.tags || []).map((t) => t.toLowerCase().replace(/^#/, ''));
        if (!noteTags.includes(clean)) return false;
      }
      return true;
    }

    // Property triggers
    if (
      trigger.type === 'property_added' ||
      trigger.type === 'property_changed' ||
      trigger.type === 'property_removed' ||
      trigger.type === 'property_becomes_value'
    ) {
      if (trigger.propertyKey && trigger.propertyKey !== event.propertyKey) {
        return false;
      }
      if (trigger.type === 'property_becomes_value') {
        const targetStr = String(trigger.targetValue).toLowerCase().trim();
        const newStr = String(event.propertyNewValue).toLowerCase().trim();
        if (targetStr !== newStr) return false;
      }
      return true;
    }

    // Tag triggers
    if (trigger.type === 'tag_added' || trigger.type === 'tag_removed') {
      if (trigger.tag) {
        const trigTag = trigger.tag.toLowerCase().replace(/^#/, '');
        const eventTag = (event.tag || '').toLowerCase().replace(/^#/, '');
        if (trigTag !== eventTag) return false;
      }
      return true;
    }

    // Capture triggers
    if (trigger.type === 'browser_capture_committed') {
      if (trigger.sourceHost && event.captureData?.sourceHost) {
        if (!event.captureData.sourceHost.toLowerCase().includes(trigger.sourceHost.toLowerCase())) {
          return false;
        }
      }
      return true;
    }

    return true;
  }

  /**
   * Evaluates conditions and executes actions for a matched rule
   */
  private async evaluateAndExecuteRule(
    rule: AutomationRule,
    event: CanonicalDomainEvent,
    chain: ExecutionChain
  ): Promise<void> {
    const startTime = performance.now();

    // 1. Loop and Depth Prevention
    if (chain.depth >= MAX_EXECUTION_DEPTH) {
      await this.recordLogEntry({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: event.type,
        timestamp: Date.now(),
        origin: event.origin,
        status: 'loop_detected',
        affectedResourceIds: event.noteId ? [event.noteId] : [],
        actionResults: [],
        error: `Execution depth exceeded limit (${MAX_EXECUTION_DEPTH}). Cascade halted to prevent infinite loops.`,
        durationMs: Math.round(performance.now() - startTime),
        executionChainId: chain.id,
      });
      return;
    }

    // Re-entry guard: cannot run same rule twice in same chain
    if (chain.visitedRuleIds.has(rule.id)) {
      return;
    }

    // 2. Origin Check
    if (
      (event.origin === 'git-sync' || event.origin === 'device-sync') &&
      !rule.options?.runOnSync
    ) {
      return;
    }
    if (event.origin === 'import' && !rule.options?.runOnImport) {
      return;
    }
    if (event.origin === 'restore' || event.origin === 'migration') {
      return;
    }

    // 3. Evaluate Conditions
    const folders = this.executionContext?.folders || [];
    const conditionResult = evaluateConditionGroup(rule.conditions, rule.conditionGroup, {
      note: event.note,
      folders,
      event,
      referenceData: event.referenceData as any,
    });

    if (!conditionResult.passed) {
      return; // Conditions not met
    }

    // 4. Handle Confirmation Mode
    if (rule.options?.requireConfirmation) {
      const suggestion: AutomationSuggestion = {
        id: `sugg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        title: rule.name,
        description: generateRuleSummary(rule, folders),
        noteId: event.noteId,
        noteTitle: event.note?.title,
        actions: rule.actions,
        contextEvent: event,
        createdAt: Date.now(),
      };

      this.pendingSuggestions.unshift(suggestion);
      await automationStorageService.saveSuggestion(suggestion);

      await this.recordLogEntry({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: event.type,
        timestamp: Date.now(),
        origin: event.origin,
        status: 'suggestion_pending',
        affectedResourceIds: event.noteId ? [event.noteId] : [],
        actionResults: [],
        durationMs: Math.round(performance.now() - startTime),
        executionChainId: chain.id,
      });

      this.notifyListeners();
      return;
    }

    // 5. Execute Actions
    chain.visitedRuleIds.add(rule.id);
    const childChain: ExecutionChain = {
      id: chain.id,
      depth: chain.depth + 1,
      visitedRuleIds: new Set(chain.visitedRuleIds),
      originatingRuleId: chain.originatingRuleId || rule.id,
    };

    const actionResults = await this.executeActionList(
      rule.actions,
      event,
      rule.name,
      rule.id,
      childChain
    );

    const hasFailed = actionResults.some((a) => a.status === 'failed');
    const affectedIds = Array.from(
      new Set(actionResults.map((a) => a.affectedResourceId).filter(Boolean) as string[])
    );

    // Update rule runtime status
    rule.lastExecutedAt = Date.now();
    if (hasFailed) {
      rule.consecutiveFailures = (rule.consecutiveFailures || 0) + 1;
      if (rule.consecutiveFailures >= 3) {
        rule.status = 'needs_attention';
        rule.statusReason = `Failed ${rule.consecutiveFailures} times in a row.`;
      }
    } else {
      rule.consecutiveFailures = 0;
      if (rule.status === 'needs_attention') {
        rule.status = 'active';
        rule.statusReason = undefined;
      }
    }

    await automationStorageService.saveRule(rule);

    // Record Log Entry
    await this.recordLogEntry({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      triggerType: event.type,
      timestamp: Date.now(),
      origin: event.origin,
      status: hasFailed ? 'failed' : 'success',
      affectedResourceIds: affectedIds,
      actionResults,
      durationMs: Math.round(performance.now() - startTime),
      isUndoable: actionResults.some((a) => a.undoSnapshot !== undefined),
      undoData: actionResults.map((a) => a.undoSnapshot).filter(Boolean),
      executionChainId: chain.id,
    });

    this.notifyListeners();
  }

  /**
   * Executes scheduled occurrences
   */
  private async executeScheduledRule(
    rule: AutomationRule,
    occurrenceKey: string,
    scheduledTime: Date
  ): Promise<string | undefined> {
    const event: CanonicalDomainEvent = {
      id: `sched-event-${Date.now()}`,
      type: rule.trigger.type,
      timestamp: Date.now(),
      origin: 'automation',
      scheduledOccurrenceId: `${rule.id}:${occurrenceKey}`,
    };

    const chain: ExecutionChain = {
      id: `chain-sched-${Date.now()}`,
      depth: 0,
      visitedRuleIds: new Set([rule.id]),
      originatingRuleId: rule.id,
    };

    const actionResults = await this.executeActionList(
      rule.actions,
      event,
      rule.name,
      rule.id,
      chain,
      scheduledTime
    );

    rule.lastExecutedAt = Date.now();
    rule.lastOccurrenceId = `${rule.id}:${occurrenceKey}`;
    await automationStorageService.saveRule(rule);

    const firstCreated = actionResults.find((a) => a.actionType === 'create_note')?.affectedResourceId;
    return firstCreated;
  }

  /**
   * Executes a series of actions with atomic note state batching
   */
  private async executeActionList(
    actions: AutomationAction[],
    event: CanonicalDomainEvent,
    ruleName: string,
    ruleId: string,
    chain: ExecutionChain,
    scheduledTime?: Date
  ): Promise<ActionResultItem[]> {
    if (!this.executionContext) {
      return [
        {
          actionType: (actions[0]?.type || 'create_note') as any,
          status: 'failed',
          error: 'Execution context not available',
        },
      ];
    }

    const ctx = this.executionContext;
    const results: ActionResultItem[] = [];

    // Find current note from event or active note
    let currentNote: Note | null = event.note || null;
    if (!currentNote && event.noteId) {
      currentNote = ctx.notes.find((n) => n.id === event.noteId) || null;
    }
    if (!currentNote && ctx.activeNote) {
      currentNote = ctx.activeNote;
    }

    for (const action of actions) {
      try {
        const result = await this.executeSingleAction(
          action,
          currentNote,
          event,
          ruleName,
          ruleId,
          chain,
          scheduledTime
        );
        results.push(result);

        // Update working note reference if action modified it
        if (result.status === 'ok' && result.affectedResourceId) {
          if (action.type === 'create_note') {
            const newlyCreated = ctx.notes.find((n) => n.id === result.affectedResourceId);
            if (newlyCreated) currentNote = newlyCreated;
          } else if (currentNote && currentNote.id === result.affectedResourceId) {
            currentNote = ctx.notes.find((n) => n.id === currentNote!.id) || currentNote;
          }
        }
      } catch (err: any) {
        results.push({
          actionType: action.type,
          status: 'failed',
          error: err?.message || String(err),
          affectedResourceId: currentNote?.id,
        });
      }
    }

    return results;
  }

  /**
   * Executes a single atomic action
   */
  private async executeSingleAction(
    action: AutomationAction,
    targetNote: Note | null,
    event: CanonicalDomainEvent,
    ruleName: string,
    ruleId: string,
    chain: ExecutionChain,
    referenceDate?: Date
  ): Promise<ActionResultItem> {
    const ctx = this.executionContext!;
    const refDate = referenceDate || new Date();

    const interp = (tmpl?: string) =>
      interpolateVariables(tmpl || '', {
        note: targetNote,
        folders: ctx.folders,
        event,
        referenceDate: refDate,
      });

    switch (action.type) {
      case 'create_note': {
        const title = interp(action.titleTemplate) || `Note ${formatLocalDateOnly(refDate)}`;
        let content = interp(action.contentTemplate) || '';

        // Check collision policy
        const existing = ctx.notes.find(
          (n) =>
            !n.trashed &&
            n.title.trim().toLowerCase() === title.trim().toLowerCase() &&
            (n.folderId || null) === (action.folderId || null)
        );

        if (existing) {
          if (action.collisionPolicy === 'skip_if_exists') {
            return {
              actionType: 'create_note',
              status: 'skipped',
              details: `Note "${title}" already exists. Skipped per collision policy.`,
              affectedResourceId: existing.id,
            };
          } else if (action.collisionPolicy === 'append_to_existing') {
            const updated: Note = {
              ...existing,
              content: `${existing.content}\n\n${content}`,
              updatedAt: new Date().toISOString(),
            };
            await ctx.saveNote(updated);
            return {
              actionType: 'create_note',
              status: 'ok',
              details: `Appended content to existing note "${title}".`,
              affectedResourceId: existing.id,
            };
          }
        }

        // Apply properties if provided
        if (action.properties) {
          for (const [k, v] of Object.entries(action.properties)) {
            const interpVal = typeof v === 'string' ? interp(v) : v;
            content = setPropertyInContent(content, k, interpVal);
          }
        }

        const tags = (action.tags || []).map((t) => interp(t).replace(/^#/, ''));

        const newNote = await ctx.createNote({
          title,
          content,
          folderId: action.folderId || null,
          tags,
          type: 'text',
          checklist: [],
          color: 'default',
          pinned: false,
          archived: false,
          trashed: false,
          reminderDate: null,
          images: [],
          audios: [],
        });

        return {
          actionType: 'create_note',
          status: 'ok',
          details: `Created note "${newNote.title}".`,
          affectedResourceId: newNote.id,
          undoSnapshot: {
            type: 'note_creation',
            noteId: newNote.id,
            previousState: null,
          },
        };
      }

      case 'move_note': {
        if (!targetNote) {
          return { actionType: 'move_note', status: 'skipped', details: 'No active target note' };
        }
        const previousFolder = targetNote.folderId;
        const updated: Note = {
          ...targetNote,
          folderId: action.targetFolderId,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'move_note',
          status: 'ok',
          details: `Moved note to folder ID "${action.targetFolderId || 'Root'}".`,
          affectedResourceId: targetNote.id,
          undoSnapshot: {
            type: 'folder_change',
            noteId: targetNote.id,
            previousState: { folderId: previousFolder },
          },
        };
      }

      case 'rename_note': {
        if (!targetNote) {
          return { actionType: 'rename_note', status: 'skipped', details: 'No active target note' };
        }
        const oldTitle = targetNote.title;
        const newTitle = interp(action.titleTemplate);
        const updated: Note = {
          ...targetNote,
          title: newTitle,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'rename_note',
          status: 'ok',
          details: `Renamed note from "${oldTitle}" to "${newTitle}".`,
          affectedResourceId: targetNote.id,
        };
      }

      case 'apply_template': {
        if (!targetNote) {
          return { actionType: 'apply_template', status: 'skipped', details: 'No active target note' };
        }
        const templateNote = ctx.notes.find((n) => n.id === action.templateId || n.title === action.templateId);
        const templateBody = templateNote ? templateNote.content : '';
        const rendered = interp(templateBody);

        let newContent = targetNote.content;
        if (action.mode === 'prepend') {
          newContent = `${rendered}\n\n${targetNote.content}`;
        } else if (action.mode === 'insert_under_heading' && action.heading) {
          newContent = this.insertUnderHeadingInMarkdown(
            targetNote.content,
            action.heading,
            rendered,
            'append_end'
          );
        } else {
          newContent = `${targetNote.content}\n\n${rendered}`;
        }

        const prevContent = targetNote.content;
        const updated: Note = {
          ...targetNote,
          content: newContent,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'apply_template',
          status: 'ok',
          details: `Applied template "${action.templateId}".`,
          affectedResourceId: targetNote.id,
          undoSnapshot: {
            type: 'note_content',
            noteId: targetNote.id,
            previousState: { content: prevContent },
          },
        };
      }

      case 'append_markdown': {
        if (!targetNote) {
          return { actionType: 'append_markdown', status: 'skipped', details: 'No active target note' };
        }
        const snippet = interp(action.content);
        const prev = targetNote.content;
        const updated: Note = {
          ...targetNote,
          content: `${targetNote.content}\n\n${snippet}`,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'append_markdown',
          status: 'ok',
          details: 'Appended markdown content.',
          affectedResourceId: targetNote.id,
          undoSnapshot: {
            type: 'note_content',
            noteId: targetNote.id,
            previousState: { content: prev },
          },
        };
      }

      case 'prepend_markdown': {
        if (!targetNote) {
          return { actionType: 'prepend_markdown', status: 'skipped', details: 'No active target note' };
        }
        const snippet = interp(action.content);
        const prev = targetNote.content;
        const updated: Note = {
          ...targetNote,
          content: `${snippet}\n\n${targetNote.content}`,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'prepend_markdown',
          status: 'ok',
          details: 'Prepended markdown content.',
          affectedResourceId: targetNote.id,
          undoSnapshot: {
            type: 'note_content',
            noteId: targetNote.id,
            previousState: { content: prev },
          },
        };
      }

      case 'insert_under_heading': {
        if (!targetNote) {
          return { actionType: 'insert_under_heading', status: 'skipped', details: 'No active target note' };
        }
        const snippet = interp(action.content);
        const prev = targetNote.content;
        const newContent = this.insertUnderHeadingInMarkdown(
          targetNote.content,
          action.heading,
          snippet,
          action.fallback
        );
        const updated: Note = {
          ...targetNote,
          content: newContent,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'insert_under_heading',
          status: 'ok',
          details: `Inserted content under heading "## ${action.heading}".`,
          affectedResourceId: targetNote.id,
          undoSnapshot: {
            type: 'note_content',
            noteId: targetNote.id,
            previousState: { content: prev },
          },
        };
      }

      case 'set_property': {
        if (!targetNote) {
          return { actionType: 'set_property', status: 'skipped', details: 'No active target note' };
        }
        const rawVal = action.value;
        const val = typeof rawVal === 'string' ? interp(rawVal) : rawVal;
        const prevContent = targetNote.content;
        const newContent = setPropertyInContent(targetNote.content, action.key, val);
        const updated: Note = {
          ...targetNote,
          content: newContent,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'set_property',
          status: 'ok',
          details: `Set property "${action.key}" = "${val}".`,
          affectedResourceId: targetNote.id,
          undoSnapshot: {
            type: 'note_properties',
            noteId: targetNote.id,
            previousState: { content: prevContent },
          },
        };
      }

      case 'remove_property': {
        if (!targetNote) {
          return { actionType: 'remove_property', status: 'skipped', details: 'No active target note' };
        }
        const prevContent = targetNote.content;
        const newContent = removePropertyFromContent(targetNote.content, action.key);
        const updated: Note = {
          ...targetNote,
          content: newContent,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'remove_property',
          status: 'ok',
          details: `Removed property "${action.key}".`,
          affectedResourceId: targetNote.id,
          undoSnapshot: {
            type: 'note_properties',
            noteId: targetNote.id,
            previousState: { content: prevContent },
          },
        };
      }

      case 'add_tag': {
        if (!targetNote) {
          return { actionType: 'add_tag', status: 'skipped', details: 'No active target note' };
        }
        const tagClean = interp(action.tag).replace(/^#/, '').toLowerCase().trim();
        const existingTags = targetNote.tags || [];
        if (existingTags.some((t) => t.toLowerCase() === tagClean)) {
          return { actionType: 'add_tag', status: 'skipped', details: `Tag #${tagClean} already present.` };
        }
        const updated: Note = {
          ...targetNote,
          tags: [...existingTags, tagClean],
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'add_tag',
          status: 'ok',
          details: `Added tag "#${tagClean}".`,
          affectedResourceId: targetNote.id,
        };
      }

      case 'remove_tag': {
        if (!targetNote) {
          return { actionType: 'remove_tag', status: 'skipped', details: 'No active target note' };
        }
        const tagClean = interp(action.tag).replace(/^#/, '').toLowerCase().trim();
        const existingTags = targetNote.tags || [];
        const updatedTags = existingTags.filter((t) => t.toLowerCase() !== tagClean);
        const updated: Note = {
          ...targetNote,
          tags: updatedTags,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'remove_tag',
          status: 'ok',
          details: `Removed tag "#${tagClean}".`,
          affectedResourceId: targetNote.id,
        };
      }

      case 'add_task': {
        if (!targetNote) {
          return { actionType: 'add_task', status: 'skipped', details: 'No active target note' };
        }
        const taskText = interp(action.taskText);
        const taskLine = `- [ ] ${taskText}`;
        let newContent = targetNote.content;
        if (action.heading) {
          newContent = this.insertUnderHeadingInMarkdown(
            targetNote.content,
            action.heading,
            taskLine,
            'append_end'
          );
        } else {
          newContent = `${targetNote.content}\n${taskLine}`;
        }
        const prevContent = targetNote.content;
        const updated: Note = {
          ...targetNote,
          content: newContent,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'add_task',
          status: 'ok',
          details: `Added task "${taskText}".`,
          affectedResourceId: targetNote.id,
          undoSnapshot: {
            type: 'note_content',
            noteId: targetNote.id,
            previousState: { content: prevContent },
          },
        };
      }

      case 'complete_all_tasks': {
        if (!targetNote) {
          return { actionType: 'complete_all_tasks', status: 'skipped', details: 'No active target note' };
        }
        const prevContent = targetNote.content;
        // Replace all `- [ ] ` with `- [x] `
        const newContent = targetNote.content.replace(/^(\s*[-*+]\s*\[) (\])/gm, '$1x$2');
        const updated: Note = {
          ...targetNote,
          content: newContent,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'complete_all_tasks',
          status: 'ok',
          details: 'Marked all open tasks in note as complete.',
          affectedResourceId: targetNote.id,
          undoSnapshot: {
            type: 'note_content',
            noteId: targetNote.id,
            previousState: { content: prevContent },
          },
        };
      }

      case 'archive_note': {
        if (!targetNote) {
          return { actionType: 'archive_note', status: 'skipped', details: 'No active target note' };
        }
        const updated: Note = {
          ...targetNote,
          archived: action.archive !== false,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'archive_note',
          status: 'ok',
          details: action.archive !== false ? 'Archived note.' : 'Unarchived note.',
          affectedResourceId: targetNote.id,
        };
      }

      case 'move_to_trash': {
        if (!targetNote) {
          return { actionType: 'move_to_trash', status: 'skipped', details: 'No active target note' };
        }
        const updated: Note = {
          ...targetNote,
          trashed: true,
          updatedAt: new Date().toISOString(),
        };
        await ctx.saveNote(updated);
        return {
          actionType: 'move_to_trash',
          status: 'ok',
          details: 'Moved note to trash.',
          affectedResourceId: targetNote.id,
        };
      }

      case 'show_in_app_notification': {
        const msg = interp(action.message);
        if (ctx.showNotification) {
          ctx.showNotification(msg, action.severity || 'info');
        }
        return {
          actionType: 'show_in_app_notification',
          status: 'ok',
          details: `Displayed notification: "${msg}".`,
        };
      }

      case 'suggest_action': {
        return {
          actionType: 'suggest_action',
          status: 'ok',
          details: `Suggested action "${action.title}".`,
        };
      }

      default:
        return {
          actionType: (action as any).type,
          status: 'skipped',
          details: 'Unrecognized action type',
        };
    }
  }

  /**
   * Safe heading insertion in Markdown
   */
  private insertUnderHeadingInMarkdown(
    content: string,
    headingTitle: string,
    snippetToInsert: string,
    fallback: 'create_heading' | 'append_end' | 'skip' = 'create_heading'
  ): string {
    const cleanHeading = headingTitle.replace(/^#+\s*/, '').trim().toLowerCase();
    const lines = content.split('\n');
    let targetHeadingLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const text = match[2].trim().toLowerCase();
        if (text === cleanHeading) {
          targetHeadingLineIndex = i;
          break;
        }
      }
    }

    if (targetHeadingLineIndex !== -1) {
      // Insert right after the heading line
      lines.splice(targetHeadingLineIndex + 1, 0, snippetToInsert);
      return lines.join('\n');
    }

    if (fallback === 'create_heading') {
      return `${content.trim()}\n\n## ${headingTitle}\n${snippetToInsert}\n`;
    } else if (fallback === 'append_end') {
      return `${content.trim()}\n\n${snippetToInsert}\n`;
    }

    return content;
  }

  // --- Dry Run / Simulation ---

  public dryRunRule(
    rule: AutomationRule,
    targetNote?: Note | null
  ): DryRunResult {
    const note = targetNote || this.executionContext?.activeNote || this.executionContext?.notes[0] || null;
    const folders = this.executionContext?.folders || [];

    const simEvent: CanonicalDomainEvent = {
      id: `sim-${Date.now()}`,
      type: rule.trigger.type,
      timestamp: Date.now(),
      origin: 'user',
      noteId: note?.id,
      note: note || undefined,
      folderId: note?.folderId,
    };

    const triggerMatched = this.isTriggerMatching(rule.trigger, simEvent);

    const conditionResult = evaluateConditionGroup(rule.conditions, rule.conditionGroup, {
      note,
      folders,
      event: simEvent,
    });

    const interp = (tmpl?: string) =>
      interpolateVariables(tmpl || '', {
        note,
        folders,
        event: simEvent,
        referenceDate: new Date(),
      });

    const wouldExecute = conditionResult.passed ? rule.actions : [];
    const summary = generateRuleSummary(rule, folders);

    const warnings: string[] = [];
    if (!rule.enabled) warnings.push('Rule is currently disabled.');
    if (rule.actions.length === 0) warnings.push('Rule has no actions configured.');
    if (!note && rule.conditions.some((c) => c.type.startsWith('property_') || c.type.startsWith('title_'))) {
      warnings.push('No active note selected to test property/title conditions.');
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggerMatched,
      conditionsPassed: conditionResult.passed,
      conditionTraces: conditionResult.traces,
      wouldExecuteActions: wouldExecute,
      affectedResourceIds: note ? [note.id] : [],
      simulationSummary: summary,
      warnings,
    };
  }

  /**
   * Manually runs a rule now on demand
   */
  public async runRuleNow(ruleId: string, targetNoteId?: string): Promise<AutomationLogEntry | null> {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return null;

    let targetNote: Note | null = null;
    if (targetNoteId && this.executionContext) {
      targetNote = this.executionContext.notes.find((n) => n.id === targetNoteId) || null;
    } else if (this.executionContext?.activeNote) {
      targetNote = this.executionContext.activeNote;
    }

    const event: CanonicalDomainEvent = {
      id: `manual-event-${Date.now()}`,
      type: rule.trigger.type,
      timestamp: Date.now(),
      origin: 'user',
      noteId: targetNote?.id,
      note: targetNote || undefined,
      folderId: targetNote?.folderId,
    };

    const chain: ExecutionChain = {
      id: `chain-manual-${Date.now()}`,
      depth: 0,
      visitedRuleIds: new Set(),
      originatingRuleId: rule.id,
    };

    const startTime = performance.now();
    const actionResults = await this.executeActionList(
      rule.actions,
      event,
      rule.name,
      rule.id,
      chain
    );

    const hasFailed = actionResults.some((a) => a.status === 'failed');
    const affectedIds = Array.from(
      new Set(actionResults.map((a) => a.affectedResourceId).filter(Boolean) as string[])
    );

    const logEntry: AutomationLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      triggerType: rule.trigger.type,
      timestamp: Date.now(),
      origin: 'user',
      status: hasFailed ? 'failed' : 'success',
      affectedResourceIds: affectedIds,
      actionResults,
      durationMs: Math.round(performance.now() - startTime),
      isUndoable: actionResults.some((a) => a.undoSnapshot !== undefined),
      undoData: actionResults.map((a) => a.undoSnapshot).filter(Boolean),
      executionChainId: chain.id,
    };

    await this.recordLogEntry(logEntry);
    this.notifyListeners();
    return logEntry;
  }

  /**
   * Reverts mutations performed by a recorded run
   */
  public async undoRun(logEntryId: string): Promise<boolean> {
    if (!this.executionContext) return false;
    const logs = await automationStorageService.loadLogs();
    const entry = logs.find((l) => l.id === logEntryId);
    if (!entry || !entry.undoData || entry.undoData.length === 0) return false;

    const ctx = this.executionContext;

    for (const snapshot of entry.undoData) {
      if (snapshot.type === 'note_content' || snapshot.type === 'note_properties') {
        const note = ctx.notes.find((n) => n.id === snapshot.noteId);
        if (note && snapshot.previousState?.content !== undefined) {
          const restored: Note = {
            ...note,
            content: snapshot.previousState.content,
            updatedAt: new Date().toISOString(),
          };
          await ctx.saveNote(restored);
        }
      } else if (snapshot.type === 'folder_change') {
        const note = ctx.notes.find((n) => n.id === snapshot.noteId);
        if (note && snapshot.previousState?.folderId !== undefined) {
          const restored: Note = {
            ...note,
            folderId: snapshot.previousState.folderId,
            updatedAt: new Date().toISOString(),
          };
          await ctx.saveNote(restored);
        }
      } else if (snapshot.type === 'note_creation') {
        await ctx.deleteNote(snapshot.noteId);
      }
    }

    if (ctx.showNotification) {
      ctx.showNotification(`Reverted actions from "${entry.ruleName}"`, 'info');
    }

    this.notifyListeners();
    return true;
  }

  // --- Logging ---

  private async recordLogEntry(entry: AutomationLogEntry): Promise<void> {
    await automationStorageService.appendLog(entry);
  }

  public async getLogs(): Promise<AutomationLogEntry[]> {
    return automationStorageService.loadLogs();
  }

  public async clearLogs(): Promise<void> {
    await automationStorageService.clearLogs();
    this.notifyListeners();
  }

  // --- Diagnostics ---

  public checkAutomationHealth(notes: Note[], folders: Folder[]): {
    healthy: boolean;
    issues: { ruleId: string; ruleName: string; severity: 'error' | 'warning'; message: string }[];
  } {
    const issues: { ruleId: string; ruleName: string; severity: 'error' | 'warning'; message: string }[] = [];
    const folderIds = new Set(folders.map((f) => f.id));
    const noteIds = new Set(notes.map((n) => n.id));

    for (const rule of this.rules) {
      // Check folder triggers
      if ((rule.trigger as any).folderId) {
        const fid = (rule.trigger as any).folderId;
        if (!folderIds.has(fid)) {
          issues.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: 'warning',
            message: `Trigger references missing folder "${fid}".`,
          });
        }
      }

      // Check conditions
      for (const cond of rule.conditions) {
        if (cond.type === 'folder_equals' || cond.type === 'folder_under') {
          if (cond.value && !folderIds.has(cond.value)) {
            issues.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: 'warning',
              message: `Condition references missing folder "${cond.value}".`,
            });
          }
        }
      }

      // Check actions
      for (const act of rule.actions) {
        if (act.type === 'move_note' && act.targetFolderId && !folderIds.has(act.targetFolderId)) {
          issues.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: 'error',
            message: `Action moves note to missing folder "${act.targetFolderId}".`,
          });
        }
        if (act.type === 'apply_template') {
          const tmpl = notes.find((n) => n.id === act.templateId || n.title === act.templateId);
          if (!tmpl) {
            issues.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: 'warning',
              message: `Action references template "${act.templateId}" which was not found.`,
            });
          }
        }
      }

      // Consecutive failures check
      if (rule.consecutiveFailures && rule.consecutiveFailures >= 3) {
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'error',
          message: `Rule has failed ${rule.consecutiveFailures} consecutive times. Check execution logs.`,
        });
      }
    }

    return {
      healthy: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }
}

export const automationEngine = new AutomationEngine();
