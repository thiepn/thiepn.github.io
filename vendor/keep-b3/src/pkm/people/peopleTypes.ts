/**
 * Phase P48 — People, Contacts & Relationship Knowledge System Types
 * 
 * Core principle: People and Interactions are represented through canonical
 * Markdown notes, properties, Relations, and ordinary portable data—not through
 * a separate proprietary CRM database.
 */

import { Note } from '../../types';

export type InteractionType =
  | 'meeting'
  | 'call'
  | 'message'
  | 'email'
  | 'conversation'
  | 'introduction'
  | 'appointment'
  | 'follow-up'
  | 'social'
  | 'other';

export interface ContactEmail {
  label?: string; // e.g. "work", "personal"
  address: string;
}

export interface ContactPhone {
  label?: string; // e.g. "mobile", "work", "home"
  number: string;
  normalized?: string;
}

export interface ContactAddress {
  label?: string; // e.g. "work", "home"
  formatted: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface BirthdayValue {
  raw: string; // "1815-12-10", "--12-10", or "12-10"
  hasYear: boolean;
  year?: number;
  month: number; // 1-12
  day: number; // 1-31
  formattedDisplay: string; // e.g. "December 10, 1815" or "December 10"
  age?: number; // Only present if hasYear is true
  nextOccurrenceDate: string; // YYYY-MM-DD for current/upcoming year
  daysUntilNext: number; // 0 for today
}

export interface PersonRecord {
  id: string; // Canonical Note ID
  noteTitle: string;
  displayName: string;
  sortName: string;
  givenName?: string;
  familyName?: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  nickname?: string;
  aliases: string[];
  
  // Structured contact info
  emails: ContactEmail[];
  phones: ContactPhone[];
  websites: string[];
  addresses: ContactAddress[];
  birthday?: BirthdayValue;
  
  // Organization and role
  organizationIds: string[]; // Note IDs of related organizations
  organizationTitles: string[]; // Resolved titles
  role?: string;
  
  // Media / Photo
  photoUrl?: string; // Data URL or attachment path from P26 Media
  photoAttachmentId?: string;
  
  // Derived relationship & temporal metrics (never duplicated into canonical notes)
  lastContactDate?: string; // YYYY-MM-DD from latest interaction
  lastInteractionId?: string;
  interactionCount: number;
  nextFollowUpDate?: string; // From nearest open task or property
  nextFollowUpSnippet?: string;
  openFollowUpTasksCount: number;
  
  // Status & tags
  status?: string; // e.g. "active", "occasional", "archived"
  tags: string[];
  folderId: string | null;
  isTrashed: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface OrganizationRecord {
  id: string; // Canonical Note ID
  title: string;
  type?: string; // e.g. "company", "nonprofit", "university", "church", "team", "club"
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  memberPersonIds: string[]; // Derived inverse relation
  projectIds: string[];
  tags: string[];
  isTrashed: boolean;
}

export interface InteractionRecord {
  id: string; // Canonical Note ID
  title: string;
  date: string; // YYYY-MM-DD or ISO
  time?: string; // HH:mm
  interactionType: InteractionType;
  participantPersonIds: string[]; // Note IDs of involved people
  participantTitles: string[];
  location?: string;
  summary?: string;
  followUpTaskId?: string;
  followUpDate?: string;
  tags: string[];
  isTrashed: boolean;
}

export interface PersonTimelineItem {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: 'interaction' | 'task' | 'meeting' | 'note-reference' | 'project';
  title: string;
  snippet?: string;
  interactionType?: InteractionType;
  resourceId: string; // Note ID or Task ID
  resourceType: 'note' | 'task';
  completed?: boolean;
  participants?: Array<{ id: string; name: string }>;
}

export type DuplicateMatchReason =
  | 'exact_email'
  | 'exact_phone'
  | 'exact_name_and_org'
  | 'exact_name_and_role'
  | 'strong_alias_match';

export interface PersonDuplicateCandidate {
  id: string; // Candidate pair ID
  personA: PersonRecord;
  personB: PersonRecord;
  confidence: 'strong' | 'possible';
  reasons: DuplicateMatchReason[];
  details: string[];
}

export interface MergeFieldChoice {
  field: 'displayName' | 'givenName' | 'familyName' | 'role' | 'birthday' | 'photo' | 'status';
  winner: 'personA' | 'personB' | 'custom';
  customValue?: any;
}

export interface MergePlan {
  survivorId: string;
  duplicateId: string;
  survivorName: string;
  duplicateName: string;
  preserveDuplicateNameAsAlias: boolean;
  fieldChoices: MergeFieldChoice[];
  mergeEmails: boolean; // Union of emails
  mergePhones: boolean; // Union of phones
  mergeWebsites: boolean; // Union of websites
  mergeAddresses: boolean; // Union of addresses
  mergeTags: boolean; // Union of tags
  bodyMergeStrategy: 'append_duplicate_section' | 'keep_survivor_only' | 'custom';
  customMergedBody?: string;
}

export interface VCardContact {
  fn?: string; // Formatted Name
  n?: {
    family?: string;
    given?: string;
    middle?: string;
    prefix?: string;
    suffix?: string;
  };
  nickname?: string;
  emails: ContactEmail[];
  phones: ContactPhone[];
  org?: string;
  title?: string;
  bday?: string;
  urls: string[];
  addresses: ContactAddress[];
  note?: string;
  photoBase64?: string;
  photoMimeType?: string;
  categories?: string[];
  rawFields?: Record<string, string[]>;
}

export interface VCardImportPreview {
  contacts: VCardContact[];
  totalParsed: number;
  newCount: number;
  duplicateCandidates: Array<{
    vcardContact: VCardContact;
    matchedPerson: PersonRecord;
    reason: string;
  }>;
  warnings: string[];
}

export interface NativeContactSelectResult {
  displayName?: string;
  givenName?: string;
  familyName?: string;
  emails: string[];
  phones: string[];
  organization?: string;
  role?: string;
  birthday?: string;
  addresses?: string[];
  photoDataUrl?: string;
}
