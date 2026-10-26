/**
 * Personalization & Workflow Settings Hub (V1.6)
 * 
 * Central management modal for:
 * 1. Visibility Profiles ('core' | 'personal-os' | 'custom') & Domain Toggles
 * 2. Navigation & Mobile Bottom Bar Config
 * 3. Workspace Presets & Workflow Sequences
 * 4. Keyboard Shortcuts & Conflict Resolution
 * 5. Home Sections & Layout Customization
 * 6. Privacy-Safe Configuration Export / Import
 * 7. Safe Interface Reset (preserves all canonical data)
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  Layers,
  LayoutDashboard,
  Command,
  Smartphone,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  PenTool,
  BookOpen,
  Target,
  Scale,
  Play,
  CheckSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  VisibilityProfileId,
  ProductDomainKey,
  HomeLayoutPresetId,
  HomeSectionId,
} from '../personalizationTypes';
import { visibilityProfileManager, ALL_DOMAINS } from '../visibilityProfiles';
import { navigationCustomizer, REQUIRED_ANCHOR_IDS } from '../navigationCustomizer';
import { workspacePresetsManager } from '../workspacePresetsManager';
import { workflowPresetsManager } from '../workflowPresetsManager';
import { keyboardShortcutManager } from '../keyboardShortcutManager';
import { homeCustomizer } from '../homeCustomizer';
import { configExportImportManager } from '../configExportImport';
import { personalizationDoctor, PersonalizationDiagnosticReport } from '../personalizationDoctor';
import { preferenceService } from '../preferenceService';
import { Note } from '../../../types';

interface PersonalizationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onRunWorkflow?: (workflowId: string) => void;
}

type TabKey = 'profiles' | 'navigation' | 'workspace' | 'shortcuts' | 'home' | 'export_import' | 'reset';

export const PersonalizationSettingsModal: React.FC<PersonalizationSettingsModalProps> = ({
  isOpen,
  onClose,
  notes,
  onRunWorkflow,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('profiles');

  // State
  const [visibilityConfig, setVisibilityConfig] = useState(visibilityProfileManager.getConfig());
  const [sidebarItems, setSidebarItems] = useState(navigationCustomizer.getSidebarItems());
  const [mobileNav, setMobileNav] = useState(navigationCustomizer.getMobileBottomNav());
  const [workspacePresets, setWorkspacePresets] = useState(workspacePresetsManager.getPresets());
  const [workflowPresets, setWorkflowPresets] = useState(workflowPresetsManager.getPresets());
  const [shortcuts, setShortcuts] = useState(keyboardShortcutManager.getShortcuts());
  const [homeConfig, setHomeConfig] = useState(homeCustomizer.getConfig());
  const [diagnosticReport, setDiagnosticReport] = useState<PersonalizationDiagnosticReport | null>(null);

  // Status message toast
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshState();
    }
  }, [isOpen]);

  const refreshState = () => {
    setVisibilityConfig(visibilityProfileManager.getConfig());
    setSidebarItems(navigationCustomizer.getSidebarItems());
    setMobileNav(navigationCustomizer.getMobileBottomNav());
    setWorkspacePresets(workspacePresetsManager.getPresets());
    setWorkflowPresets(workflowPresetsManager.getPresets());
    setShortcuts(keyboardShortcutManager.getShortcuts());
    setHomeConfig(homeCustomizer.getConfig());
    setDiagnosticReport(personalizationDoctor.runDiagnostics(notes));
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Personalization & Workflows
              </h2>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                Tailor navigation, workspace layouts, and daily workflows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-600 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-900/30 overflow-x-auto text-sm">
          {[
            { key: 'profiles', label: 'Visibility Profiles', icon: Layers },
            { key: 'navigation', label: 'Navigation & Mobile', icon: Smartphone },
            { key: 'workspace', label: 'Presets & Workflows', icon: LayoutDashboard },
            { key: 'shortcuts', label: 'Shortcuts', icon: Command },
            { key: 'home', label: 'Home Layout', icon: Sparkles },
            { key: 'export_import', label: 'Config Bundle', icon: Download },
            { key: 'reset', label: 'Safe Reset', icon: RefreshCw },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-2 px-3.5 py-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-amber-500 text-amber-700 dark:text-amber-400 font-semibold'
                    : 'border-transparent text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {statusMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {statusMessage}
            </div>
          )}

          {/* 1. VISIBILITY PROFILES */}
          {activeTab === 'profiles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                  Preset Visibility Profiles
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mb-3">
                  Profiles configure presentation only. Hiding a domain never deletes records or breaks search.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'core', title: 'Core Essentials', desc: 'Notes, Tasks, Calendar, and Inbox only' },
                    { id: 'personal-os', title: 'Full Personal OS', desc: 'All 18 integrated domains and life systems' },
                    { id: 'custom', title: 'Custom Selection', desc: 'Individually selected workspace domains' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={async () => {
                        const updated = await visibilityProfileManager.setProfile(p.id as VisibilityProfileId);
                        setVisibilityConfig(updated);
                        showToast(`Switched profile to ${p.title}`);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        visibilityConfig.profile === p.id
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-stone-900 dark:text-stone-100 shadow-sm'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-800/50'
                      }`}
                    >
                      <div className="font-semibold text-xs mb-1">{p.title}</div>
                      <div className="text-[11px] text-stone-700 dark:text-stone-300">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-2">
                  Domain Visibility Toggles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_DOMAINS.map((domain) => {
                    const isVisible = visibilityConfig.enabledDomains[domain.key] !== false;
                    return (
                      <div
                        key={domain.key}
                        className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/30"
                      >
                        <div>
                          <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                            {domain.label}
                          </div>
                          <div className="text-[11px] text-stone-700 dark:text-stone-300">
                            {domain.description}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const updated = await visibilityProfileManager.toggleDomain(domain.key, !isVisible);
                            setVisibilityConfig(updated);
                          }}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isVisible
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                              : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400'
                          }`}
                          aria-label={`Toggle ${domain.label}`}
                        >
                          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. NAVIGATION & MOBILE BAR */}
          {activeTab === 'navigation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                  Sidebar Items & Order
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mb-3">
                  Required anchors (Home, Notes, Search, Settings) cannot be removed.
                </p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {sidebarItems.map((item, idx) => {
                    const isRequired = REQUIRED_ANCHOR_IDS.includes(item.id) || !item.isOptional;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-stone-400 text-[10px] w-4">{idx + 1}.</span>
                          <span className="font-medium text-stone-900 dark:text-stone-100">{item.label}</span>
                          {isRequired && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-stone-100 dark:bg-stone-800 text-stone-500 rounded">
                              Anchor
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={idx === 0}
                            onClick={async () => {
                              await navigationCustomizer.reorderSidebarItem(item.id, 'up');
                              setSidebarItems(navigationCustomizer.getSidebarItems());
                            }}
                            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 disabled:opacity-30"
                            aria-label="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={idx === sidebarItems.length - 1}
                            onClick={async () => {
                              await navigationCustomizer.reorderSidebarItem(item.id, 'down');
                              setSidebarItems(navigationCustomizer.getSidebarItems());
                            }}
                            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 disabled:opacity-30"
                            aria-label="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {!isRequired && (
                            <button
                              onClick={async () => {
                                await navigationCustomizer.toggleSidebarItem(item.id, !item.isVisible);
                                setSidebarItems(navigationCustomizer.getSidebarItems());
                              }}
                              className={`p-1 rounded ml-1 ${
                                item.isVisible
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-stone-400'
                              }`}
                              aria-label="Toggle Visibility"
                            >
                              {item.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                  Mobile Bottom Bar (Max 5 items)
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mb-3">
                  Optimized for one-thumb reachability on mobile devices.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mobileNav.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40 text-xs"
                    >
                      <span className="font-medium text-stone-900 dark:text-stone-100">
                        Slot {idx + 1}: {item.label}
                      </span>
                      <span className="text-[10px] text-stone-500">{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. WORKSPACE PRESETS & WORKFLOWS */}
          {activeTab === 'workspace' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                  Workspace Presets
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mb-3">
                  Pre-configured split pane environments for specific modes of thought.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workspacePresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                          {preset.name}
                        </span>
                        {preset.isBuiltIn && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 rounded">
                            Built-in
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-700 dark:text-stone-300">
                        {preset.description}
                      </p>
                      <div className="text-[10px] text-stone-500 flex items-center gap-2">
                        <span>Left: {preset.leftSurface.title}</span>
                        {preset.rightSurface && <span>• Right: {preset.rightSurface.title}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                  Automated Workflow Presets
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mb-3">
                  Safe, non-executable action sequences to kick off focused work.
                </p>
                <div className="space-y-2">
                  {workflowPresets.map((wf) => (
                    <div
                      key={wf.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40"
                    >
                      <div>
                        <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                          {wf.name}
                        </div>
                        <div className="text-[11px] text-stone-700 dark:text-stone-300">
                          {wf.description}
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                          {wf.steps.length} sequential steps
                        </div>
                      </div>
                      <button
                        onClick={() => onRunWorkflow?.(wf.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Run
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    Keyboard Shortcuts Registry
                  </h3>
                  <p className="text-xs text-stone-700 dark:text-stone-300">
                    Normalized for your operating system with automated collision detection.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await keyboardShortcutManager.resetShortcuts();
                    setShortcuts(keyboardShortcutManager.getShortcuts());
                    showToast('Reset shortcuts to default');
                  }}
                  className="px-2.5 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors border border-stone-200 dark:border-stone-700"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                    <tr>
                      <th className="py-2 px-3 font-medium">Action</th>
                      <th className="py-2 px-3 font-medium">Category</th>
                      <th className="py-2 px-3 font-medium text-right">Key Combination</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {shortcuts.map((sc) => (
                      <tr key={sc.actionId} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                        <td className="py-2 px-3 font-medium text-stone-900 dark:text-stone-100">
                          {sc.label}
                        </td>
                        <td className="py-2 px-3 text-stone-500 capitalize">{sc.category}</td>
                        <td className="py-2 px-3 text-right">
                          <kbd className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-mono text-[11px] shadow-sm">
                            {keyboardShortcutManager.formatShortcutForDisplay(sc.keys)}
                          </kbd>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. HOME LAYOUT */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                  Home Layout Presets
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { id: 'balanced', title: 'Balanced', desc: 'Jump back in, focus priorities, and today agenda' },
                    { id: 'minimal', title: 'Minimalist', desc: 'Distraction-free top items only' },
                    { id: 'planning', title: 'Planning Focus', desc: 'Projects, attention blockers, and review triage' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={async () => {
                        const updated = await homeCustomizer.setPreset(preset.id as HomeLayoutPresetId);
                        setHomeConfig(updated);
                        showToast(`Applied ${preset.title} Home layout`);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        homeConfig.presetId === preset.id
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 mb-1">
                        {preset.title}
                      </div>
                      <div className="text-[11px] text-stone-700 dark:text-stone-300">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-2">
                  Sections & Order
                </h3>
                <div className="space-y-1.5">
                  {homeConfig.sections.map((sec, idx) => (
                    <div
                      key={sec.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40 text-xs"
                    >
                      <span className="font-medium text-stone-900 dark:text-stone-100">
                        {idx + 1}. {sec.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-stone-500">Limit: {sec.itemLimit}</span>
                        <button
                          disabled={idx === 0}
                          onClick={async () => {
                            const updated = await homeCustomizer.reorderSection(sec.id, 'up');
                            setHomeConfig(updated);
                          }}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 disabled:opacity-30"
                          aria-label="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === homeConfig.sections.length - 1}
                          onClick={async () => {
                            const updated = await homeCustomizer.reorderSection(sec.id, 'down');
                            setHomeConfig(updated);
                          }}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 disabled:opacity-30"
                          aria-label="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            const updated = await homeCustomizer.toggleSection(sec.id, !sec.isVisible);
                            setHomeConfig(updated);
                          }}
                          className={`p-1 rounded ${
                            sec.isVisible ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'
                          }`}
                          aria-label="Toggle Section"
                        >
                          {sec.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. CONFIG EXPORT / IMPORT */}
          {activeTab === 'export_import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                  Privacy-Safe Configuration Export
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mb-3">
                  Export presets, templates, shortcuts, and navigation layouts. Strictly excludes note contents, encryption keys, and private data.
                </p>
                <button
                  onClick={() => {
                    const bundle = configExportImportManager.generateBundle();
                    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pkm-ui-config-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('Configuration bundle downloaded');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Privacy-Safe JSON Config
                </button>
              </div>

              <div className="border-t border-stone-200 dark:border-stone-800 pt-6">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                  Import Configuration Bundle
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mb-3">
                  Upload a valid v1.6.0 configuration JSON file.
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    const res = await configExportImportManager.importBundle(text, 'merge');
                    if (res.success) {
                      refreshState();
                      showToast(`Imported ${res.importedCount} custom configuration settings`);
                    } else {
                      showToast(`Import failed: ${res.errors?.join(', ')}`);
                    }
                  }}
                  className="text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-stone-100 dark:file:bg-stone-800 file:text-stone-800 dark:file:text-stone-200 hover:file:bg-stone-200"
                />
              </div>
            </div>
          )}

          {/* 7. SAFE RESET */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Safe Interface Reset Guarantee
                </div>
                <p className="text-stone-700 dark:text-stone-300">
                  This operation resets only presentation preferences (domain visibility, sidebar order, home layout, shortcuts, density).
                </p>
                <div className="text-[11px] text-stone-700 dark:text-stone-300">
                  <strong>100% Preserved:</strong> All notes, markdown files, PARA projects, habits, financial accounts, health records, templates, extensions, and encryption keys.
                </div>
              </div>

              <button
                onClick={async () => {
                  const res = await preferenceService.resetInterfaceConfiguration();
                  refreshState();
                  showToast(`Interface reset completed. Preserved ${res.preservedData.length} core domains.`);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Interface to Factory Defaults
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
