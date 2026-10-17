/**
 * P40 — Migration Source Auto-Detector
 * Inspects directory layout, file extensions, and structural signatures to detect source format.
 */

import { DetectionResult, MigrationSourceType, RawImportFile } from './migrationTypes';

export async function detectMigrationSource(files: RawImportFile[]): Promise<DetectionResult> {
  if (!files || files.length === 0) {
    return {
      sourceType: 'generic-markdown',
      confidence: 0.1,
      reason: 'No files provided; defaulting to Generic Markdown.',
      detectedFeatures: [],
    };
  }

  const paths = files.map((f) => f.path.toLowerCase());
  const detectedFeatures: string[] = [];

  // 1. Evernote ENEX check
  const enexFiles = files.filter((f) => f.name.toLowerCase().endsWith('.enex'));
  if (enexFiles.length > 0) {
    detectedFeatures.push(`Found ${enexFiles.length} Evernote .enex archive(s)`);
    return {
      sourceType: 'evernote-enex',
      confidence: 0.99,
      reason: `Evernote archive detected (${enexFiles.length} .enex file${enexFiles.length > 1 ? 's' : ''})`,
      detectedFeatures,
      suggestedRootTitle: enexFiles[0].name.replace(/\.enex$/i, ''),
    };
  }

  // 2. BibTeX References check
  const bibFiles = files.filter((f) => f.name.toLowerCase().endsWith('.bib'));
  if (bibFiles.length > 0 && files.length <= bibFiles.length + 10) {
    detectedFeatures.push(`Found ${bibFiles.length} .bib BibTeX file(s)`);
    return {
      sourceType: 'bibtex-reference',
      confidence: 0.95,
      reason: 'BibTeX bibliography reference library detected',
      detectedFeatures,
      suggestedRootTitle: 'References',
    };
  }

  // 3. Obsidian Vault check
  let obsidianScore = 0;
  const hasObsidianFolder = paths.some((p) => p.includes('.obsidian/'));
  const hasCanvasFiles = paths.some((p) => p.endsWith('.canvas'));
  const mdFiles = files.filter((f) => f.name.toLowerCase().endsWith('.md') || f.name.toLowerCase().endsWith('.markdown'));

  if (hasObsidianFolder) {
    obsidianScore += 0.8;
    detectedFeatures.push('.obsidian configuration directory found');
  }
  if (hasCanvasFiles) {
    obsidianScore += 0.4;
    detectedFeatures.push('Obsidian .canvas whiteboard files found');
  }

  // Quick sampling for Wikilinks and callouts in MD
  if (mdFiles.length > 0 && obsidianScore === 0) {
    const sampleCount = Math.min(mdFiles.length, 5);
    let wikilinkHits = 0;
    for (let i = 0; i < sampleCount; i++) {
      try {
        const text = await mdFiles[i].readAsText();
        if (/\[\[[^\]]+\]\]/.test(text)) wikilinkHits++;
        if (/>\s*\[!(NOTE|TIP|WARNING|INFO|QUOTE)\]/i.test(text)) {
          obsidianScore += 0.2;
          detectedFeatures.push('Obsidian callout syntax found');
        }
      } catch {
        // Ignore read error
      }
    }
    if (wikilinkHits > 0) {
      obsidianScore += 0.3;
      detectedFeatures.push('Wikilinks syntax detected');
    }
  }

  if (obsidianScore >= 0.7) {
    return {
      sourceType: 'obsidian',
      confidence: Math.min(1, obsidianScore),
      reason: 'Obsidian vault structure and syntax detected',
      detectedFeatures,
      suggestedRootTitle: 'Obsidian Vault',
    };
  }

  // 4. Notion Export check
  // Notion signature: page names with 32-char hex ID suffixes like "Title abc123def456.md" and matching subfolders
  let notionScore = 0;
  const notionIdRegex = /\s+[0-9a-f]{32}(\.md|\.csv|$)/i;
  const notionMatches = paths.filter((p) => notionIdRegex.test(p));
  const hasNotionCsv = paths.some((p) => p.endsWith('.csv') && notionIdRegex.test(p));

  if (notionMatches.length > 0) {
    const ratio = notionMatches.length / Math.max(1, files.length);
    if (ratio > 0.2 || notionMatches.length >= 3) {
      notionScore += 0.85;
      detectedFeatures.push(`Notion export IDs detected on ${notionMatches.length} files/folders`);
    }
  }
  if (hasNotionCsv) {
    notionScore += 0.3;
    detectedFeatures.push('Notion database CSV export detected');
  }

  if (notionScore >= 0.7) {
    return {
      sourceType: 'notion',
      confidence: Math.min(1, notionScore),
      reason: 'Notion export hierarchy and database structure detected',
      detectedFeatures,
      suggestedRootTitle: 'Notion Workspace',
    };
  }

  // 5. Joplin check
  // Joplin signature: notes have YAML-like trailing metadata headers or ids
  let joplinScore = 0;
  if (mdFiles.length > 0) {
    const sample = mdFiles[0];
    try {
      const text = await sample.readAsText();
      if (/id:\s*[a-f0-9]{32}/i.test(text) && /type_:\s*\d+/i.test(text)) {
        joplinScore += 0.9;
        detectedFeatures.push('Joplin internal resource/note metadata headers found');
      }
    } catch {}
  }
  if (joplinScore >= 0.8) {
    return {
      sourceType: 'joplin',
      confidence: joplinScore,
      reason: 'Joplin Markdown export format detected',
      detectedFeatures,
      suggestedRootTitle: 'Joplin Notes',
    };
  }

  // 6. Logseq check
  const hasLogseqFolder = paths.some((p) => p.includes('logseq/') || p.includes('journals/') || p.includes('pages/'));
  if (hasLogseqFolder) {
    detectedFeatures.push('Logseq pages/journals folder structure found');
    return {
      sourceType: 'logseq',
      confidence: 0.75,
      reason: 'Logseq graph structure detected',
      detectedFeatures,
      suggestedRootTitle: 'Logseq Graph',
    };
  }

  // Fallback: Generic Markdown
  detectedFeatures.push(`${mdFiles.length} Markdown notes detected`);
  return {
    sourceType: 'generic-markdown',
    confidence: 0.6,
    reason: `Standard Markdown directory structure (${mdFiles.length} notes, ${files.length} total files)`,
    detectedFeatures,
    suggestedRootTitle: 'Imported Notes',
  };
}
