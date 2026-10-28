/**
 * PKM V2.3 — AI Plan Proposal Engine
 * 
 * Generates structured, conflict-aware planning suggestions upon explicit user request.
 * 
 * Non-negotiable principles:
 * - Proposal-only (STRICTLY NO automatic mutation).
 * - Exact date/time preview is mandatory.
 * - Calendar conflicts are explicitly surfaced.
 * - User must review and approve before any scheduled field changes.
 */

import { AIPlanProposal } from './planningTypes';
import { DateOnlyString } from '../temporal/temporalTypes';
import { getTodayDateOnly } from '../temporal/recurrenceEngineV2';
import { temporalIndexV2 } from '../temporal/temporalIndex';

export class AIPlanProposalEngine {
  /**
   * Generates a structured proposal for today's plan based on open tasks and calendar commitments
   */
  public generateProposal(
    openTasks: Array<{ id: string; title: string; priority?: string; due?: string }>,
    date: DateOnlyString = getTodayDateOnly()
  ): AIPlanProposal {
    const existingEvents = temporalIndexV2.getForDate(date);

    // Pick top priorities for focus (up to 3)
    const sortedTasks = [...openTasks].sort((a, b) => {
      const pScore = (p?: string) => (p === 'urgent' ? 3 : p === 'high' ? 2 : 1);
      return pScore(b.priority) - pScore(a.priority);
    });

    const proposedFocus = sortedTasks.slice(0, 3).map((task, idx) => {
      const times = ['09:30', '11:00', '14:30'];
      return {
        resourceId: task.id,
        title: task.title,
        suggestedTime: times[idx] || '16:00',
        rationale: task.due === date
          ? 'Due today — high urgency'
          : task.priority === 'urgent' || task.priority === 'high'
          ? 'High priority candidate'
          : 'Next open actionable task',
      };
    });

    // Check for conflicts with existing calendar events
    const detectedConflicts: AIPlanProposal['detectedConflicts'] = [];

    for (const proposal of proposedFocus) {
      if (proposal.suggestedTime) {
        const conflict = existingEvents.find((evt) => evt.time === proposal.suggestedTime);
        if (conflict) {
          detectedConflicts.push({
            time: proposal.suggestedTime,
            existingItemTitle: conflict.title,
            proposedItemTitle: proposal.title,
            severity: 'conflict',
          });
        }
      }
    }

    return {
      proposedDate: date,
      proposedFocus,
      detectedConflicts,
      suggestedOrdering: proposedFocus.map((f) => f.resourceId),
    };
  }
}

export const aiPlanProposalEngine = new AIPlanProposalEngine();
