/**
 * PKM V2.13 — People & Personal Relationship Memory Excellence Engine
 *
 * Implements thoughtful personal relationship memory without CRM sales bloat:
 * - Interaction logging (date, type, notes)
 * - Canonical Task follow-ups linked to Person
 * - Person Context (recent interactions, open follow-ups, shared projects/notes)
 * - Factual Attention on overdue/due follow-ups (zero relationship guilt scoring)
 * - Safe candidate duplicate matching with explicit user preview (never auto-merge)
 * - Privacy-conscious vCard export
 */

import { ResourceCore } from '../core/resource/resourceCore';
import { crossDomainRelationEngine } from './crossDomainRelationEngine';

export type InteractionType = 'meeting' | 'call' | 'message' | 'email' | 'event' | 'note';

export interface PersonInteraction {
  id: string;
  personId: string;
  timestamp: string;
  type: InteractionType;
  summary: string;
  location?: string;
  notes?: string;
}

export interface PersonFollowUpTask {
  id: string;
  personId: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface PersonProfile {
  id: string;
  name: string;
  importantContext?: string;
  email?: string;
  phone?: string;
  organization?: string;
  birthday?: string;
  tags?: string[];
  lastInteractionAt?: string;
}

export interface DuplicatePersonCandidate {
  personA: PersonProfile;
  personB: PersonProfile;
  matchReason: 'exact_email' | 'exact_phone' | 'normalized_name';
  confidence: number;
}

export class PeopleDomainExcellence {
  private people = new Map<string, PersonProfile>();
  private interactions = new Map<string, PersonInteraction[]>(); // personId -> interactions
  private followUps = new Map<string, PersonFollowUpTask[]>(); // personId -> tasks

  /**
   * Creates or updates a Person profile
   */
  public savePerson(profile: PersonProfile): PersonProfile {
    this.people.set(profile.id, { ...profile });
    if (!this.interactions.has(profile.id)) {
      this.interactions.set(profile.id, []);
    }
    if (!this.followUps.has(profile.id)) {
      this.followUps.set(profile.id, []);
    }
    return profile;
  }

  public getPerson(id: string): PersonProfile | undefined {
    return this.people.get(id);
  }

  public getAllPeople(): PersonProfile[] {
    return Array.from(this.people.values());
  }

  /**
   * Fast 3-field Interaction logging
   */
  public logInteraction(params: {
    personId: string;
    type: InteractionType;
    summary: string;
    timestamp?: string;
    notes?: string;
    location?: string;
  }): PersonInteraction {
    const interaction: PersonInteraction = {
      id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      personId: params.personId,
      timestamp: params.timestamp || new Date().toISOString(),
      type: params.type,
      summary: params.summary,
      notes: params.notes,
      location: params.location,
    };

    const list = this.interactions.get(params.personId) || [];
    list.unshift(interaction);
    this.interactions.set(params.personId, list);

    // Update person's lastInteractionAt
    const person = this.people.get(params.personId);
    if (person) {
      person.lastInteractionAt = interaction.timestamp;
    }

    return interaction;
  }

  public getInteractions(personId: string): PersonInteraction[] {
    return this.interactions.get(personId) || [];
  }

