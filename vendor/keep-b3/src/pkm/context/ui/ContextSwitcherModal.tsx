/**
 * Phase P59 - Context Switcher Modal (Cmd+Shift+K)
 * Fast, keyboard-accessible switcher to jump across Projects, Courses, Trips,
 * Goals, People, Decisions, Assets, and Custom Contexts.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  Clock,
  FolderKanban,
  GraduationCap,
  Plane,
  Users,
  Scale,
  Box,
  Calendar,
  Pin,
  PinOff,
  Plus,
  ArrowRight,
  X,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import { ContextDescriptor, CustomContextDefinition } from '../contextTypes';
import { contextEngine } from '../contextEngine';
import { contextStorage } from '../contextStorage';
import { planningService } from '../../planning/planningService';
import { learningService } from '../../learning/learningService';
import { travelService } from '../../travel/travelService';
import { peopleService } from '../../people/peopleService';
import { decisionService } from '../../decisions/decisionService';
import { assetService } from '../../assets/assetService';

interface ContextSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onStartContext?: (descriptor: ContextDescriptor) => void;
}

export const ContextSwitcherModal: React.FC<ContextSwitcherModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  onStartContext,
}) => {
  const [query, setQuery] = useState('');
  const [activeContext, setActiveContext] = useState<ContextDescriptor | null>(() => contextEngine.getActiveContext());
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    return contextEngine.subscribe(() => {
      setActiveContext(contextEngine.getActiveContext());
    });
  }, []);

  // Build full list of available contexts
  const allContexts: ContextDescriptor[] = useMemo(() => {
    const list: ContextDescriptor[] = [
      {
        id: 'today',
        type: 'today',
        title: 'Today',
        subtitle: 'Daily commitments, scheduled agenda & due tasks',
        explicit: true,
        iconName: 'Calendar',
      },
      {
        id: 'week',
        type: 'week',
        title: 'This Week',
        subtitle: '7-day planning horizon & upcoming deadlines',
        explicit: true,
        iconName: 'Calendar',
      },
    ];

    // 1. Projects
    try {
      const projects = planningService.getProjects() || [];
      projects.forEach((p) => {
        list.push({
          id: p.id,
          type: 'project',
          resourceId: p.id,
          title: p.title,
          subtitle: `Project · ${p.status.toUpperCase()}`,
          explicit: true,
          iconName: 'FolderKanban',
        });
      });
    } catch (_) {}

    // 2. Courses (Learning)
    try {
      const courses = learningService.getAllCourses() || [];
      courses.forEach((c) => {
        list.push({
          id: c.id,
          type: 'course',
          resourceId: c.id,
          title: c.title,
          subtitle: `Course · ${c.level ? c.level.toUpperCase() : 'Academic'}`,
          explicit: true,
          iconName: 'GraduationCap',
        });
      });
    } catch (_) {}

    // 3. Trips (Travel)
    try {
      const trips = travelService.getTrips() || [];
      trips.forEach((tr) => {
        list.push({
          id: tr.id,
          type: 'trip',
          resourceId: tr.id,
          title: tr.title,
          subtitle: `Trip · ${tr.status.toUpperCase()} · ${tr.startDate || 'TBD'}`,
          explicit: true,
          iconName: 'Plane',
        });
      });
    } catch (_) {}

    // 4. Key People
    try {
      const people = peopleService.getPeople() || [];
      people.slice(0, 10).forEach((pe) => {
        list.push({
          id: pe.id,
          type: 'person',
          resourceId: pe.id,
          title: pe.displayName || pe.noteTitle,
          subtitle: `Contact · ${pe.role || (pe.organizationTitles && pe.organizationTitles[0]) || 'Person'}`,
          explicit: true,
          iconName: 'Users',
        });
      });
    } catch (_) {}

    // 5. Decisions
    try {
      const decisions = decisionService.getDecisions() || [];
      decisions.slice(0, 10).forEach((dec) => {
        list.push({
          id: dec.id,
          type: 'decision',
          resourceId: dec.id,
          title: dec.title,
          subtitle: `Decision · ${dec.status.toUpperCase()}`,
          explicit: true,
          iconName: 'Scale',
        });
      });
    } catch (_) {}

    // 6. Assets
    try {
      const assets = assetService.getAssets() || [];
      assets.slice(0, 10).forEach((a) => {
        list.push({
          id: a.id,
          type: 'asset',
          resourceId: a.id,
          title: a.name,
          subtitle: `Asset · ${a.type}`,
          explicit: true,
          iconName: 'Box',
        });
      });
    } catch (_) {}

    // 7. Custom Contexts
    try {
      const customs = contextStorage.getCustomContexts() || [];
      customs.forEach((cu) => {
        list.push({
          id: cu.id,
          type: 'custom',
          title: cu.name,
          subtitle: `Custom Context · ${cu.rootResourceRefs.length} root resources`,
          explicit: true,
          iconName: 'Layers',
        });
      });
    } catch (_) {}

    return list;
  }, [notes, folders]);

  // Recent Resume Checkpoints
  const recentResumes = useMemo(() => {
    return contextStorage.getRecentResumeStates(5);
  }, [isOpen]);

  // Filtered list
  const filteredContexts = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allContexts;
    return allContexts.filter(
      (c) => c.title.toLowerCase().includes(q) || (c.subtitle && c.subtitle.toLowerCase().includes(q))
    );
  }, [allContexts, query]);

  if (!isOpen) return null;

  const handleSelectContext = (ctx: ContextDescriptor) => {
    contextEngine.startContext(ctx);
    if (onStartContext) {
      onStartContext(ctx);
    }
    onClose();
  };

  const handleLeaveContext = () => {
    contextEngine.leaveContext();
    onClose();
  };

  const handleCreateCustom = () => {
    if (!customName.trim()) return;
    const newDef: CustomContextDefinition = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      rootResourceRefs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    contextStorage.saveCustomContext(newDef);
    setCustomName('');
    setIsCreatingCustom(false);
    handleSelectContext({
      id: newDef.id,
      type: 'custom',
      title: newDef.name,
      subtitle: 'Custom Context',
      explicit: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-xl w-full text-xs text-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header Search */}
        <div className="p-3 border-b border-slate-800 flex items-center space-x-2 bg-slate-950">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Switch or search context (Project, Course, Trip, Goal, Person...)"
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Context Banner */}
        {activeContext && (
          <div className="px-4 py-2 bg-blue-950/40 border-b border-blue-900/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-400">Active:</span>
              <span className="text-xs font-semibold text-blue-300">{activeContext.title}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-900/80 text-blue-200 uppercase font-mono">
                {activeContext.type}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => contextEngine.setPinned(!contextEngine.isPinned())}
                className="text-[10px] text-slate-300 hover:text-amber-300 flex items-center space-x-1"
              >
                {contextEngine.isPinned() ? <PinOff className="w-3 h-3 text-amber-400" /> : <Pin className="w-3 h-3" />}
                <span>{contextEngine.isPinned() ? 'Pinned' : 'Pin'}</span>
              </button>
              <button
                onClick={handleLeaveContext}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-medium ml-2"
              >
                Leave Context
              </button>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Recent Resume Section */}
          {!query && recentResumes.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Recent Workstreams (Resume)</span>
              </div>
              <div className="space-y-1">
                {recentResumes.map((res) => (
                  <div
                    key={res.contextId}
                    onClick={() =>
                      handleSelectContext({
                        id: res.contextId,
                        type: res.contextType,
                        title: res.contextTitle,
                        subtitle: res.previewText,
                        explicit: true,
                      })
                    }
                    className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800/80 border border-slate-800/60 flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1.5 rounded bg-slate-800 text-blue-400">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 truncate group-hover:text-blue-300">
                          {res.contextTitle}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {res.previewText || 'Resume previous session state'}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 font-mono">
                      <span>Resume</span>
                      <ArrowRight className="w-3 h-3 text-blue-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Contexts */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {query ? `Matching Contexts (${filteredContexts.length})` : 'All Contexts'}
            </div>
            {filteredContexts.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic p-3 text-center">No matching contexts found.</p>
            ) : (
              filteredContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  onClick={() => handleSelectContext(ctx)}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-between group ${
                    activeContext?.id === ctx.id
                      ? 'bg-blue-950/30 border-blue-800/60'
                      : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded bg-slate-800/80 text-slate-400 group-hover:text-blue-400">
                      {ctx.type === 'project' && <FolderKanban className="w-3.5 h-3.5" />}
                      {ctx.type === 'course' && <GraduationCap className="w-3.5 h-3.5" />}
                      {ctx.type === 'trip' && <Plane className="w-3.5 h-3.5" />}
                      {ctx.type === 'person' && <Users className="w-3.5 h-3.5" />}
                      {ctx.type === 'decision' && <Scale className="w-3.5 h-3.5" />}
                      {ctx.type === 'asset' && <Box className="w-3.5 h-3.5" />}
                      {ctx.type === 'today' && <Calendar className="w-3.5 h-3.5 text-emerald-400" />}
                      {ctx.type === 'week' && <Calendar className="w-3.5 h-3.5 text-blue-400" />}
                      {ctx.type === 'custom' && <Layers className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-200 truncate group-hover:text-blue-300">
                        {ctx.title}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{ctx.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-blue-400 font-medium">Start</span>
                    <ArrowRight className="w-3 h-3 text-blue-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer / Custom Context creation */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          {isCreatingCustom ? (
            <div className="flex items-center space-x-2 w-full">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Custom context name (e.g. Thesis, Product Launch)..."
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCustom()}
                className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleCreateCustom}
                disabled={!customName.trim()}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-medium text-xs"
              >
                Create
              </button>
              <button
                onClick={() => setIsCreatingCustom(false)}
                className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setIsCreatingCustom(true)}
                className="text-slate-400 hover:text-slate-200 text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Create Custom Context</span>
              </button>
              <div className="text-[10px] text-slate-500 font-mono">
                Press <span className="text-slate-400">Esc</span> to dismiss
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
