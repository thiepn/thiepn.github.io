import { Note } from '../../types';
import { VaultIndex } from '../types';
import { MOCClusterSuggestion } from './intelligenceTypes';
import { tokenizeText, calculateIDF } from '../lexicalRelatedness';

export interface MOCDetectorOptions {
  minClusterSize?: number; // Default 5
  maxClusterSize?: number; // Default 30
  dismissedClusters?: string[];
}

/**
 * Checks if a note is an MOC or Knowledge Hub
 */
export function isNoteMOC(note: Note): boolean {
  if (note.trashed) return false;
  const titleLower = (note.title || '').toLowerCase();
  if (/\bmoc\b/i.test(titleLower) || /map of content/i.test(titleLower) || /topic hub/i.test(titleLower) || /index\b/i.test(titleLower)) {
    return true;
  }
  const content = note.content || '';
  if (/```moc/i.test(content) || /```query/i.test(content)) {
    return true;
  }
  return false;
}

/**
 * Detects cluster candidates for MOC creation
 */
export function detectMOCClusters(
  notes: Note[],
  vaultIndex?: VaultIndex,
  options: MOCDetectorOptions = {}
): MOCClusterSuggestion[] {
  const minSize = options.minClusterSize || 5;
  const maxSize = options.maxClusterSize || 30;
  const dismissedSet = new Set(options.dismissedClusters || []);
  const validNotes = notes.filter((n) => !n.trashed);

  const suggestions: MOCClusterSuggestion[] = [];

  // Find all existing MOCs in vault to avoid suggesting duplicate hubs
  const existingMocNotes = validNotes.filter(isNoteMOC);
  const existingMocTitles = new Set(existingMocNotes.map((n) => n.title.toLowerCase()));

  // 1. Tag-based Clusters
  const tagGroups = new Map<string, Note[]>();
  for (const n of validNotes) {
    for (const t of n.tags || []) {
      const clean = t.toLowerCase().replace(/^#/, '');
      if (!clean) continue;
      const list = tagGroups.get(clean) || [];
      list.push(n);
      tagGroups.set(clean, list);
    }
  }

  for (const [tag, tagNotes] of tagGroups.entries()) {
    if (tagNotes.length >= minSize && tagNotes.length <= maxSize) {
      const clusterId = `moc-tag-${tag}`;
      if (dismissedSet.has(clusterId)) continue;

      // Check if there is already an existing MOC for this tag
      const hasExistingHub = existingMocNotes.some(
        (m) =>
          m.title.toLowerCase().includes(tag) ||
          (m.content && (m.content.includes(`tag:${tag}`) || m.content.includes(`#${tag}`)))
      );

      const capitalizedTag = tag
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const suggestedTitle = `${capitalizedTag} MOC`;
      if (existingMocTitles.has(suggestedTitle.toLowerCase())) continue;

      suggestions.push({
        id: clusterId,
        suggestedTitle,
        memberNoteIds: tagNotes.map((n) => n.id),
        memberTitles: tagNotes.map((n) => n.title || 'Untitled'),
        coherenceScore: 0.9,
        clusterType: 'tag_based',
        queryFilter: { tag },
        dominantTags: [tag],
        dominantTerms: [tag],
        hasExistingHub,
        existingHubTitle: hasExistingHub ? existingMocNotes[0]?.title : undefined,
      });
    }
  }

  // 2. Folder-based Clusters
  const folderGroups = new Map<string, Note[]>();
  for (const n of validNotes) {
    if (n.folderId) {
      const list = folderGroups.get(n.folderId) || [];
      list.push(n);
      folderGroups.set(n.folderId, list);
    }
  }

  for (const [folderId, fNotes] of folderGroups.entries()) {
    if (fNotes.length >= minSize && fNotes.length <= maxSize) {
      const clusterId = `moc-folder-${folderId}`;
      if (dismissedSet.has(clusterId)) continue;

      const hasExistingHub = fNotes.some(isNoteMOC);
      const cleanFolderName = folderId
        .split('/')
        .pop() || folderId;
      const capitalized = cleanFolderName.charAt(0).toUpperCase() + cleanFolderName.slice(1);
      const suggestedTitle = `${capitalized} Index`;

      if (existingMocTitles.has(suggestedTitle.toLowerCase())) continue;

      suggestions.push({
        id: clusterId,
        suggestedTitle,
        memberNoteIds: fNotes.map((n) => n.id),
        memberTitles: fNotes.map((n) => n.title || 'Untitled'),
        coherenceScore: 0.85,
        clusterType: 'folder_based',
        queryFilter: { folder: folderId },
        dominantTags: [],
        dominantTerms: [cleanFolderName],
        hasExistingHub,
      });
    }
  }

  // Filter out clusters that already have well-established hubs
  const filtered = suggestions.filter((s) => !s.hasExistingHub);
  filtered.sort((a, b) => b.coherenceScore - a.coherenceScore);
  return filtered;
}

/**
 * Generates formatted Markdown content for an MOC note
 */
export function generateMOCContent(
  cluster: MOCClusterSuggestion,
  mode: 'living' | 'manual'
): string {
  if (mode === 'living' && cluster.queryFilter?.tag) {
    return `---
title: "${cluster.suggestedTitle}"
tags: ["moc", "${cluster.dominantTags[0] || 'topics'}"]
---

# ${cluster.suggestedTitle}

Map of Content for notes related to **${cluster.dominantTerms.join(', ')}**.

\`\`\`moc
tag:${cluster.queryFilter.tag}
sort:title
\`\`\`
`;
  }

  // Manual MOC with categorized or bulleted links
  const links = cluster.memberTitles.map((t) => `- [[${t}]]`).join('\n');
  return `---
title: "${cluster.suggestedTitle}"
tags: ["moc"]
---

# ${cluster.suggestedTitle}

Map of Content tracking ${cluster.memberTitles.length} notes in this cluster.

## Included Notes
${links}
`;
}
