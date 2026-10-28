import React, { useState } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
} from 'lucide-react';
import { UniversalInboxItem } from '../inboxTypes';
import { universalInboxService } from '../universalInboxService';

export interface DraftReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: UniversalInboxItem | null;
}

export const DraftReplyModal: React.FC<DraftReplyModalProps> = ({ isOpen, onClose, item }) => {
  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleGenerateSmartReply = () => {
    const sender = item.senderOrOwner ? item.senderOrOwner.split(' ')[0] : 'there';
    const draft = `Hi ${sender},\n\nThank you for sharing this. I have reviewed the details and will follow up with complete notes shortly.\n\nBest regards,\nAlex`;
    setReplyBody(draft);
  };

  const handleSaveLocalDraft = async () => {
    await universalInboxService.providerDraftReply(item.id, replyBody);
    setFeedback('Draft saved locally with full source provenance.');
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1200);
  };

  const handleExecuteSend = async () => {
    setIsSending(true);
    await universalInboxService.providerSendReply(item.id, replyBody);
    setIsSending(false);
    setConfirmSendOpen(false);
    setFeedback('Reply sent successfully via provider.');
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1200);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(replyBody);
    setFeedback('Copied to clipboard!');
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Draft Email Response</h2>
              <p className="text-xs text-stone-500">
                To: {item.senderOrOwner} ({item.senderEmail || 'N/A'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Body Form */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-stone-600 dark:text-stone-400 block mb-1">Subject</label>
            <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium">
              Re: {item.title}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-stone-700 dark:text-stone-300">Reply Content</label>
              <button
                type="button"
                onClick={handleGenerateSmartReply}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:underline"
              >
                <Sparkles className="w-3 h-3" />
                <span>Suggest Quick Reply</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write your reply or review notes..."
              className="w-full text-xs p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 leading-relaxed focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Original context excerpt */}
          <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60">
            <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px] block mb-1">
              Original Message Excerpt:
            </span>
            <p className="text-stone-600 dark:text-stone-400 line-clamp-3 italic">
              "{item.contentExcerpt || item.preview}"
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between">
          <button
            onClick={handleCopyClipboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Text</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveLocalDraft}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 shadow-xs"
            >
              Save as Draft
            </button>

            <button
              onClick={() => setConfirmSendOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Reply</span>
            </button>
          </div>
        </div>
      </div>

      {/* Strict Send Confirmation Modal */}
      {confirmSendOpen && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-xl p-5 max-w-sm w-full shadow-2xl border border-stone-200 dark:border-stone-700 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Confirm Sending Email
              </h3>
            </div>

            <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to send this email reply to <strong>{item.senderEmail || item.senderOrOwner}</strong> via your connected provider account?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmSendOpen(false)}
                className="px-3 py-1.5 font-medium rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                disabled={isSending}
                onClick={handleExecuteSend}
                className="px-4 py-1.5 font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                {isSending ? 'Sending…' : 'Yes, Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
