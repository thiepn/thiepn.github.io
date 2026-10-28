import { Note, Folder } from '../../types';
import {
  AISettings,
  AIScope,
  AIChatMessage,
  AIConversation,
  AIGroundedMode,
  AIMode,
  AIProposedAction,
  AIWritingRequest,
  AIChunk,
  AISourceContext,
  AIDiffChunk,
} from './types';
import { aiSettingsService } from './aiSettingsService';
import { ragPipeline } from './ragPipeline';
import { parseAndVerifyCitations } from './citations';
import { localAIProvider } from './providers/localProvider';
import { externalAIProvider } from './providers/externalProvider';
import { AIProvider } from './providers/aiProviderInterface';
import { computeWordDiff } from './diff';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';
import { computeStringHash } from './chunker';

export class AIOrchestrator {
  private activeAbortController: AbortController | null = null;
  private currentSessionGenerationId = 1;
  private activeConversation: AIConversation | null = null;
  private subscribers: Array<(conversation: AIConversation | null) => void> = [];

  constructor() {
    this.attachVaultLockListener();
  }

  // --- Vault Lock Lifecycle & Security Purge ---

  private attachVaultLockListener(): void {
    vaultEncryptionService.subscribeLockStateChange((status) => {
      if (status === 'locked') {
        this.purgeSensitiveStateOnLock();
      }
    });
  }

  /**
   * Purges all volatile memory buffers, prompt histories, active streaming connections on vault lock.
   */
  public purgeSensitiveStateOnLock(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.currentSessionGenerationId++; // Invalidate any incoming responses from in-flight requests
    this.activeConversation = null;
    this.notifySubscribers();
  }

  public getSessionGenerationId(): number {
    return this.currentSessionGenerationId;
  }

  // --- Conversation Management ---

  public getActiveConversation(): AIConversation | null {
    return this.activeConversation;
  }

