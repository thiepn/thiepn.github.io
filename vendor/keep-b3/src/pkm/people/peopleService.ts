/**
 * Phase P48 — People, Contacts & Relationship Knowledge Service
 * 
 * Manages the derived in-memory index of canonical Person, Organization, and Interaction notes.
 * Enforces pure canonical storage (no secondary database), zero surveillance telemetry,
 * and immediate memory clearing upon vault lock.
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import {
  PersonRecord,
  OrganizationRecord,
  InteractionRecord,
  InteractionType,
  PersonDuplicateCandidate,
  MergePlan,
} from './peopleTypes';
import { parseFrontmatterAST, updateFrontmatter } from '../properties/frontmatterEngine';
import { parseRelationReferences } from '../collections/relationEngine';
import {
  parseContactEmails,
  parseContactPhones,
  parseContactAddresses,
  resolveDisplayName,
} from './contactNormalizer';
import { parseBirthday } from './birthdayUtils';
import { extractTasksFromNote } from '../tasks/taskParser';
import { parseTaskTemporalMetadata } from '../temporal/taskTemporalParser';
import { parseCanonicalDate } from '../temporal/dateUtils';
import { findDuplicateCandidates } from './peopleDuplicateEngine';
import { executeMergePeople, MergeResult } from './peopleMergeEngine';
import { buildPersonTimeline } from './peopleTimelineEngine';

export class PeopleService {
  private people: PersonRecord[] = [];
  private peopleById: Map<string, PersonRecord> = new Map();
  private organizations: OrganizationRecord[] = [];
  private organizationsById: Map<string, OrganizationRecord> = new Map();
  private interactions: InteractionRecord[] = [];
  private isLocked = false;
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('PeopleService listener error:', err);
      }
    });
  }

  /**
   * Immediately clears in-memory state on vault lock
   */
  public lock(): void {
    this.isLocked = true;
    this.clear();
  }

  public unlock(): void {
    this.isLocked = false;
  }

  public clear(): void {
    this.people = [];
    this.peopleById.clear();
    this.organizations = [];
    this.organizationsById.clear();
    this.interactions = [];
    this.notify();
  }

  /**
   * Full rebuild from all vault notes and folders
   */
  public rebuild(allNotes: Note[], folders: Folder[] = []): void {
    if (this.isLocked) {
      this.clear();
      return;
    }

    const titleToNoteMap = new Map<string, Note>();
    const activeNotes = allNotes.filter((n) => !n.trashed);

    for (const note of activeNotes) {
      titleToNoteMap.set(note.title.trim().toLowerCase(), note);
    }

    const rawInteractions: InteractionRecord[] = [];
    const rawOrgs: OrganizationRecord[] = [];
    const rawPeopleNotes: Array<{ note: Note; ast: any }> = [];

    // 1. First Pass: Classify notes into Person, Organization, or Interaction
    for (const note of activeNotes) {
      if (!note.content) continue;
      const { ast } = parseFrontmatterAST(note.content);
      const props = ast.properties || {};
      const noteType = String(props.type || props.category || '').toLowerCase();
      const tags = (note.tags || []).map((t) => t.toLowerCase());

      const isInteraction =
        noteType === 'interaction' ||
        tags.includes('interaction') ||
        props['interaction-type'] !== undefined ||
        props.interactionType !== undefined;

      const isOrg =
        noteType === 'organization' ||
        noteType === 'company' ||
        tags.includes('organization') ||
        tags.includes('company');

      const isPerson =
        noteType === 'person' ||
        noteType === 'contact' ||
        tags.includes('person') ||
        tags.includes('contact') ||
        props['given-name'] !== undefined ||
        props.givenName !== undefined ||
        props.birthday !== undefined ||
        props.bday !== undefined;

      if (isInteraction) {
        const rawDate = props.date || props.dateTime || (note.createdAt ? note.createdAt.slice(0, 10) : '2026-09-07');
        const parsedDate = parseCanonicalDate(String(rawDate));
        const interType: InteractionType = (props['interaction-type'] || props.interactionType || 'meeting') as InteractionType;

        const participantRefs = parseRelationReferences(props.people || props.participants || props.with);
        const participantPersonIds: string[] = [];
        const participantTitles: string[] = [];

        for (const ref of participantRefs) {
          const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
          if (matched) {
            participantPersonIds.push(matched.id);
            participantTitles.push(matched.title);
          } else {
            participantTitles.push(ref);
          }
        }

        rawInteractions.push({
          id: note.id,
          title: note.title,
          date: parsedDate.dateOnly || '2026-09-07',
          time: parsedDate.time || (props.time ? String(props.time) : undefined),
          interactionType: interType,
          participantPersonIds,
          participantTitles,
          location: props.location ? String(props.location) : undefined,
          summary: props.summary ? String(props.summary) : undefined,
          followUpDate: props['follow-up-date'] || props.followUpDate ? String(props['follow-up-date'] || props.followUpDate) : undefined,
          tags: note.tags || [],
          isTrashed: false,
        });
      } else if (isOrg) {
        rawOrgs.push({
          id: note.id,
          title: note.title,
          type: props['org-type'] || props.orgType ? String(props['org-type'] || props.orgType) : undefined,
          website: props.website || props.url ? String(props.website || props.url) : undefined,
          email: props.email ? String(props.email) : undefined,
          phone: props.phone ? String(props.phone) : undefined,
          location: props.location ? String(props.location) : undefined,
          memberPersonIds: [], // Populated in second pass
          projectIds: [],
          tags: note.tags || [],
          isTrashed: false,
        });
      } else if (isPerson) {
        rawPeopleNotes.push({ note, ast });
      }
    }

    // Sort interactions newest first for fast latest-contact lookups
    rawInteractions.sort((a, b) => b.date.localeCompare(a.date));
    this.interactions = rawInteractions;

    // 2. Second Pass: Build Person Records with derived metrics
    const peopleRecords: PersonRecord[] = [];
    const orgMembersMap = new Map<string, string[]>();

    for (const { note, ast } of rawPeopleNotes) {
      const props = ast.properties || {};

      const givenName = props['given-name'] || props.givenName ? String(props['given-name'] || props.givenName) : undefined;
      const familyName = props['family-name'] || props.familyName ? String(props['family-name'] || props.familyName) : undefined;
      const middleName = props['middle-name'] || props.middleName ? String(props['middle-name'] || props.middleName) : undefined;
      const prefix = props.prefix ? String(props.prefix) : undefined;
      const suffix = props.suffix ? String(props.suffix) : undefined;
      const nickname = props.nickname ? String(props.nickname) : undefined;
      const explicitDisplayName = props['display-name'] || props.displayName ? String(props['display-name'] || props.displayName) : undefined;

      const { displayName, sortName } = resolveDisplayName({
        displayName: explicitDisplayName,
        givenName,
        familyName,
        middleName,
        prefix,
        suffix,
        nickname,
        noteTitle: note.title,
      });

      // Aliases
      const aliasesSet = new Set<string>();
      const rawAliases = props.aliases || props.alias;
      if (Array.isArray(rawAliases)) rawAliases.forEach((a) => aliasesSet.add(String(a)));
      else if (typeof rawAliases === 'string') aliasesSet.add(rawAliases);

      // Contact info
      const emails = parseContactEmails(props.email || props.emails);
      const phones = parseContactPhones(props.phone || props.phones);
      const addresses = parseContactAddresses(props.address || props.addresses);
      const birthday = parseBirthday(props.birthday || props.bday);

      // Websites
      const websites: string[] = [];
      const rawWebsites = props.website || props.websites || props.url || props.urls;
      if (Array.isArray(rawWebsites)) {
        rawWebsites.forEach((w) => typeof w === 'string' && websites.push(w.trim()));
      } else if (typeof rawWebsites === 'string' && rawWebsites.trim()) {
        websites.push(rawWebsites.trim());
      }

      // Organizations
      const orgRefs = parseRelationReferences(props.organization || props.org || props.company);
      const organizationIds: string[] = [];
      const organizationTitles: string[] = [];

      for (const ref of orgRefs) {
        const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matched) {
          organizationIds.push(matched.id);
          organizationTitles.push(matched.title);
          // Inverse relation
          const members = orgMembersMap.get(matched.id) || [];
          members.push(note.id);
          orgMembersMap.set(matched.id, members);
        } else {
          organizationTitles.push(ref);
        }
      }

      // Photo
      const photoUrl = props.photo || props.avatar || props.image ? String(props.photo || props.avatar || props.image) : undefined;

      // Derived: Latest interaction
      const personTitleLower = note.title.trim().toLowerCase();
      let lastContactDate: string | undefined;
      let lastInteractionId: string | undefined;
      let interactionCount = 0;

      for (const inter of rawInteractions) {
        const isParticipant =
          inter.participantPersonIds.includes(note.id) ||
          inter.participantTitles.some((t) => t.toLowerCase() === personTitleLower);

        if (isParticipant) {
          interactionCount++;
          if (!lastContactDate) {
            lastContactDate = inter.date;
            lastInteractionId = inter.id;
          }
        }
      }

      // Derived: Next follow-up (from note's own tasks or explicit property)
      let nextFollowUpDate: string | undefined = props['next-follow-up'] || props.nextFollowUp ? String(props['next-follow-up'] || props.nextFollowUp) : undefined;
      let nextFollowUpSnippet: string | undefined;
      let openFollowUpTasksCount = 0;

      const tasks = extractTasksFromNote(note);
      for (const t of tasks) {
        if (!t.completed) {
          openFollowUpTasksCount++;
          const meta = parseTaskTemporalMetadata(t.rawLine || t.text);
          const taskDue = meta.dueDate || meta.scheduledDate;
          if (taskDue) {
            if (!nextFollowUpDate || taskDue < nextFollowUpDate) {
              nextFollowUpDate = taskDue;
              nextFollowUpSnippet = meta.cleanText || t.text;
            }
          }
        }
      }

      peopleRecords.push({
        id: note.id,
        noteTitle: note.title,
        displayName,
        sortName,
        givenName,
        familyName,
        middleName,
        prefix,
        suffix,
        nickname,
        aliases: Array.from(aliasesSet),
        emails,
        phones,
        websites,
        addresses,
        birthday,
        organizationIds,
        organizationTitles,
        role: props.role || props.title ? String(props.role || props.title) : undefined,
        photoUrl,
        lastContactDate,
        lastInteractionId,
        interactionCount,
        nextFollowUpDate,
        nextFollowUpSnippet,
        openFollowUpTasksCount,
        status: props.status ? String(props.status) : 'active',
        tags: note.tags || [],
        folderId: note.folderId,
        isTrashed: false,
        updatedAt: note.updatedAt || new Date().toISOString(),
        createdAt: note.createdAt || new Date().toISOString(),
      });
    }

    // Populate organization members
    for (const org of rawOrgs) {
      org.memberPersonIds = orgMembersMap.get(org.id) || [];
    }

    // Sort people by sortName ascending
    peopleRecords.sort((a, b) => a.sortName.localeCompare(b.sortName));

    this.people = peopleRecords;
    this.peopleById = new Map(peopleRecords.map((p) => [p.id, p]));
    this.organizations = rawOrgs;
    this.organizationsById = new Map(rawOrgs.map((o) => [o.id, o]));

    this.notify();
  }

  public getPeople(): PersonRecord[] {
    return this.people;
  }

  public getPersonById(id: string): PersonRecord | undefined {
    return this.peopleById.get(id);
  }

  public getOrganizations(): OrganizationRecord[] {
    return this.organizations;
  }

  public getInteractions(): InteractionRecord[] {
    return this.interactions;
  }

  public getUpcomingBirthdays(daysAhead = 30): Array<{ person: PersonRecord; birthday: NonNullable<PersonRecord['birthday']> }> {
    return this.people
      .filter((p) => p.birthday !== undefined && p.birthday.daysUntilNext <= daysAhead)
      .map((p) => ({ person: p, birthday: p.birthday! }))
      .sort((a, b) => a.birthday.daysUntilNext - b.birthday.daysUntilNext);
  }

  public getFollowUpQueue(): PersonRecord[] {
    return this.people
      .filter((p) => p.nextFollowUpDate !== undefined || p.openFollowUpTasksCount > 0)
      .sort((a, b) => {
        const dateA = a.nextFollowUpDate || '9999-99-99';
        const dateB = b.nextFollowUpDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      });
  }

  public findDuplicates(): PersonDuplicateCandidate[] {
    return findDuplicateCandidates(this.people);
  }

  public getPersonTimeline(personId: string, allNotes: Note[], filterType?: 'all' | 'interactions' | 'tasks' | 'meetings' | 'notes') {
    const person = this.peopleById.get(personId);
    if (!person) return [];
    return buildPersonTimeline({
      person,
      allNotes,
      interactions: this.interactions,
      filterType,
    });
  }

  /**
   * Helper to create a new canonical Person note
   */
  public generatePersonNoteContent(data: {
    givenName?: string;
    familyName?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    organization?: string;
    role?: string;
    birthday?: string;
    website?: string;
    location?: string;
    bodyNotes?: string;
  }): { title: string; content: string; tags: string[] } {
    const title = (data.displayName || `${data.givenName || ''} ${data.familyName || ''}`.trim() || 'New Contact').trim();
    
    const props: Record<string, any> = {
      type: 'person',
    };

    if (data.givenName) props['given-name'] = data.givenName;
    if (data.familyName) props['family-name'] = data.familyName;
    if (data.email) props.email = [data.email];
    if (data.phone) props.phone = [data.phone];
    if (data.organization) props.organization = [`[[${data.organization}]]`];
    if (data.role) props.role = data.role;
    if (data.birthday) props.birthday = data.birthday;
    if (data.website) props.website = data.website;
    if (data.location) props.location = data.location;
    props.tags = ['person'];

    const body = data.bodyNotes
      ? data.bodyNotes
      : `## Background & Bio\n\n\n\n## Follow-ups & Notes\n- [ ] Initial touchpoint`;

    const content = updateFrontmatter(body, props);
    return { title, content, tags: ['person'] };
  }

  /**
   * Helper to create a new canonical Interaction note
   */
  public generateInteractionNoteContent(data: {
    title?: string;
    interactionType: InteractionType;
    date: string;
    time?: string;
    participantTitles: string[];
    summary?: string;
    followUpTaskText?: string;
    followUpDueDate?: string;
  }): { title: string; content: string; tags: string[] } {
    const defaultTitle = data.title || `${data.interactionType.toUpperCase()} with ${data.participantTitles.join(', ')} - ${data.date}`;
    
    const props: Record<string, any> = {
      type: 'interaction',
      'interaction-type': data.interactionType,
      date: data.date,
      people: data.participantTitles.map((t) => `[[${t}]]`),
      tags: ['interaction'],
    };

    if (data.time) props.time = data.time;

    let body = `## Notes & Discussion\n\n${data.summary || ''}\n\n## Action Items\n`;
    if (data.followUpTaskText) {
      const dueToken = data.followUpDueDate ? ` 📅 ${data.followUpDueDate}` : '';
      body += `- [ ] ${data.followUpTaskText}${dueToken}\n`;
    }

    const content = updateFrontmatter(body, props);
    return { title: defaultTitle, content, tags: ['interaction'] };
  }
}

export const peopleService = new PeopleService();
export const getPeople = (): PersonRecord[] => peopleService.getPeople();
export const getPersonById = (id: string): PersonRecord | undefined => peopleService.getPersonById(id);
