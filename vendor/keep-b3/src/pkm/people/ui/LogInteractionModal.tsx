/**
 * Log Interaction Modal for Phase P48
 * 
 * Fast, keyboard-accessible modal to log meetings, calls, messages, and conversations
 * as canonical Markdown notes with linked participants and optional follow-up tasks.
 */

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  CheckSquare,
  MessageSquare,
  Phone,
  Video,
  Mail,
  Coffee,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { InteractionType, PersonRecord } from '../peopleTypes';
import { peopleService } from '../peopleService';
import { Note } from '../../../types';

interface LogInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: PersonRecord[];
  initialPersonId?: string;
  onCreateNote: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  onOpenNote?: (noteId: string) => void;
}

const INTERACTION_TYPES: Array<{
  type: InteractionType;
  label: string;
  icon: React.ElementType;
}> = [
  { type: 'meeting', label: 'Meeting', icon: Users },
  { type: 'call', label: 'Call', icon: Phone },
  { type: 'message', label: 'Message', icon: MessageSquare },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'conversation', label: 'Conversation', icon: Coffee },
  { type: 'appointment', label: 'Appointment', icon: Calendar },
  { type: 'social', label: 'Social', icon: Coffee },
  { type: 'follow-up', label: 'Follow-up', icon: CheckSquare },
  { type: 'other', label: 'Other', icon: MessageSquare },
];

export const LogInteractionModal: React.FC<LogInteractionModalProps> = ({
  isOpen,
  onClose,
  people,
  initialPersonId,
  onCreateNote,
  onOpenNote,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [interactionType, setInteractionType] = useState<InteractionType>('meeting');
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(nowTime);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(() => {
    if (initialPersonId) {
      const p = people.find((item) => item.id === initialPersonId);
      return p ? [p.noteTitle] : [];
    }
    return [];
  });
  const [participantInput, setParticipantInput] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredPeopleSuggestions = people.filter((p) => {
    if (selectedParticipants.includes(p.noteTitle)) return false;
    if (!participantInput) return false;
    const q = participantInput.toLowerCase();
    return (
      p.displayName.toLowerCase().includes(q) ||
      p.noteTitle.toLowerCase().includes(q) ||
      (p.role && p.role.toLowerCase().includes(q))
    );
  });

  const handleAddParticipant = (titleToAdd: string) => {
    if (!titleToAdd.trim()) return;
    if (!selectedParticipants.includes(titleToAdd.trim())) {
      setSelectedParticipants([...selectedParticipants, titleToAdd.trim()]);
    }
    setParticipantInput('');
  };

  const handleRemoveParticipant = (titleToRemove: string) => {
    setSelectedParticipants(selectedParticipants.filter((p) => p !== titleToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (selectedParticipants.length === 0 && !title.trim()) {
      alert('Please specify at least one participant or a title for this interaction.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generated = peopleService.generateInteractionNoteContent({
        title: title.trim() || undefined,
        interactionType,
        date,
        time: time || undefined,
        participantTitles: selectedParticipants,
        summary: summary.trim(),
        followUpTaskText: hasFollowUp && followUpText.trim() ? followUpText.trim() : undefined,
        followUpDueDate: hasFollowUp && followUpDate ? followUpDate : undefined,
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

      onClose();
      if (onOpenNote && newNote) {
        onOpenNote(newNote.id);
      }
    } catch (err) {
      console.error('Failed to log interaction:', err);
      alert('Error creating interaction note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Log Interaction</h2>
              <p className="text-xs text-neutral-400">
                Creates a canonical note with linked participants and follow-ups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Interaction Type Picker */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Interaction Type
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {INTERACTION_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = interactionType === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setInteractionType(t.type)}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-medium'
                        : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 py-2 pl-9 pr-3 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Time (optional)
              </label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 py-2 pl-9 pr-3 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Participants
            </label>
            <div className="space-y-2">
              {/* Selected Pills */}
              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedParticipants.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300 border border-blue-500/30"
                    >
                      <Users className="h-3 w-3" />
                      <span>{name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(name)}
                        className="text-blue-400 hover:text-blue-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input & Autocomplete */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type person name or title..."
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddParticipant(participantInput);
                    }
                  }}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 py-2 px-3 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none placeholder-neutral-500"
                />

                {filteredPeopleSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-36 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-800 shadow-lg">
                    {filteredPeopleSuggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddParticipant(p.noteTitle)}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-neutral-200 hover:bg-neutral-700"
                      >
                        <span className="font-medium">{p.displayName}</span>
                        {p.role && <span className="text-neutral-400">{p.role}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Custom Note Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Note Title (optional)
            </label>
            <input
              type="text"
              placeholder={`e.g. ${interactionType.toUpperCase()} with ${selectedParticipants.join(', ') || 'Team'}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 py-2 px-3 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none placeholder-neutral-500"
            />
          </div>

          {/* Notes & Summary */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Discussion & Notes
            </label>
            <textarea
              rows={3}
              placeholder="Key topics discussed, takeaways, or meeting highlights..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 p-3 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none placeholder-neutral-500"
            />
          </div>

          {/* Follow-up Task Toggle */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-800/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFollowUp}
                  onChange={(e) => setHasFollowUp(e.target.checked)}
                  className="rounded border-neutral-700 text-blue-500 focus:ring-0"
                />
                <span>Schedule a follow-up action item</span>
              </label>
            </div>

            {hasFollowUp && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Task description (e.g. Send proposal draft)"
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-1.5 px-3 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-1.5 px-2 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <span>Log Interaction</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
