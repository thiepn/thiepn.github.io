/**
 * V2.15 Declarative Template Engine (V2 Refined)
 * 
 * Purpose:
 *   Speed up resource creation with prefilled properties, structure, and relations.
 * 
 * Rules:
 *   - Declarative text & placeholder substitution ONLY
 *   - ZERO code execution, zero JavaScript eval, zero expressions
 *   - Supported variables:
 *       {{Today}} -> YYYY-MM-DD
 *       {{Time}} -> HH:MM
 *       {{CurrentContext}} -> Active Context Name
 *       {{CurrentProject}} -> Active Project Name
 *   - Prefills canonical Relations safely
 *   - Template updates NEVER mutate already-created resources
 */

export interface ResourceTemplateV2 {
  id: string;
  name: string;
  targetType: 'note' | 'project' | 'task' | 'person' | 'decision' | 'review';
  description: string;
  titlePattern: string;
  defaultTags: string[];
  bodyTemplate: string;
  defaultRelations?: {
    relationType: string;
    targetPlaceholder?: string;
  }[];
  isBuiltin?: boolean;
}

export const BUILTIN_V2_15_TEMPLATES: ResourceTemplateV2[] = [
  {
    id: 'tmpl-meeting',
    name: 'Meeting / Discussion Note',
    targetType: 'note',
    description: 'Structured meeting template with agenda, discussion points, action items, and context relation.',
    titlePattern: 'Meeting: {{Today}} - Discussion',
    defaultTags: ['meeting', 'work'],
    bodyTemplate: `# Meeting: {{Today}}
**Context / Project:** {{CurrentContext}}
**Date:** {{Today}} {{Time}}

## Agenda
- [ ] Topic 1
- [ ] Topic 2

## Discussion Notes
- Key points discussed here.

## Action Items
- [ ] Task 1
- [ ] Task 2
`,
    isBuiltin: true,
  },
  {
    id: 'tmpl-decision',
    name: 'Architecture / Life Decision Log',
    targetType: 'decision',
    description: 'Structured decision record covering context, options, criteria, and chosen outcome.',
    titlePattern: 'Decision: {{Today}} - [Topic]',
    defaultTags: ['decision', 'architecture'],
    bodyTemplate: `# Decision Record
**Date:** {{Today}}
**Context:** {{CurrentContext}}
**Status:** Decided

## Problem Statement
What challenge or opportunity are we addressing?

## Options Considered
1. Option A: Pros and Cons
2. Option B: Pros and Cons

## Decision & Rationale
Why was this choice made?

## Consequences & Review Date
Expected impact and follow-up review trigger.
`,
    isBuiltin: true,
  },
  {
    id: 'tmpl-project-brief',
    name: 'Project Kickoff Brief',
    targetType: 'project',
    description: 'Standard project charter with objectives, milestones, stakeholders, and success criteria.',
    titlePattern: 'Project: [Project Name]',
    defaultTags: ['project', 'active'],
    bodyTemplate: `# Project Brief: [Project Name]
**Start Date:** {{Today}}
**Target Completion:** 

## Objective
Primary outcome of this initiative.

## Milestones
- [ ] Milestone 1 (Week 1)
- [ ] Milestone 2 (Week 3)

## Key Stakeholders & Relations
- Related People: 
- Supporting Notes: 
`,
    isBuiltin: true,
  },
];

export class DeclarativeTemplateEngineV2 {
  private static instance: DeclarativeTemplateEngineV2 | null = null;
  private templates: Map<string, ResourceTemplateV2> = new Map();

  private constructor() {
    for (const t of BUILTIN_V2_15_TEMPLATES) {
      this.templates.set(t.id, t);
    }
  }

  public static getInstance(): DeclarativeTemplateEngineV2 {
    if (!DeclarativeTemplateEngineV2.instance) {
      DeclarativeTemplateEngineV2.instance = new DeclarativeTemplateEngineV2();
    }
    return DeclarativeTemplateEngineV2.instance;
  }

  public getAllTemplates(): ResourceTemplateV2[] {
    return Array.from(this.templates.values());
  }

  public getTemplate(id: string): ResourceTemplateV2 | undefined {
    return this.templates.get(id);
  }

  public saveTemplate(template: ResourceTemplateV2): void {
    this.templates.set(template.id, template);
  }

  public deleteTemplate(id: string): boolean {
    const t = this.templates.get(id);
    if (t && !t.isBuiltin) {
      return this.templates.delete(id);
    }
    return false;
  }

  /**
   * Safe declarative substitution without eval or arbitrary code
   */
  public instantiateTemplate(
    templateId: string,
    contextValues: {
      currentContextName?: string;
      currentProjectName?: string;
      dateOverride?: Date;
    } = {}
  ): { title: string; body: string; tags: string[] } | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const now = contextValues.dateOverride || new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 5);
    const contextName = contextValues.currentContextName || 'General';
    const projectName = contextValues.currentProjectName || 'None';

    const substitute = (raw: string): string => {
      return raw
        .replace(/\{\{Today\}\}/g, todayStr)
        .replace(/\{\{Time\}\}/g, timeStr)
        .replace(/\{\{CurrentContext\}\}/g, contextName)
        .replace(/\{\{CurrentProject\}\}/g, projectName);
    };

    return {
      title: substitute(template.titlePattern),
      body: substitute(template.bodyTemplate),
      tags: [...template.defaultTags],
    };
  }
}

export const declarativeTemplateEngineV2 = DeclarativeTemplateEngineV2.getInstance();