  public startNewConversation(
    scope: AIScope,
    groundedMode?: AIGroundedMode,
    isTemporary = false
  ): AIConversation {
    const settings = aiSettingsService.getSettings();
    const conv: AIConversation = {
      id: `ai_conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isTemporary,
      scope,
      groundedMode: groundedMode || settings.groundedModeDefault,
      messages: [],
    };
    this.activeConversation = conv;
    this.notifySubscribers();
    return conv;
  }

  public setConversation(conv: AIConversation | null): void {
    this.activeConversation = conv;
    this.notifySubscribers();
  }

  public subscribe(callback: (conv: AIConversation | null) => void): () => void {
    this.subscribers.push(callback);
    callback(this.activeConversation);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers(): void {
    for (const sub of this.subscribers) {
      try {
        sub(this.activeConversation);
      } catch (err) {
        console.error('Error in AI orchestrator subscriber:', err);
      }
    }
  }

  // --- Query & RAG Execution ---

  public async askVault(
    prompt: string,
    options: {
      notes: Note[];
      folders?: Folder[];
      scope?: AIScope;
      groundedMode?: AIGroundedMode;
      onStreamUpdate?: (partialMessage: AIChatMessage) => void;
      extraChunks?: AIChunk[];
    }
  ): Promise<AIChatMessage> {
    const settings = aiSettingsService.getSettings();
    if (settings.mode === 'disabled') {
      throw new Error('AI Assistance is currently disabled. Enable Local or External AI in Settings.');
    }

    if (vaultEncryptionService.isVaultLocked()) {
      throw new Error('Vault is locked. Unlock the vault before using Knowledge Copilot.');
    }

    const currentGenId = this.currentSessionGenerationId;
    const scope = options.scope || this.activeConversation?.scope || {
      type: 'current_note',
      label: 'Current Note',
    };
    const groundedMode =
      options.groundedMode || this.activeConversation?.groundedMode || settings.groundedModeDefault;

    // 1. Abort previous in-flight request if any
    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
    this.activeAbortController = new AbortController();
    const signal = this.activeAbortController.signal;

    // 2. Perform Hybrid Retrieval over Scope
    const retrieval = await ragPipeline.retrieveContext(prompt, scope, options.notes, {
      folders: options.folders,
      extraChunks: options.extraChunks,
    });

    // 3. Construct System Prompt & Grounding Context with Injection Hardening
    const systemPrompt = ragPipeline.buildPromptContext(retrieval.sources, groundedMode);

    // 4. Resolve Active Provider
    const provider: AIProvider =
      settings.mode === 'local' ? localAIProvider : externalAIProvider;

    // 5. Build conversation message history
    const historyMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (this.activeConversation && this.activeConversation.messages.length > 0) {
      for (const m of this.activeConversation.messages.slice(-6)) {
        historyMessages.push({ role: m.role, content: m.content });
      }
    }
    historyMessages.push({ role: 'user', content: prompt });

    const userMessageId = `msg_u_${Date.now()}`;
    const assistantMessageId = `msg_a_${Date.now()}`;

    const userMsg: AIChatMessage = {
      id: userMessageId,
      role: 'user',
      content: prompt,
      citations: [],
      sources: [],
      mode: settings.mode,
      timestamp: Date.now(),
      groundedMode,
    };

    const initialAssistantMsg: AIChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      citations: [],
      sources: retrieval.sources,
      mode: settings.mode,
      providerName: provider.name,
      timestamp: Date.now(),
      groundedMode,
      isPartial: true,
      scopeSummary: `${retrieval.scopeSummary.totalNotesInScope} notes searched (${retrieval.sources.length} sources used)`,
    };

    if (this.activeConversation) {
      this.activeConversation.messages.push(userMsg, initialAssistantMsg);
      this.activeConversation.updatedAt = Date.now();
      if (this.activeConversation.messages.length === 2 && this.activeConversation.title === 'New Conversation') {
        this.activeConversation.title = prompt.slice(0, 36) + (prompt.length > 36 ? '...' : '');
      }
      this.notifySubscribers();
    }

    // 6. Execute Generation Stream
    let rawOutput = '';
    try {
      await provider.generateStream(
        {
          systemPrompt,
          messages: historyMessages,
          sources: retrieval.sources,
          signal,
        },
        (event) => {
          // Check for vault lock race condition
          if (this.currentSessionGenerationId !== currentGenId || vaultEncryptionService.isVaultLocked()) {
            throw new Error('Vault locked during generation');
          }

          if (event.type === 'token' && event.token) {
            rawOutput += event.token;
            const parsed = parseAndVerifyCitations(rawOutput, retrieval.sources);
            const partialMsg: AIChatMessage = {
              ...initialAssistantMsg,
              content: parsed.cleanedText,
              citations: parsed.citations,
              isPartial: true,
            };

            if (this.activeConversation) {
              const idx = this.activeConversation.messages.findIndex((m) => m.id === assistantMessageId);
              if (idx !== -1) {
                this.activeConversation.messages[idx] = partialMsg;
              }
            }
            options.onStreamUpdate?.(partialMsg);
          }
        }
      );

      // Verify lock state before finalizing
      if (this.currentSessionGenerationId !== currentGenId || vaultEncryptionService.isVaultLocked()) {
        throw new Error('Vault locked during generation');
      }

      const finalParsed = parseAndVerifyCitations(rawOutput, retrieval.sources);
      const finalMsg: AIChatMessage = {
        ...initialAssistantMsg,
        content: finalParsed.cleanedText,
        citations: finalParsed.citations,
        isPartial: false,
      };

      if (this.activeConversation) {
        const idx = this.activeConversation.messages.findIndex((m) => m.id === assistantMessageId);
        if (idx !== -1) {
          this.activeConversation.messages[idx] = finalMsg;
        }
        this.notifySubscribers();
      }

      return finalMsg;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        const abortedMsg: AIChatMessage = {
          ...initialAssistantMsg,
          content: rawOutput ? parseAndVerifyCitations(rawOutput, retrieval.sources).cleanedText : '(Generation stopped)',
          isPartial: false,
          error: 'Stopped by user',
        };
        if (this.activeConversation) {
          const idx = this.activeConversation.messages.findIndex((m) => m.id === assistantMessageId);
          if (idx !== -1) {
            this.activeConversation.messages[idx] = abortedMsg;
          }
          this.notifySubscribers();
        }
        return abortedMsg;
      }

      const errorMsg: AIChatMessage = {
        ...initialAssistantMsg,
        content: rawOutput || 'An error occurred while generating response.',
        isPartial: false,
        error: err.message || 'Unknown generation error',
      };

      if (this.activeConversation) {
        const idx = this.activeConversation.messages.findIndex((m) => m.id === assistantMessageId);
        if (idx !== -1) {
          this.activeConversation.messages[idx] = errorMsg;
        }
        this.notifySubscribers();
      }
      throw err;
    } finally {
      this.activeAbortController = null;
    }
  }

  public stopGeneration(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  // --- Writing Assistant Pipelines (Summarize, Explain, Rewrite, Outline, Compare) ---

  public async executeWritingAssistant(
    request: AIWritingRequest,
    options: {
      notes: Note[];
      onStreamUpdate?: (partial: string) => void;
    }
  ): Promise<{
    proposedText: string;
    diff?: AIDiffChunk[];
    action: AIProposedAction;
  }> {
    const settings = aiSettingsService.getSettings();
    if (settings.mode === 'disabled') {
      throw new Error('AI Assistance is currently disabled.');
    }

    const targetNote = options.notes.find((n) => n.id === request.targetNoteId);
    const sourceText = request.selectedText || targetNote?.content || '';
    const noteVersion = targetNote ? targetNote.updatedAt : Date.now();

    // Map command to user prompt
    let prompt = '';
    switch (request.command) {
      case 'summarize':
        prompt = 'Summarize the provided text concisely into key bullet points.';
        break;
      case 'explain':
        prompt = 'Explain the core concepts in the provided text in simple, clear terms.';
        break;
      case 'rewrite':
        prompt = `Rewrite the following text to improve clarity, flow, and elegance (${request.rewriteTone || 'clear'} tone).`;
        break;
      case 'shorten':
        prompt = 'Rewrite the following text to make it more concise while preserving all critical facts.';
        break;
      case 'expand':
        prompt = 'Elaborate on the concepts in the following text with structured explanations.';
        break;
      case 'outline':
        prompt = 'Create a structured outline from the provided text using hierarchical markdown.';
        break;
      case 'compare':
        prompt = 'Compare and contrast the main arguments and themes in the provided text.';
        break;
      case 'synthesize':
        prompt = 'Synthesize the provided references and notes into an integrated literature overview.';
        break;
      case 'custom':
        prompt = request.customPrompt || 'Improve the text.';
        break;
    }

    const scope: AIScope = {
      type: request.selectedText ? 'selected_text' : 'current_note',
      label: request.selectedText ? 'Selected Text' : targetNote?.title || 'Current Note',
      currentNoteId: targetNote?.id,
      selectedText: sourceText,
    };

    const res = await this.askVault(prompt, {
      notes: options.notes,
      scope,
      groundedMode: 'vault_only',
      onStreamUpdate: (p) => {
        options.onStreamUpdate?.(p.content);
      },
    });

    const diff = request.selectedText ? computeWordDiff(request.selectedText, res.content) : undefined;

    const action: AIProposedAction = {
      id: `prop_${Date.now()}`,
      type: request.selectedText ? 'replace_selection' : 'insert_below',
      title: `${request.command.toUpperCase()}: ${targetNote?.title || 'Note'}`,
      description: `AI proposed ${request.command} for ${targetNote?.title || 'selection'}`,
      targetNoteId: targetNote?.id,
      expectedNoteVersion: noteVersion,
      originalText: sourceText,
      proposedText: res.content,
      status: 'pending',
      diff,
    };

    return {
      proposedText: res.content,
      diff,
      action,
    };
  }

  // --- Stale Edit Protection ---

  public isActionStale(action: AIProposedAction, currentNote: Note | null): boolean {
    if (!currentNote || !action.expectedNoteVersion) return false;
    return currentNote.updatedAt !== action.expectedNoteVersion;
  }
}

export const aiOrchestrator = new AIOrchestrator();
