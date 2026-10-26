import React, { useState } from 'react';
import {
  Mail,
  Calendar,
  FileText,
  Zap,
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle,
  Archive,
  Eye,
  AlertTriangle,
  User,
  Folder,
  Tag,
  Paperclip,
  Check,
  X,
  HelpCircle,
  Send,
  MessageSquare,
  DollarSign,
  Compass,
  FileBox,
  Scale,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import { Note } from '../../../types';
import { UniversalInboxItem, InboxState, RSVPStatus } from '../inboxTypes';
import { universalInboxService } from '../universalInboxService';
import { sanitizeExternalHtml } from '../inboxSanitizer';

export interface UniversalInboxDetailPaneProps {
  item: UniversalInboxItem;
  allNotes: Note[];
  onSaveNote: (note: Note) => void;
  onOpenDraftModal?: (item: UniversalInboxItem) => void;
  onOpenSnoozeModal?: (item: UniversalInboxItem) => void;
  onOpenProjectPicker?: (item: UniversalInboxItem) => void;
  onOpenPersonPicker?: (item: UniversalInboxItem) => void;
  onNavigateToNote?: (noteId: string) => void;
}

export const UniversalInboxDetailPane: React.FC<UniversalInboxDetailPaneProps> = ({
  item,
  allNotes,
  onSaveNote,
  onOpenDraftModal,
  onOpenSnoozeModal,
  onOpenProjectPicker,
  onOpenPersonPicker,
  onNavigateToNote,
}) => {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState(item.title);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState(item.title);
  const [noteTags, setNoteTags] = useState('external, triage');

  const [interactionModalOpen, setInteractionModalOpen] = useState(false);
  const [interactionSummary, setInteractionSummary] = useState(item.preview || '');
  const [interactionPersonName, setInteractionPersonName] = useState(item.senderOrOwner || '');

  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleCreateTask = () => {
    try {
      universalInboxService.createTaskFromItem(
        item.id,
        taskTitle,
        taskDueDate || undefined,
        taskPriority,
        undefined,
        allNotes,
        onSaveNote
      );
      setTaskModalOpen(false);
      showFeedback('Task created successfully with provenance link!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveAsNote = () => {
    try {
      const created = universalInboxService.saveItemAsNote(
        item.id,
        noteTitle,
        item.contentExcerpt || item.rawTextBody,
        noteTags.split(',').map((t) => t.trim()).filter(Boolean),
        onSaveNote
      );
      setNoteModalOpen(false);
      showFeedback(`Saved as canonical note: "${created.title}"`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLogInteraction = () => {
    try {
      const created = universalInboxService.logInteractionFromItem(
        item.id,
        item.matchedPersonId || 'person-unknown',
        interactionPersonName || 'Unknown Person',
        interactionSummary,
        onSaveNote
      );
      setInteractionModalOpen(false);
      showFeedback(`Logged interaction note: "${created.title}"`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleProviderArchive = async () => {
    setIsProcessingAction(true);
    await universalInboxService.providerArchive(item.id);
    setIsProcessingAction(false);
    showFeedback('Archived on remote provider.');
  };

  const handleProviderMarkRead = async (isRead: boolean) => {
    setIsProcessingAction(true);
    await universalInboxService.providerMarkRead(item.id, isRead);
    setIsProcessingAction(false);
    showFeedback(isRead ? 'Marked as Read on provider.' : 'Marked as Unread on provider.');
  };

  const handleProviderRsvp = async (status: RSVPStatus) => {
    setIsProcessingAction(true);
    await universalInboxService.providerRsvp(item.id, status);
    setIsProcessingAction(false);
    showFeedback(`Calendar RSVP updated: ${status}`);
  };

  const renderedHtml = item.htmlBodySanitized
    ? sanitizeExternalHtml(item.htmlBodySanitized, !item.remoteImagesBlocked)
    : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 overflow-y-auto">
      {/* Toast Feedback Notification */}
      {actionSuccessMsg && (
        <div className="sticky top-2 z-20 mx-4 p-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-white/80 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="p-5 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-xs flex items-center gap-1.5 border border-stone-200 dark:border-stone-700">
              {item.source === 'email' && <Mail className="w-3.5 h-3.5 text-blue-500" />}
              {item.source === 'calendar' && <Calendar className="w-3.5 h-3.5 text-emerald-500" />}
              {item.source === 'file' && <FileText className="w-3.5 h-3.5 text-amber-500" />}
              {item.source === 'local-capture' && <Zap className="w-3.5 h-3.5 text-purple-500" />}
              <span className="capitalize">{item.provenance?.providerName || item.source}</span>
            </span>

            {/* Local Triage State Badge */}
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 capitalize">
              Status: {item.state}
            </span>

            {/* External Read Status */}
            {item.externalState?.isRead !== undefined && (
              <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Remote: {item.externalState.isRead ? 'Read' : 'Unread'}
              </span>
            )}
          </div>

          {/* External Source Link */}
          {item.externalRef?.webUrl && (
            <a
              href={item.externalRef.webUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <span>Open in Provider</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug mb-2">
          {item.title}
        </h2>

        {/* Sender / Participants */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-600 dark:text-stone-400">
          <div>
            <span className="font-semibold text-stone-700 dark:text-stone-300">From: </span>
            <span>{item.senderOrOwner || 'N/A'}</span>
            {item.senderEmail && <span className="text-stone-400 dark:text-stone-500 ml-1">({item.senderEmail})</span>}
          </div>

          {item.receivedAt && (
            <div>
              <span className="font-semibold text-stone-700 dark:text-stone-300">Received: </span>
              <span>{new Date(item.receivedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Remote Changed Warning Banner */}
        {item.externalState?.hasChangedExternally && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-semibold">External Event Changed: </span>
              <span>
                {item.calendarMeta?.summaryDiff || 'This item was updated on the external service since it was first projected.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Unified Local Knowledge Action Bar */}
      <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mr-1">
          Triage:
        </span>

        {/* Create Task */}
        <button
          onClick={() => setTaskModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 shadow-sm transition-colors"
        >
          <CheckCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Create Task</span>
        </button>

        {/* Save as Note */}
        <button
          onClick={() => setNoteModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 shadow-sm transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Save as Note</span>
        </button>

        {/* Log Interaction (P48 Contact) */}
        <button
          onClick={() => setInteractionModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 shadow-sm transition-colors"
        >
          <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Log Interaction</span>
        </button>

        {/* Link to Project */}
        {onOpenProjectPicker && (
          <button
            onClick={() => onOpenProjectPicker(item)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 shadow-sm transition-colors"
          >
            <Folder className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Link Project</span>
          </button>
        )}

        {/* Domain Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDomainDropdownOpen(!domainDropdownOpen)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            <span>More Actions</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {domainDropdownOpen && (
            <div className="absolute left-0 mt-1 w-56 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl z-30 py-1 text-xs">
              <button
                onClick={() => {
                  setDomainDropdownOpen(false);
                  universalInboxService.saveItemAsNote(
                    item.id,
                    `Expense: ${item.title}`,
                    item.contentExcerpt,
                    ['finance', 'receipt'],
                    onSaveNote
                  );
                  showFeedback('Created Finance Receipt Note');
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 text-stone-800 dark:text-stone-200"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Record Finance Receipt</span>
              </button>

              <button
                onClick={() => {
                  setDomainDropdownOpen(false);
                  universalInboxService.saveItemAsNote(
                    item.id,
                    `Travel Booking: ${item.title}`,
                    item.contentExcerpt,
                    ['travel', 'reservation'],
                    onSaveNote
                  );
                  showFeedback('Created Travel Reservation Note');
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 text-stone-800 dark:text-stone-200"
              >
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                <span>Record Travel Reservation</span>
              </button>

              <button
                onClick={() => {
                  setDomainDropdownOpen(false);
                  universalInboxService.saveItemAsNote(
                    item.id,
                    `Decision Context: ${item.title}`,
                    item.contentExcerpt,
                    ['decision', 'evidence'],
                    onSaveNote
                  );
                  showFeedback('Attached as Decision Evidence');
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 text-stone-800 dark:text-stone-200"
              >
                <Scale className="w-3.5 h-3.5 text-indigo-600" />
                <span>Attach to Decision Record</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Snooze */}
        {onOpenSnoozeModal && (
          <button
            onClick={() => onOpenSnoozeModal(item)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Snooze</span>
          </button>
        )}

        {/* Mark Processed / Dismiss */}
        {item.state !== 'processed' ? (
          <button
            onClick={() => {
              universalInboxService.updateItemState(item.id, 'processed');
              showFeedback('Marked item as Processed');
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900 border border-green-200 dark:border-green-800 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark Processed</span>
          </button>
        ) : (
          <button
            onClick={() => {
              universalInboxService.updateItemState(item.id, 'seen');
              showFeedback('Reopened item');
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            <span>Reopen</span>
          </button>
        )}

        <button
          onClick={() => {
            universalInboxService.updateItemState(item.id, 'dismissed');
            showFeedback('Dismissed item from Inbox');
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors ml-auto"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Dismiss</span>
        </button>
      </div>

      {/* Main Content Body */}
      <div className="p-5 flex-1 space-y-5">
        {/* Remote Image Blocker Warning */}
        {item.remoteImagesBlocked && item.htmlBodySanitized && (
          <div className="p-3 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Remote images and tracking pixels are blocked to protect your privacy.</span>
            </div>
            <button
              onClick={() => universalInboxService.toggleRemoteImages(item.id, true)}
              className="px-2.5 py-1 font-semibold rounded bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 transition-colors"
            >
              Load Remote Images
            </button>
          </div>
        )}

        {/* Calendar Specific Event Panel */}
        {item.source === 'calendar' && item.calendarMeta && (
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Calendar Invitation Details</span>
              </h3>

              {/* RSVP Status */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-500 mr-1 font-medium">Your RSVP:</span>
                <button
                  disabled={isProcessingAction}
                  onClick={() => handleProviderRsvp('accepted')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    item.externalState?.rsvpStatus === 'accepted'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-100'
                  }`}
                >
                  Yes
                </button>
                <button
                  disabled={isProcessingAction}
                  onClick={() => handleProviderRsvp('tentative')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    item.externalState?.rsvpStatus === 'tentative'
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-amber-100'
                  }`}
                >
                  Maybe
                </button>
                <button
                  disabled={isProcessingAction}
                  onClick={() => handleProviderRsvp('declined')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    item.externalState?.rsvpStatus === 'declined'
                      ? 'bg-red-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-red-100'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-semibold text-stone-700 dark:text-stone-300">When: </span>
                <span>
                  {new Date(item.calendarMeta.startTime).toLocaleString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {new Date(item.calendarMeta.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {item.calendarMeta.location && (
                <div>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Location: </span>
                  {item.calendarMeta.location.startsWith('http') ? (
                    <a
                      href={item.calendarMeta.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline truncate inline-block max-w-[200px]"
                    >
                      {item.calendarMeta.location}
                    </a>
                  ) : (
                    <span>{item.calendarMeta.location}</span>
                  )}
                </div>
              )}
            </div>

            {/* Attendees */}
            {item.calendarMeta.attendees && item.calendarMeta.attendees.length > 0 && (
              <div className="text-xs pt-1 border-t border-emerald-200/50 dark:border-emerald-900/40">
                <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Attendees ({item.calendarMeta.attendees.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.calendarMeta.attendees.map((att) => (
                    <span
                      key={att.email}
                      className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-[11px]"
                    >
                      {att.name || att.email} {att.rsvp === 'accepted' ? '✓' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* File Specific Preview Panel */}
        {item.source === 'file' && item.fileMeta && (
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <FileBox className="w-4 h-4" />
              <span>External File Metadata</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-semibold text-stone-700 dark:text-stone-300">MIME Type: </span>
                <span>{item.fileMeta.mimeType}</span>
              </div>
              <div>
                <span className="font-semibold text-stone-700 dark:text-stone-300">Size: </span>
                <span>{item.fileMeta.sizeBytes ? `${(item.fileMeta.sizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-stone-700 dark:text-stone-300">Shared by: </span>
                <span>{item.fileMeta.ownerName || item.senderOrOwner || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-semibold text-stone-700 dark:text-stone-300">Last Modified: </span>
                <span>{item.fileMeta.lastModifiedRemote ? new Date(item.fileMeta.lastModifiedRemote).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Rendered HTML or Text Content */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
            Message Body Content
          </h3>

          {renderedHtml ? (
            <div
              className="prose dark:prose-invert prose-stone max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <pre className="font-mono text-xs whitespace-pre-wrap text-stone-800 dark:text-stone-200 leading-relaxed">
              {item.rawTextBody || item.contentExcerpt || item.preview || 'No text content.'}
            </pre>
          )}
        </div>

        {/* Attachments Section */}
        {item.attachmentsMeta && item.attachmentsMeta.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({item.attachmentsMeta.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {item.attachmentsMeta.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-stone-500 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">{att.name}</p>
                      <p className="text-[10px] text-stone-400">{(att.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      showFeedback(`Imported "${att.name}" as canonical vault attachment.`);
                    }}
                    className="text-xs font-medium px-2 py-1 rounded bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-800 dark:text-stone-200 transition-colors flex-shrink-0"
                  >
                    Import to Vault
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Canonical Artifacts Summary */}
        {item.generatedArtifacts && item.generatedArtifacts.length > 0 && (
          <div className="p-4 rounded-xl border border-green-200 dark:border-green-900/60 bg-green-50/40 dark:bg-green-950/20 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-800 dark:text-green-300 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Created Canonical Knowledge Artifacts</span>
            </h3>

            <div className="space-y-1.5">
              {item.generatedArtifacts.map((art) => (
                <div
                  key={art.id}
                  onClick={() => art.targetId && onNavigateToNote && onNavigateToNote(art.targetId)}
                  className={`flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs ${
                    art.targetId && onNavigateToNote ? 'cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-700/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-700 dark:text-stone-300 capitalize">
                      [{art.type}]:
                    </span>
                    <span className="text-stone-900 dark:text-stone-100 font-medium">{art.title}</span>
                  </div>
                  <span className="text-[10px] text-stone-400">{new Date(art.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing History Audit Trail */}
        {item.processingHistory && item.processingHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Processing Audit Trail</h4>
            <div className="space-y-1 text-xs text-stone-500">
              {item.processingHistory.map((audit) => (
                <div key={audit.id} className="flex items-center justify-between py-0.5">
                  <span>• {audit.action}</span>
                  <span className="text-[10px] text-stone-400">{new Date(audit.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* External Provider Explicit Actions Footer (Distinct from local triage) */}
      {item.source === 'email' && (
        <div className="p-4 bg-stone-100 dark:bg-stone-800/80 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
            <span className="font-semibold">Provider Actions ({item.provenance?.providerName}):</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDraftModal && (
              <button
                onClick={() => onOpenDraftModal(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Draft Reply</span>
              </button>
            )}

            <button
              disabled={isProcessingAction}
              onClick={() => handleProviderMarkRead(!item.externalState?.isRead)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-stone-500" />
              <span>{item.externalState?.isRead ? 'Mark Remote Unread' : 'Mark Remote Read'}</span>
            </button>

            <button
              disabled={isProcessingAction || item.externalState?.isArchived}
              onClick={handleProviderArchive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors"
            >
              <Archive className="w-3.5 h-3.5 text-stone-500" />
              <span>{item.externalState?.isArchived ? 'Archived on Gmail' : 'Archive in Gmail'}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- CREATE TASK MODAL --- */}
      {taskModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 border border-stone-200 dark:border-stone-700">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-600" />
              <span>Create Canonical Task from Source</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">
                Task Description
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTaskModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SAVE NOTE MODAL --- */}
      {noteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 border border-stone-200 dark:border-stone-700">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Save as Canonical Note</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">Note Title</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNoteModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsNote}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LOG INTERACTION MODAL --- */}
      {interactionModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 border border-stone-200 dark:border-stone-700">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Log Relationship Interaction</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">Person Name</label>
              <input
                type="text"
                value={interactionPersonName}
                onChange={(e) => setInteractionPersonName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">
                Summary of Discussion
              </label>
              <textarea
                rows={3}
                value={interactionSummary}
                onChange={(e) => setInteractionSummary(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInteractionModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={handleLogInteraction}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Log Interaction Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
