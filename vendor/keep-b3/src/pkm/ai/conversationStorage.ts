import { AIConversation, AIChatMessage } from './types';
import { Note } from '../../types';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';
import { encryptAesGcm, decryptAesGcmToText } from '../encryption/aesGcm';

const CONVERSATIONS_STORAGE_KEY = 'keepnotes_ai_conversations_v1';
const CONVERSATIONS_ENC_STORAGE_KEY = 'keepnotes_ai_conversations_enc_v1';

export class ConversationStorageService {
  private inMemoryConversations: AIConversation[] = [];

  constructor() {
    this.loadConversations();
  }

  public getSavedConversations(): AIConversation[] {
    return [...this.inMemoryConversations].filter((c) => !c.isTemporary);
  }

  public async saveConversation(conversation: AIConversation): Promise<void> {
    if (conversation.isTemporary) {
      return; // Do not persist temporary conversations
    }

    const idx = this.inMemoryConversations.findIndex((c) => c.id === conversation.id);
    if (idx !== -1) {
      this.inMemoryConversations[idx] = conversation;
    } else {
      this.inMemoryConversations.unshift(conversation);
    }

    await this.persistToDisk();
  }

  public async deleteConversation(id: string): Promise<void> {
    this.inMemoryConversations = this.inMemoryConversations.filter((c) => c.id !== id);
    await this.persistToDisk();
  }

  public async clearAllConversations(): Promise<void> {
    this.inMemoryConversations = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
      localStorage.removeItem(CONVERSATIONS_ENC_STORAGE_KEY);
    }
  }

  // --- Export Conversation to Canonical Markdown Note ---

  public exportConversationToNote(conversation: AIConversation): Partial<Note> {
    const lines: string[] = [];
    lines.push(`# AI Conversation: ${conversation.title}`);
    lines.push('');
    lines.push(`> **Date**: ${new Date(conversation.createdAt).toLocaleString()}`);
    lines.push(`> **Scope**: ${conversation.scope.label}`);
    lines.push(`> **Grounded Mode**: ${conversation.groundedMode === 'vault_only' ? 'Vault Sources Only' : 'Vault + General Knowledge'}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    const citedSources = new Map<string, string>();

    for (const msg of conversation.messages) {
      if (msg.role === 'user') {
        lines.push(`### 👤 User`);
        lines.push(msg.content);
        lines.push('');
      } else if (msg.role === 'assistant') {
        lines.push(`### 🤖 Knowledge Copilot (${msg.mode.toUpperCase()})`);
        lines.push(msg.content);
        lines.push('');

        if (msg.citations && msg.citations.length > 0) {
          for (const c of msg.citations) {
            const headingPart = c.headingText ? `#${c.headingText}` : '';
            citedSources.set(c.noteTitle, `[[${c.noteTitle}${headingPart}]]`);
          }
        }
      }
    }

    if (citedSources.size > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## 📚 Referenced Sources');
      lines.push('');
      for (const [title, link] of citedSources.entries()) {
        lines.push(`- ${link}`);
      }
      lines.push('');
    }

    return {
      title: `AI: ${conversation.title.slice(0, 40)}`,
      content: lines.join('\n'),
      tags: ['ai-synthesis', 'copilot'],
    };
  }

  // --- Disk Persistence & Encryption ---

  private async persistToDisk(): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    const toPersist = this.inMemoryConversations.filter((c) => !c.isTemporary);
    const serialized = JSON.stringify(toPersist);

    try {
      if (vaultEncryptionService.isVaultUnlocked()) {
        const vaultKey = vaultEncryptionService.getActiveKey();
        if (vaultKey) {
          const enc = await encryptAesGcm(vaultKey, serialized);
          localStorage.setItem(CONVERSATIONS_ENC_STORAGE_KEY, JSON.stringify(enc));
          localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
          return;
        }
      }

      // If vault is not encrypted, save normally
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, serialized);
    } catch (err) {
      console.error('Failed to persist AI conversations to disk:', err);
    }
  }

  private async loadConversations(): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    try {
      const rawPlain = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (rawPlain) {
        this.inMemoryConversations = JSON.parse(rawPlain);
        return;
      }

      const rawEnc = localStorage.getItem(CONVERSATIONS_ENC_STORAGE_KEY);
      if (rawEnc && vaultEncryptionService.isVaultUnlocked()) {
        const vaultKey = vaultEncryptionService.getActiveKey();
        if (vaultKey) {
          const encObj = JSON.parse(rawEnc);
          if (encObj.ciphertext && encObj.iv) {
            const decrypted = await decryptAesGcmToText(vaultKey, encObj.ciphertext, encObj.iv);
            this.inMemoryConversations = JSON.parse(decrypted);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load AI conversations:', err);
      this.inMemoryConversations = [];
    }
  }
}

export const conversationStorageService = new ConversationStorageService();
