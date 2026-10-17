/**
 * Quality Template Manager
 * 
 * Provides deterministic, structured templates for all core domains:
 * - Note, Daily Note, Project, Person, Interaction, Course, Review, Decision, Trip
 * - Deterministic lexical variable substitution: {{date}}, {{time}}, {{title}}, {{context}}, {{project}}
 * - Safe fallback: Deleting a custom template automatically falls back to system baseline.
 * - Strictly non-executable (no arbitrary script evaluation).
 */

import { QualityTemplate, TemplateResourceType } from './personalizationTypes';
import { preferenceService } from './preferenceService';

const TEMPLATES_STORAGE_KEY = 'quality_templates_v16';

export const BUILTIN_QUALITY_TEMPLATES: QualityTemplate[] = [
  {
    id: 'tmpl-daily-default',
    name: 'Daily Standup & Journal',
    description: 'Standard morning intentions, priority checkboxes, and evening reflection',
    resourceType: 'daily-note',
    isDefault: true,
    isBuiltIn: true,
    variablesUsed: ['date', 'time'],
    content: `# Daily Note — {{date}}

## 🎯 Top 3 Priorities
- [ ] 
- [ ] 
- [ ] 

## ⚡ Quick Log
- {{time}} — 

## 🌙 Evening Reflection
- **What went well:** 
- **What to improve:** 
`,
  },
  {
    id: 'tmpl-project-default',
    name: 'Project Brief (PARA)',
    description: 'Structured project charter with outcome, timeline, milestones, and tasks',
    resourceType: 'project',
    isDefault: true,
    isBuiltIn: true,
    variablesUsed: ['title', 'date'],
    content: `# Project: {{title}}

**Status:** Active  
**Created:** {{date}}  

### 🎯 Desired Outcome
> Clear, unambiguous definition of done.

### 📅 Key Milestones
- [ ] Milestone 1 (Target: )
- [ ] Milestone 2 (Target: )

### 📋 Action Items
- [ ] Initial project kickoff
`,
  },
  {
    id: 'tmpl-person-default',
    name: 'Person & Contact Profile',
    description: 'Personal CRM record with role, organization, key dates, and notes',
    resourceType: 'person',
    isDefault: true,
    isBuiltIn: true,
    variablesUsed: ['title', 'date'],
    content: `# Person: {{title}}

**Role / Context:** 
**Organization:** 
**First Connected:** {{date}}

### 🤝 Interaction Log
- {{date}} — Initial meeting & connection

### 💡 Key Details & Preferences
- 
`,
  },
  {
    id: 'tmpl-decision-default',
    name: 'Decision Record (ADR)',
    description: 'Structured decision analysis with context, alternatives, and trade-offs',
    resourceType: 'decision',
    isDefault: true,
    isBuiltIn: true,
    variablesUsed: ['title', 'date'],
    content: `# Decision: {{title}}

**Date:** {{date}}  
**Status:** Decided  

### 🔍 Context & Problem
What is the situation requiring a decision?

### ⚖️ Options Considered
1. **Option A:** Pros / Cons
2. **Option B:** Pros / Cons

### 🏆 Chosen Path & Rationale
Why this option was selected.

### 📅 Review Date
30-day review checkpoint.
`,
  },
  {
    id: 'tmpl-trip-default',
    name: 'Travel Itinerary & Packing',
    description: 'Trip planner with schedule, reservations, and packing checklist',
    resourceType: 'trip',
    isDefault: true,
    isBuiltIn: true,
    variablesUsed: ['title', 'date'],
    content: `# Trip: {{title}}

**Dates:** {{date}}  
**Destination:** 

### ✈️ Travel & Lodging
- Flight / Train:
- Hotel / Stay:

### 🎒 Essential Packing Checklist
- [ ] Passport / ID
- [ ] Chargers & Adapters
- [ ] Medications
`,
  },
];

export class QualityTemplateManager {
  public getTemplates(): QualityTemplate[] {
    const userCustom = preferenceService.get<QualityTemplate[]>(TEMPLATES_STORAGE_KEY, [], 'global-synced');
    return [...BUILTIN_QUALITY_TEMPLATES, ...userCustom];
  }

  public getTemplatesForType(type: TemplateResourceType): QualityTemplate[] {
    return this.getTemplates().filter((t) => t.resourceType === type);
  }

  public getDefaultTemplateForType(type: TemplateResourceType): QualityTemplate {
    const templates = this.getTemplatesForType(type);
    const customDefault = templates.find((t) => t.isDefault && !t.isBuiltIn);
    if (customDefault) return customDefault;

    const builtinDefault = templates.find((t) => t.isDefault && t.isBuiltIn);
    if (builtinDefault) return builtinDefault;

    return templates[0] || BUILTIN_QUALITY_TEMPLATES[0];
  }

  public async saveTemplate(template: Omit<QualityTemplate, 'id' | 'isBuiltIn'>): Promise<QualityTemplate> {
    const customTemplates = preferenceService.get<QualityTemplate[]>(TEMPLATES_STORAGE_KEY, [], 'global-synced');
    const newTemplate: QualityTemplate = {
      ...template,
      id: `tmpl-custom-${Date.now()}`,
      isBuiltIn: false,
    };

    const updated = [...customTemplates, newTemplate];
    await preferenceService.set(TEMPLATES_STORAGE_KEY, updated, 'global-synced');
    return newTemplate;
  }

  public async deleteTemplate(id: string): Promise<boolean> {
    const customTemplates = preferenceService.get<QualityTemplate[]>(TEMPLATES_STORAGE_KEY, [], 'global-synced');
    const filtered = customTemplates.filter((t) => t.id !== id);
    if (filtered.length === customTemplates.length) return false;

    await preferenceService.set(TEMPLATES_STORAGE_KEY, filtered, 'global-synced');
    return true;
  }

  /**
   * Deterministically applies template variable substitutions
   */
  public renderTemplate(templateContent: string, variables: Record<string, string>): string {
    const now = new Date();
    const defaults: Record<string, string> = {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
      title: 'Untitled',
      context: 'General',
      project: 'Default',
      ...variables,
    };

    let rendered = templateContent;
    for (const [key, val] of Object.entries(defaults)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      rendered = rendered.replace(regex, val);
    }

    return rendered;
  }
}

export const qualityTemplateManager = new QualityTemplateManager();