  /**
   * Adds a canonical Follow-up Task for a Person
   */
  public addFollowUpTask(params: {
    personId: string;
    title: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
  }): PersonFollowUpTask {
    const task: PersonFollowUpTask = {
      id: `task_followup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      personId: params.personId,
      title: params.title,
      dueDate: params.dueDate,
      completed: false,
      priority: params.priority || 'medium',
    };

    const list = this.followUps.get(params.personId) || [];
    list.push(task);
    this.followUps.set(params.personId, list);

    // Register canonical cross-domain relation
    crossDomainRelationEngine.addRelation({
      sourceId: task.id,
      sourceType: 'task',
      targetId: params.personId,
      targetType: 'person',
      relationType: 'task_assigned_to_person',
      label: `Follow-up for ${this.people.get(params.personId)?.name || 'Person'}`,
    });

    return task;
  }

  public getFollowUpTasks(personId: string): PersonFollowUpTask[] {
    return this.followUps.get(personId) || [];
  }

  public completeFollowUpTask(personId: string, taskId: string): boolean {
    const list = this.followUps.get(personId);
    if (!list) return false;
    const task = list.find((t) => t.id === taskId);
    if (!task) return false;
    task.completed = true;
    return true;
  }

  /**
   * Retrieves Person Context (Interactions, Follow-ups, and Connected Projects/Resources)
   */
  public getPersonContext(personId: string): {
    person: PersonProfile | undefined;
    recentInteractions: PersonInteraction[];
    openFollowUps: PersonFollowUpTask[];
    connectedRelations: ReturnType<typeof crossDomainRelationEngine.getConnectedResources>;
  } {
    const person = this.getPerson(personId);
    const recentInteractions = (this.interactions.get(personId) || []).slice(0, 5);
    const openFollowUps = (this.followUps.get(personId) || []).filter((t) => !t.completed);
    const connectedRelations = crossDomainRelationEngine.getConnectedResources(personId);

    return {
      person,
      recentInteractions,
      openFollowUps,
      connectedRelations,
    };
  }

  /**
   * Evaluates Factual Attention for People
   * STRICT: Only evaluates factual conditions (overdue tasks or due dates). Zero relationship guilt nags!
   */
  public evaluateAttention(todayDateOnly: string): Array<{
    personId: string;
    personName: string;
    reason: string;
    taskId?: string;
  }> {
    const attentionItems: Array<{
      personId: string;
      personName: string;
      reason: string;
      taskId?: string;
    }> = [];

    for (const [personId, tasks] of this.followUps.entries()) {
      const person = this.people.get(personId);
      if (!person) continue;

      for (const task of tasks) {
        if (!task.completed && task.dueDate && task.dueDate <= todayDateOnly) {
          attentionItems.push({
            personId,
            personName: person.name,
            reason: `Follow-up due: "${task.title}" (Due: ${task.dueDate})`,
            taskId: task.id,
          });
        }
      }
    }

    return attentionItems;
  }

  /**
   * Detects duplicate candidates for safe preview. NEVER auto-merges.
   */
  public findDuplicateCandidates(): DuplicatePersonCandidate[] {
    const all = Array.from(this.people.values());
    const candidates: DuplicatePersonCandidate[] = [];

    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];

        if (a.email && b.email && a.email.toLowerCase().trim() === b.email.toLowerCase().trim()) {
          candidates.push({ personA: a, personB: b, matchReason: 'exact_email', confidence: 1.0 });
          continue;
        }

        if (a.phone && b.phone && a.phone.replace(/\D/g, '') === b.phone.replace(/\D/g, '')) {
          candidates.push({ personA: a, personB: b, matchReason: 'exact_phone', confidence: 0.95 });
          continue;
        }

        const normA = a.name.toLowerCase().trim();
        const normB = b.name.toLowerCase().trim();
        if (normA.length > 3 && normA === normB) {
          candidates.push({ personA: a, personB: b, matchReason: 'normalized_name', confidence: 0.85 });
        }
      }
    }

    return candidates;
  }

  /**
   * Safe preview merge: Combines interaction histories, follow-ups, and notes.
   */
  public mergePeople(primaryId: string, secondaryId: string): PersonProfile | null {
    const primary = this.people.get(primaryId);
    const secondary = this.people.get(secondaryId);
    if (!primary || !secondary) return null;

    // Merge fields
    primary.email = primary.email || secondary.email;
    primary.phone = primary.phone || secondary.phone;
    primary.organization = primary.organization || secondary.organization;
    primary.importantContext = [primary.importantContext, secondary.importantContext].filter(Boolean).join('\n---\n');

    // Merge interactions
    const secInteractions = this.interactions.get(secondaryId) || [];
    secInteractions.forEach((i) => (i.personId = primaryId));
    const primInteractions = this.interactions.get(primaryId) || [];
    primInteractions.push(...secInteractions);
    primInteractions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    this.interactions.set(primaryId, primInteractions);
    this.interactions.delete(secondaryId);

    // Merge followups
    const secFollowups = this.followUps.get(secondaryId) || [];
    secFollowups.forEach((t) => (t.personId = primaryId));
    const primFollowups = this.followUps.get(primaryId) || [];
    primFollowups.push(...secFollowups);
    this.followUps.set(primaryId, primFollowups);
    this.followUps.delete(secondaryId);

    // Remove secondary person
    this.people.delete(secondaryId);
    return primary;
  }

  /**
   * Generates vCard 3.0 export string
   */
  public exportVCard(personId: string): string {
    const p = this.people.get(personId);
    if (!p) return '';

    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${p.name}`,
      p.email ? `EMAIL:${p.email}` : '',
      p.phone ? `TEL:${p.phone}` : '',
      p.organization ? `ORG:${p.organization}` : '',
      p.importantContext ? `NOTE:${p.importantContext.replace(/\n/g, '\\n')}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n');
  }

  public clear(): void {
    this.people.clear();
    this.interactions.clear();
    this.followUps.clear();
  }
}

export const peopleDomainExcellence = new PeopleDomainExcellence();
