/**
 * PKM V1.8: Privacy & Secret Scanner Engine
 * Inspects exportable content for sensitive credentials, PII, account tokens, and private tags.
 */

import { Note } from '../../types';
import { PrivacyFinding, ExportScopeConfig } from './exportTypes';

// Regular expressions for secrets and tokens
const SECRET_PATTERNS: Array<{ type: PrivacyFinding['type']; severity: PrivacyFinding['severity']; name: string; pattern: RegExp }> = [
  {
    type: 'api-key',
    severity: 'critical',
    name: 'OpenAI API Key',
    pattern: /\bsk-(?:live-|proj-)?[a-zA-Z0-9_-]{20,64}\b/g,
  },
  {
    type: 'api-key',
    severity: 'critical',
    name: 'Google Gemini / Cloud API Key',
    pattern: /\bAIza[0-9A-Za-z-_]{35}\b/g,
  },
  {
    type: 'api-key',
    severity: 'critical',
    name: 'GitHub Personal Access Token',
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,255}\b/g,
  },
  {
    type: 'secret-token',
    severity: 'critical',
    name: 'Private RSA/EC/SSH Key Header',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
  {
    type: 'secret-token',
    severity: 'critical',
    name: 'Generic Bearer / Auth Token',
    pattern: /\bBearer\s+[a-zA-Z0-9_\-\.]{24,}\b/gi,
  },
  {
    type: 'credit-card',
    severity: 'critical',
    name: 'Payment Card Number',
    pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
  },
  {
    type: 'ssn',
    severity: 'critical',
    name: 'Social Security Number',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    type: 'account-number',
    severity: 'warning',
    name: 'Bank IBAN Number',
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{12,30}\b/g,
  },
];

/**
 * Scans a note or raw text payload for sensitive privacy leaks.
 */
export function scanNoteForPrivacyFindings(
  note: Note,
  config: ExportScopeConfig,
  allNotesMap?: Map<string, Note>
): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];
  const text = `${note.title || ''}\n${note.content || ''}`;
  const lines = text.split('\n');

  // 1. Scan for Secrets & PII Tokens
  for (const rule of SECRET_PATTERNS) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(text)) !== null) {
      const matchIndex = match.index;
      // Calculate line number
      let charCount = 0;
      let lineNum = 1;
      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1;
        if (charCount > matchIndex) {
          lineNum = i + 1;
          break;
        }
      }

      const maskedMatch = match[0].length > 8
        ? `${match[0].slice(0, 3)}...${match[0].slice(-3)}`
        : '***';

      findings.push({
        id: `finding-${findings.length + 1}`,
        noteId: note.id,
        noteTitle: note.title,
        type: rule.type,
        severity: rule.severity,
        description: `Detected ${rule.name} on line ${lineNum}`,
        snippet: maskedMatch,
        line: lineNum,
        autoRemediated: config.maskSensitiveData,
      });
    }
  }

  // 2. Scan for Private Tags
  if (config.excludeTags && config.excludeTags.length > 0) {
    const noteTags = note.tags || [];
    for (const tag of noteTags) {
      const cleanTag = tag.replace(/^#/, '').toLowerCase();
      const isExcluded = config.excludeTags.some(
        (ex) => ex.replace(/^#/, '').toLowerCase() === cleanTag
      );
      if (isExcluded) {
        findings.push({
          id: `finding-tag-${tag}`,
          noteId: note.id,
          noteTitle: note.title,
          type: 'private-tag',
          severity: 'info',
          description: `Note contains private tag #${tag}`,
          autoRemediated: config.hidePrivateTags,
        });
      }
    }
  }

  // 3. Scan for Links to Private/Locked Notes outside scope
  if (allNotesMap && note.content) {
    const wikilinkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = wikilinkRegex.exec(note.content)) !== null) {
      const targetTitle = linkMatch[1].trim().toLowerCase();
      // Look up target note
      for (const [id, targetNote] of allNotesMap.entries()) {
        if ((targetNote.title || '').trim().toLowerCase() === targetTitle) {
          const isTargetInScope = config.primaryNoteIds.includes(id);
          const isTargetPrivate = (targetNote as any).isLocked ||
            (targetNote.tags || []).some((t) => t.toLowerCase() === 'private' || t.toLowerCase() === 'confidential');

          if (isTargetPrivate && !isTargetInScope) {
            findings.push({
              id: `finding-rel-${id}`,
              noteId: note.id,
              noteTitle: note.title,
              type: 'unselected-relation',
              severity: 'warning',
              description: `Contains reference to private note "${targetNote.title}" which is outside export scope`,
              snippet: linkMatch[0],
              autoRemediated: true,
            });
          }
          break;
        }
      }
    }
  }

  return findings;
}

/**
 * Redacts or masks secrets from markdown content safely.
 */
export function redactSecretsFromMarkdown(content: string): string {
  if (!content) return '';
  let cleaned = content;

  for (const rule of SECRET_PATTERNS) {
    cleaned = cleaned.replace(rule.pattern, (match) => {
      if (rule.type === 'credit-card') {
        const digits = match.replace(/\D/g, '');
        return `•••• •••• •••• ${digits.slice(-4)}`;
      }
      if (rule.type === 'ssn') {
        return `•••-••-••••`;
      }
      if (rule.type === 'api-key' || rule.type === 'secret-token') {
        return `[REDACTED_${rule.type.toUpperCase().replace(/-/g, '_')}]`;
      }
      return `[REDACTED]`;
    });
  }

  return cleaned;
}
