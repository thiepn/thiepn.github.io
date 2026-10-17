/**
 * PKM Phase P34: Browser Extension Popup Interface
 * Standalone, keyboard-navigable, accessible popup UI for fast web capture.
 */

import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  FileText,
  Calendar,
  Inbox,
  Lock,
  CheckCircle2,
  AlertCircle,
  Settings,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Camera,
  Link as LinkIcon,
  Tag,
  Key,
} from 'lucide-react';
import {
  CaptureMode,
  CaptureDestination,
  CapturePayload,
  ExtractedArticleMetadata,
} from '../../pkm/extensionBridge/captureProtocol';
import {
  ExtensionBridgeClient,
  ExtensionClientConfig,
} from '../bridge/extensionBridgeClient';

export interface PopupTabState {
  url: string;
  title: string;
  siteName: string;
  author?: string;
  selectionText?: string;
  selectionHtml?: string;
  article?: ExtractedArticleMetadata;
}

export function PopupView({
  initialTabState,
  bridgeClient,
}: {
  initialTabState?: PopupTabState;
  bridgeClient?: ExtensionBridgeClient;
}) {
  const [client] = useState(
    () => bridgeClient || new ExtensionBridgeClient()
  );

  // Connection & Vault status
  const [connectionStatus, setConnectionStatus] = useState<
    'checking' | 'connected' | 'locked' | 'unpaired' | 'unreachable'
  >('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Capture parameters
  const [mode, setMode] = useState<CaptureMode>('article');
  const [destination, setDestination] = useState<CaptureDestination>('inbox');
  const [title, setTitle] = useState(initialTabState?.title || 'Web Page');
  const [sourceUrl, setSourceUrl] = useState(initialTabState?.url || '');
  const [quickNote, setQuickNote] = useState('');
  const [tagsInput, setTagsInput] = useState('web-clip');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    noteTitle: string;
    destination: string;
    wasStaged: boolean;
  } | null>(null);

  // Settings view toggle
  const [showSettings, setShowSettings] = useState(false);
  const [appUrlInput, setAppUrlInput] = useState(client.getConfig().appUrl);
  const [secretInput, setSecretInput] = useState(client.getConfig().pairingSecret);
  const [autoOpen, setAutoOpen] = useState(false);

  // Check connection on mount
  useEffect(() => {
    async function check() {
      try {
        setConnectionStatus('checking');
        const handshake = await client.performHandshake();
        if (handshake.authenticated) {
          if (handshake.vaultLocked) {
            setConnectionStatus('locked');
          } else {
            setConnectionStatus('connected');
          }
          setErrorMessage(null);
        } else {
          setConnectionStatus('unpaired');
          setErrorMessage(handshake.error || 'Pairing secret required.');
        }
      } catch (err: any) {
        setConnectionStatus('unreachable');
        setErrorMessage(err?.message || 'Cannot reach PKM application.');
      }
    }
    check();
  }, [client]);

  const handleSaveCapture = async (openAfter: boolean = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const captureId = `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    const payload: CapturePayload = {
      id: captureId,
      mode,
      destination,
      sourceUrl,
      sourceTitle: title,
      quickNoteText: quickNote.trim() || undefined,
      text: initialTabState?.selectionText || undefined,
      html: initialTabState?.selectionHtml || undefined,
      extractedArticle: mode === 'article' ? initialTabState?.article : undefined,
      tags: parsedTags,
      capturedAt: new Date().toISOString(),
    };

    try {
      const res = await client.submitCapture(payload);
      if (res.success) {
        setSubmitSuccess({
          noteTitle: res.noteTitle || title,
          destination: res.destination,
          wasStaged: res.wasStagedForUnlock,
        });
        if (openAfter && typeof window !== 'undefined') {
          window.open(client.getConfig().appUrl, '_blank');
        }
      } else {
        setErrorMessage(res.error || 'Capture failed.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit capture.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = () => {
    client.updateConfig({
      appUrl: appUrlInput.trim(),
      pairingSecret: secretInput.trim(),
    });
    setShowSettings(false);
    // Recheck
    client.performHandshake().then((hs) => {
      if (hs.authenticated) {
        setConnectionStatus(hs.vaultLocked ? 'locked' : 'connected');
      } else {
        setConnectionStatus('unpaired');
      }
    }).catch(() => setConnectionStatus('unreachable'));
  };

  return (
    <div className="w-[360px] bg-stone-900 text-stone-100 font-sans border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs">
      {/* Top Header */}
      <div className="p-3.5 bg-stone-950/80 border-b border-stone-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            <Bookmark className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-stone-200 tracking-tight text-sm">PKM Web Clipper</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          {connectionStatus === 'connected' && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ready
            </span>
          )}
          {connectionStatus === 'locked' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-medium text-[10px] flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Vault Locked (Staging)
            </span>
          )}
          {(connectionStatus === 'unpaired' || connectionStatus === 'unreachable') && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium text-[10px] flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" /> {connectionStatus === 'unpaired' ? 'Unpaired' : 'Offline'}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Extension settings"
            className={`p-1.5 rounded-lg border transition-colors ${
              showSettings
                ? 'bg-amber-500 text-stone-900 border-amber-400'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border-stone-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      {showSettings ? (
        /* Settings View */
        <div className="p-4 flex flex-col gap-3">
          <div className="font-bold text-stone-200 text-xs flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-400" /> Pairing Configuration
          </div>
          <div>
            <label className="block text-stone-400 text-[11px] mb-1 font-medium">PKM App URL / Origin</label>
            <input
              type="text"
              value={appUrlInput}
              onChange={(e) => setAppUrlInput(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-stone-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              placeholder="http://localhost:3000"
            />
          </div>
          <div>
            <label className="block text-stone-400 text-[11px] mb-1 font-medium">Pairing Secret Token</label>
            <input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-stone-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              placeholder="Paste 64-char pairing secret from Settings"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="auto-open-chk"
              checked={autoOpen}
              onChange={(e) => setAutoOpen(e.target.checked)}
              className="rounded bg-stone-950 border-stone-700 text-amber-500 focus:ring-0"
            />
            <label htmlFor="auto-open-chk" className="text-stone-300 text-[11px] cursor-pointer">
              Auto-open PKM app tab after capture
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold"
            >
              Save Configuration
            </button>
          </div>
        </div>
      ) : submitSuccess ? (
        /* Success State */
        <div className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-bold text-stone-100 text-sm">
              {submitSuccess.wasStaged ? 'Captured & Staged in Safe Memory' : 'Successfully Saved to PKM!'}
            </h4>
            <p className="text-stone-400 text-[11px] max-w-[260px]">
              {submitSuccess.wasStaged
                ? 'Vault is currently locked. Your note will automatically commit to encrypted storage upon unlock.'
                : `Saved "${submitSuccess.noteTitle}" to ${submitSuccess.destination.toUpperCase()}.`}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2 w-full">
            <button
              type="button"
              onClick={() => setSubmitSuccess(null)}
              className="flex-1 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium"
            >
              Clip Another
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.open(client.getConfig().appUrl, '_blank');
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center gap-1"
            >
              Open PKM <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Standard Capture Form */
        <div className="p-3.5 flex flex-col gap-3">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setMode('article')}
              className={`py-1.5 px-2 rounded-lg font-medium text-[11px] flex flex-col items-center gap-1 transition-colors ${
                mode === 'article'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Article</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('selection')}
              className={`py-1.5 px-2 rounded-lg font-medium text-[11px] flex flex-col items-center gap-1 transition-colors ${
                mode === 'selection'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Selection</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('link')}
              className={`py-1.5 px-2 rounded-lg font-medium text-[11px] flex flex-col items-center gap-1 transition-colors ${
                mode === 'link'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Link</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('quick-note')}
              className={`py-1.5 px-2 rounded-lg font-medium text-[11px] flex flex-col items-center gap-1 transition-colors ${
                mode === 'quick-note'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Note</span>
            </button>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-stone-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              Note Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700/80 rounded-lg text-stone-100 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              placeholder="Title for captured note"
            />
          </div>

          {/* Destination Selector */}
          <div>
            <label className="block text-stone-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              Destination
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setDestination('inbox')}
                className={`py-1.5 px-2 rounded-lg border text-[11px] flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  destination === 'inbox'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Inbox className="w-3 h-3" /> Inbox
              </button>
              <button
                type="button"
                onClick={() => setDestination('daily')}
                className={`py-1.5 px-2 rounded-lg border text-[11px] flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  destination === 'daily'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Calendar className="w-3 h-3" /> Daily Note
              </button>
              <button
                type="button"
                onClick={() => setDestination('new_note')}
                className={`py-1.5 px-2 rounded-lg border text-[11px] flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  destination === 'new_note'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <FileText className="w-3 h-3" /> New Note
              </button>
            </div>
          </div>

          {/* Quick Note / Annotation */}
          <div>
            <label className="block text-stone-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              Quick Annotation (Optional)
            </label>
            <textarea
              rows={2}
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700/80 rounded-lg text-stone-100 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
              placeholder="Add key insights, thoughts, or highlights..."
            />
          </div>

          {/* Tags Field */}
          <div>
            <label className="block text-stone-400 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-amber-400" /> Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700/80 rounded-lg text-stone-100 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              placeholder="web-clip, research, article"
            />
          </div>

          {/* Error Message banner */}
          {errorMessage && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveCapture(false)}
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save to PKM'}</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveCapture(true)}
              title="Save and open in PKM application tab"
              className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>Save & Open</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
