/**
 * People & Relationship Workspace View for Phase P48
 * 
 * Central hub for browsing contacts, organizations, follow-up queues, upcoming birthdays,
 * duplicate candidates, and vCard interoperability.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  MessageSquare,
  Upload,
  Download,
  GitMerge,
  Smartphone,
  Building2,
  Calendar,
  CheckSquare,
  Cake,
  LayoutGrid,
  Table as TableIcon,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Filter,
  X,
} from 'lucide-react';
import { PersonRecord, PersonDuplicateCandidate } from '../peopleTypes';
import { peopleService } from '../peopleService';
import { Note, Folder, SavedSearch, AppSettings } from '../../../types';
import { PersonDetailInspector } from './PersonDetailInspector';
import { LogInteractionModal } from './LogInteractionModal';
import { MergePeopleModal } from './MergePeopleModal';
import { VCardImportModal } from './VCardImportModal';
import { VCardExportModal } from './VCardExportModal';
import { NativeContactPickerModal } from './NativeContactPickerModal';

interface PeopleWorkspaceViewProps {
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  settings: AppSettings;
  isVaultEncrypted?: boolean;
  onOpenNote: (noteId: string) => void;
  onCreateNote: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  onUpdateNote: (note: Note) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

type ViewTab = 'table' | 'gallery' | 'follow-ups' | 'birthdays' | 'organizations';

export const PeopleWorkspaceView: React.FC<PeopleWorkspaceViewProps> = ({
  notes,
  folders,
  savedSearches,
  settings,
  isVaultEncrypted,
  onOpenNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('table');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Modals state
  const [isLogInteractionOpen, setIsLogInteractionOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNativePickerOpen, setIsNativePickerOpen] = useState(false);
  const [activeMergeCandidate, setActiveMergeCandidate] = useState<PersonDuplicateCandidate | null>(null);
  const [isNewPersonModalOpen, setIsNewPersonModalOpen] = useState(false);

  // New Person quick form state
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newPersonOrg, setNewPersonOrg] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('');

  // Rebuild people service index when notes change
  useEffect(() => {
    peopleService.rebuild(notes, folders);
  }, [notes, folders]);

  const people = peopleService.getPeople();
  const organizations = peopleService.getOrganizations();
  const upcomingBirthdays = peopleService.getUpcomingBirthdays(45);
  const followUpQueue = peopleService.getFollowUpQueue();
  const duplicateCandidates = peopleService.findDuplicates();

  const selectedPerson = selectedPersonId
    ? people.find((p) => p.id === selectedPersonId) || null
    : null;

  // Filtered people
  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    const q = searchQuery.toLowerCase().trim();
    return people.filter((p) => {
      return (
        p.displayName.toLowerCase().includes(q) ||
        p.sortName.toLowerCase().includes(q) ||
        (p.role && p.role.toLowerCase().includes(q)) ||
        p.organizationTitles.some((org) => org.toLowerCase().includes(q)) ||
        p.emails.some((e) => e.address.toLowerCase().includes(q)) ||
        p.phones.some((phone) => phone.number.includes(q)) ||
        p.aliases.some((a) => a.toLowerCase().includes(q)) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [people, searchQuery]);

  const handleCreateNewPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    const generated = peopleService.generatePersonNoteContent({
      displayName: newPersonName.trim(),
      email: newPersonEmail.trim() || undefined,
      phone: newPersonPhone.trim() || undefined,
      organization: newPersonOrg.trim() || undefined,
      role: newPersonRole.trim() || undefined,
    });

    const newNote = await onCreateNote({
      title: generated.title,
      content: generated.content,
      tags: generated.tags,
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
    });

    setIsNewPersonModalOpen(false);
    setNewPersonName('');
    setNewPersonEmail('');
    setNewPersonPhone('');
    setNewPersonOrg('');
    setNewPersonRole('');

    if (newNote) {
      setSelectedPersonId(newNote.id);
    }
  };

  return (
    <div className="flex h-full w-full bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Action & Navigation Bar */}
        <div className="border-b border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title & Stats */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-100">People & Relationships</h1>
                <div className="text-xs text-neutral-400">
                  {people.length} Contacts • {organizations.length} Organizations • {followUpQueue.length} Follow-ups
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNewPersonModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Person</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLogInteractionOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
              >
                <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                <span>Log Interaction</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
                title="Import vCard .vcf"
              >
                <Upload className="h-3.5 w-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Import</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
                title="Export vCard .vcf"
              >
                <Download className="h-3.5 w-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNativePickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
                title="OS Contact Picker"
              >
                <Smartphone className="h-3.5 w-3.5 text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Duplicate Candidate Banner */}
          {duplicateCandidates.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  <strong>{duplicateCandidates.length} potential duplicate pair(s)</strong> detected across contact records.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveMergeCandidate(duplicateCandidates[0])}
                className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
              >
                <GitMerge className="h-3.5 w-3.5" />
                <span>Review & Merge</span>
              </button>
            </div>
          )}

          {/* Search and Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search people, roles, companies, emails, phones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 py-1.5 pl-8 pr-3 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none placeholder-neutral-500"
              />
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-neutral-800/80 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${
                  activeTab === 'table'
                    ? 'bg-neutral-700 text-neutral-100 font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gallery')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${
                  activeTab === 'gallery'
                    ? 'bg-neutral-700 text-neutral-100 font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Directory</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('follow-ups')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${
                  activeTab === 'follow-ups'
                    ? 'bg-neutral-700 text-neutral-100 font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Follow-ups ({followUpQueue.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('birthdays')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${
                  activeTab === 'birthdays'
                    ? 'bg-neutral-700 text-neutral-100 font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Cake className="h-3.5 w-3.5 text-pink-400" />
                <span>Birthdays</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('organizations')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${
                  activeTab === 'organizations'
                    ? 'bg-neutral-700 text-neutral-100 font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Organizations</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: TABLE VIEW */}
          {activeTab === 'table' && (
            <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-800/50 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    <th className="py-2.5 px-3.5">Name</th>
                    <th className="py-2.5 px-3.5">Role</th>
                    <th className="py-2.5 px-3.5">Organization</th>
                    <th className="py-2.5 px-3.5">Last Contact</th>
                    <th className="py-2.5 px-3.5">Next Follow-Up</th>
                    <th className="py-2.5 px-3.5">Email</th>
                    <th className="py-2.5 px-3.5">Phone</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredPeople.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-500">
                        No contacts found matching search. Click <strong>New Person</strong> to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredPeople.map((person) => {
                      const isSelected = selectedPersonId === person.id;
                      return (
                        <tr
                          key={person.id}
                          onClick={() => setSelectedPersonId(person.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-500/10' : 'hover:bg-neutral-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-3.5 font-medium text-neutral-100 flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
                              {person.displayName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate">{person.displayName}</span>
                          </td>
                          <td className="py-2.5 px-3.5 text-neutral-300 truncate">
                            {person.role || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-blue-400 truncate">
                            {person.organizationTitles.join(', ') || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-neutral-400 whitespace-nowrap">
                            {person.lastContactDate || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-neutral-300 whitespace-nowrap">
                            {person.nextFollowUpDate ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                                <CheckSquare className="h-3 w-3" />
                                {person.nextFollowUpDate}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-neutral-400 truncate">
                            {person.emails[0]?.address || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-neutral-400 whitespace-nowrap">
                            {person.phones[0]?.number || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsLogInteractionOpen(true);
                              }}
                              className="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 mr-1"
                              title="Log interaction"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenNote(person.id);
                              }}
                              className="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                              title="Open note"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: GALLERY / DIRECTORY VIEW */}
          {activeTab === 'gallery' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredPeople.map((person) => {
                const isSelected = selectedPersonId === person.id;
                return (
                  <div
                    key={person.id}
                    onClick={() => setSelectedPersonId(person.id)}
                    className={`flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/5 shadow-md ring-1 ring-blue-500/40'
                        : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div>
                      {/* Avatar & Badges */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-sm font-bold text-blue-300 border border-blue-500/30">
                          {person.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        {person.birthday && person.birthday.daysUntilNext <= 14 && (
                          <span className="inline-flex items-center gap-1 rounded bg-pink-500/15 px-1.5 py-0.5 text-[10px] font-medium text-pink-300">
                            <Cake className="h-3 w-3" />
                            {person.birthday.daysUntilNext === 0
                              ? 'Birthday Today!'
                              : `in ${person.birthday.daysUntilNext}d`}
                          </span>
                        )}
                      </div>

                      {/* Name & Role */}
                      <h3 className="font-semibold text-neutral-100 text-sm truncate">
                        {person.displayName}
                      </h3>
                      {person.role && (
                        <p className="text-xs text-neutral-400 truncate mt-0.5">{person.role}</p>
                      )}
                      {person.organizationTitles.length > 0 && (
                        <p className="text-xs text-blue-400 truncate mt-0.5">
                          {person.organizationTitles.join(', ')}
                        </p>
                      )}

                      {/* Contact Info */}
                      <div className="mt-3 space-y-1 text-[11px] text-neutral-400 border-t border-neutral-800/60 pt-2.5">
                        {person.emails[0] && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 text-neutral-500 shrink-0" />
                            <span className="truncate">{person.emails[0].address}</span>
                          </div>
                        )}
                        {person.phones[0] && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="h-3 w-3 text-neutral-500 shrink-0" />
                            <span>{person.phones[0].number}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Metrics */}
                    <div className="mt-4 flex items-center justify-between border-t border-neutral-800/60 pt-2 text-[10px] text-neutral-500">
                      <span>Last: {person.lastContactDate || 'Never'}</span>
                      {person.nextFollowUpDate && (
                        <span className="text-amber-400 font-medium">
                          Due {person.nextFollowUpDate}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: FOLLOW-UPS QUEUE */}
          {activeTab === 'follow-ups' && (
            <div className="space-y-4 max-w-3xl">
              <div className="text-xs text-neutral-400">
                Actionable follow-up tasks and touchpoints derived from canonical notes and tasks.
              </div>

              {followUpQueue.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-xs text-neutral-500">
                  <CheckSquare className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
                  <span>No pending follow-ups scheduled. All contacts are up to date!</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {followUpQueue.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPersonId(p.id)}
                      className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 hover:border-neutral-700 hover:bg-neutral-800/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs">
                          <CheckSquare className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-100">
                            {p.displayName}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {p.nextFollowUpSnippet || `${p.openFollowUpTasksCount} open task(s)`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {p.nextFollowUpDate && (
                          <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/20">
                            {p.nextFollowUpDate}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsLogInteractionOpen(true);
                          }}
                          className="rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs text-blue-300 hover:bg-blue-600/30"
                        >
                          Log Touchpoint
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BIRTHDAYS VIEW */}
          {activeTab === 'birthdays' && (
            <div className="space-y-4 max-w-3xl">
              <div className="text-xs text-neutral-400">
                Annual recurring birthdays calculated from canonical note properties without synthetic years.
              </div>

              {upcomingBirthdays.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-xs text-neutral-500">
                  <Cake className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
                  <span>No upcoming birthdays within the next 45 days.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingBirthdays.map(({ person, birthday }) => (
                    <div
                      key={person.id}
                      onClick={() => setSelectedPersonId(person.id)}
                      className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 hover:border-neutral-700 hover:bg-neutral-800/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400">
                          <Cake className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-100">
                            {person.displayName}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {birthday.formattedDisplay}
                            {birthday.age !== undefined && (
                              <span className="text-neutral-500 ml-1">
                                • Turning {birthday.age + (birthday.daysUntilNext === 0 ? 0 : 1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded bg-pink-500/10 px-2.5 py-0.5 text-xs font-medium text-pink-300 border border-pink-500/20">
                          {birthday.daysUntilNext === 0 ? 'Today!' : `in ${birthday.daysUntilNext} days`}
                        </span>
                        {person.emails[0] && (
                          <a
                            href={`mailto:${person.emails[0].address}?subject=Happy%20Birthday!`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-lg border border-neutral-700 bg-neutral-800 p-1.5 text-neutral-300 hover:bg-neutral-700"
                            title="Send birthday email"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ORGANIZATIONS VIEW */}
          {activeTab === 'organizations' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {organizations.map((org) => {
                const members = people.filter((p) => p.organizationIds.includes(org.id));
                return (
                  <div
                    key={org.id}
                    className="flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-neutral-100 text-sm truncate">
                            {org.title}
                          </h3>
                          {org.type && <span className="text-[10px] text-neutral-400">{org.type}</span>}
                        </div>
                      </div>

                      {/* Members list */}
                      <div className="mt-3 space-y-1 text-xs">
                        <span className="text-[11px] font-semibold text-neutral-400">
                          Associated People ({members.length}):
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {members.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedPersonId(m.id)}
                              className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-200 hover:bg-neutral-700"
                            >
                              {m.displayName}
                            </button>
                          ))}
                          {members.length === 0 && (
                            <span className="text-neutral-500 text-[11px] italic">
                              No members linked yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500">
                      <button
                        type="button"
                        onClick={() => onOpenNote(org.id)}
                        className="text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Open Org Note</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Side Profile Inspector */}
      {selectedPerson && (
        <div className="w-80 md:w-96 shrink-0 h-full border-l border-neutral-800 shadow-xl">
          <PersonDetailInspector
            person={selectedPerson}
            allNotes={notes}
            onClose={() => setSelectedPersonId(null)}
            onOpenNote={onOpenNote}
            onLogInteraction={(pId) => setIsLogInteractionOpen(true)}
            onUpdateNote={onUpdateNote}
          />
        </div>
      )}

      {/* MODALS */}
      {isLogInteractionOpen && (
        <LogInteractionModal
          isOpen={isLogInteractionOpen}
          onClose={() => setIsLogInteractionOpen(false)}
          people={people}
          initialPersonId={selectedPersonId || undefined}
          onCreateNote={onCreateNote}
          onOpenNote={onOpenNote}
        />
      )}

      {activeMergeCandidate && (
        <MergePeopleModal
          isOpen={!!activeMergeCandidate}
          onClose={() => setActiveMergeCandidate(null)}
          candidate={activeMergeCandidate}
          notes={notes}
          folders={folders}
          savedSearches={savedSearches}
          settings={settings}
          saveNote={onUpdateNote}
          deleteNote={onDeleteNote}
          onMergeComplete={(survivorId) => {
            setSelectedPersonId(survivorId);
            setActiveMergeCandidate(null);
          }}
        />
      )}

      {isImportModalOpen && (
        <VCardImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingPeople={people}
          notes={notes}
          folders={folders}
          savedSearches={savedSearches}
          settings={settings}
          onCreateNote={onCreateNote}
          onImportComplete={(count) => {
            alert(`Successfully imported ${count} contacts as canonical notes.`);
          }}
        />
      )}

      {isExportModalOpen && (
        <VCardExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          people={people}
          allNotes={notes}
          isVaultEncrypted={isVaultEncrypted}
          selectedPersonId={selectedPersonId || undefined}
        />
      )}

      {isNativePickerOpen && (
        <NativeContactPickerModal
          isOpen={isNativePickerOpen}
          onClose={() => setIsNativePickerOpen(false)}
          onCreateNote={onCreateNote}
          onImportComplete={(count) => {
            alert(`Imported ${count} contact(s) from device.`);
          }}
        />
      )}

      {/* Fast New Person Modal */}
      {isNewPersonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <h3 className="font-semibold text-neutral-100 text-sm">Create New Person</h3>
              </div>
              <button
                onClick={() => setIsNewPersonModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewPerson} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ada Lovelace"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-1.5 px-3 text-neutral-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="ada@example.com"
                    value={newPersonEmail}
                    onChange={(e) => setNewPersonEmail(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-1.5 px-2.5 text-neutral-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 555-0199"
                    value={newPersonPhone}
                    onChange={(e) => setNewPersonPhone(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-1.5 px-2.5 text-neutral-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-300 mb-1">Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={newPersonOrg}
                    onChange={(e) => setNewPersonOrg(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-1.5 px-2.5 text-neutral-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Role / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Principal Engineer"
                    value={newPersonRole}
                    onChange={(e) => setNewPersonRole(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-1.5 px-2.5 text-neutral-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsNewPersonModalOpen(false)}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-white font-medium hover:bg-blue-500"
                >
                  Create Person Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
