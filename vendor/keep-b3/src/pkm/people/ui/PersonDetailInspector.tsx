/**
 * Person Detail Inspector for Phase P48
 * 
 * Contextual profile inspector showing contact details, relationships,
 * activity metrics, quick action triggers, and the derived person timeline.
 */

import React, { useState } from 'react';
import {
  X,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Clock,
  Building2,
  Users,
  MessageSquare,
  CheckSquare,
  ExternalLink,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Cake,
  FileText,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import { PersonRecord, PersonTimelineItem } from '../peopleTypes';
import { Note } from '../../../types';
import { peopleService } from '../peopleService';

interface PersonDetailInspectorProps {
  person: PersonRecord;
  allNotes: Note[];
  onClose: () => void;
  onOpenNote: (noteId: string) => void;
  onLogInteraction: (personId: string) => void;
  onUpdateNote?: (note: Note) => Promise<void>;
}

export const PersonDetailInspector: React.FC<PersonDetailInspectorProps> = ({
  person,
  allNotes,
  onClose,
  onOpenNote,
  onLogInteraction,
  onUpdateNote,
}) => {
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'interactions' | 'tasks' | 'meetings' | 'notes'>('all');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const timelineItems = peopleService.getPersonTimeline(person.id, allNotes, timelineFilter);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-neutral-900 border-l border-neutral-800">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 p-4 sticky top-0 bg-neutral-900/95 backdrop-blur-xs z-10">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
          <Users className="h-4 w-4 text-blue-400" />
          <span>Person Profile</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenNote(person.id)}
            title="Open canonical Markdown note"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Open Note</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Profile Card */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-base font-bold text-blue-400 border border-blue-500/30 overflow-hidden">
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt={person.displayName}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              getInitials(person.displayName)
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-neutral-100 truncate">
              {person.displayName}
            </h2>
            {person.role && (
              <div className="text-xs text-neutral-300 flex items-center gap-1.5 mt-0.5">
                <Briefcase className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                <span className="truncate">{person.role}</span>
              </div>
            )}
            {person.organizationTitles.length > 0 && (
              <div className="text-xs text-blue-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{person.organizationTitles.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onLogInteraction(person.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 px-3 text-xs font-medium text-white hover:bg-blue-500 transition-colors shadow-xs"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Log Interaction</span>
          </button>

          {person.emails[0] && (
            <a
              href={`mailto:${person.emails[0].address}`}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              title={`Email ${person.emails[0].address}`}
            >
              <Mail className="h-4 w-4" />
            </a>
          )}

          {person.phones[0] && (
            <a
              href={`tel:${person.phones[0].number}`}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              title={`Call ${person.phones[0].number}`}
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Derived Activity Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Last Contact */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>Last Interaction</span>
              <Clock className="h-3.5 w-3.5 text-neutral-500" />
            </div>
            <div className="text-xs font-semibold text-neutral-200">
              {person.lastContactDate ? person.lastContactDate : 'None logged'}
            </div>
            <div className="text-[10px] text-neutral-500">
              {person.interactionCount} total interaction{person.interactionCount === 1 ? '' : 's'}
            </div>
          </div>

          {/* Next Follow-Up */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>Next Follow-Up</span>
              <CheckSquare className="h-3.5 w-3.5 text-neutral-500" />
            </div>
            <div className="text-xs font-semibold text-neutral-200">
              {person.nextFollowUpDate ? person.nextFollowUpDate : 'None scheduled'}
            </div>
            <div className="text-[10px] text-neutral-500 truncate">
              {person.nextFollowUpSnippet || `${person.openFollowUpTasksCount} open task(s)`}
            </div>
          </div>
        </div>

        {/* Structured Contact Details */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-800/20 p-3.5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Contact Details
          </h3>

          <div className="space-y-2 text-xs">
            {/* Emails */}
            {person.emails.map((e, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <a
                    href={`mailto:${e.address}`}
                    className="text-neutral-200 hover:text-blue-400 hover:underline truncate"
                  >
                    {e.address}
                  </a>
                  {e.label && (
                    <span className="text-[10px] text-neutral-500 uppercase font-mono">
                      ({e.label})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(e.address, `email-${idx}`)}
                  className="p-1 text-neutral-500 hover:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy email"
                >
                  {copiedField === `email-${idx}` ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}

            {/* Phones */}
            {person.phones.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <a
                    href={`tel:${p.number}`}
                    className="text-neutral-200 hover:text-blue-400 hover:underline truncate"
                  >
                    {p.number}
                  </a>
                  {p.label && (
                    <span className="text-[10px] text-neutral-500 uppercase font-mono">
                      ({p.label})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(p.number, `phone-${idx}`)}
                  className="p-1 text-neutral-500 hover:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy phone"
                >
                  {copiedField === `phone-${idx}` ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}

            {/* Birthday */}
            {person.birthday && (
              <div className="flex items-center gap-2">
                <Cake className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-neutral-200">
                    {person.birthday.formattedDisplay}
                    {person.birthday.age !== undefined && (
                      <span className="text-neutral-400 ml-1.5">
                        (Turning {person.birthday.age + (person.birthday.daysUntilNext === 0 ? 0 : 1)})
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center rounded bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-medium text-pink-300">
                    {person.birthday.daysUntilNext === 0
                      ? 'Today!'
                      : `in ${person.birthday.daysUntilNext} days`}
                  </span>
                </div>
              </div>
            )}

            {/* Websites */}
            {person.websites.map((w, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                <a
                  href={w}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline truncate inline-flex items-center gap-1"
                >
                  <span>{w.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}

            {/* Addresses */}
            {person.addresses.map((a, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-neutral-500 shrink-0 mt-0.5" />
                <span className="text-neutral-300">{a.formatted}</span>
              </div>
            ))}

            {person.emails.length === 0 &&
              person.phones.length === 0 &&
              !person.birthday &&
              person.websites.length === 0 &&
              person.addresses.length === 0 && (
                <div className="text-neutral-500 text-[11px] italic">
                  No contact details recorded in YAML frontmatter.
                </div>
              )}
          </div>
        </div>

        {/* Person Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Activity & Timeline
            </h3>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-neutral-800/80 p-0.5 text-[11px]">
              {(['all', 'interactions', 'tasks', 'notes'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTimelineFilter(mode)}
                  className={`capitalize px-2 py-0.5 rounded ${
                    timelineFilter === mode
                      ? 'bg-neutral-700 text-neutral-100 font-medium'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {timelineItems.length === 0 ? (
            <div className="rounded-lg border border-neutral-800 bg-neutral-800/20 p-6 text-center text-xs text-neutral-500">
              No activity matching filter. Log an interaction or create a follow-up task with [[{person.displayName}]].
            </div>
          ) : (
            <div className="space-y-2 border-l-2 border-neutral-800 pl-3 ml-2">
              {timelineItems.map((item) => {
                return (
                  <div
                    key={item.id}
                    onClick={() => onOpenNote(item.resourceId)}
                    className="relative group rounded-lg border border-neutral-800/60 bg-neutral-800/30 p-2.5 hover:border-neutral-700 hover:bg-neutral-800/70 transition-colors cursor-pointer"
                  >
                    {/* Date Pill */}
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
                      <span className="font-mono">{item.date} {item.time || ''}</span>
                      <span className="capitalize text-neutral-400 font-medium">
                        {item.type === 'interaction' ? item.interactionType || 'Interaction' : item.type}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-neutral-200 group-hover:text-blue-300">
                      {item.title}
                    </div>

                    {item.snippet && (
                      <div className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                        {item.snippet}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
