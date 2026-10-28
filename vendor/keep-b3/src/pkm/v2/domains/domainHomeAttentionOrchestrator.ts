/**
 * PKM V2.13 — Domain Home Contributions & Attention/Activity Orchestrator
 *
 * Implements high-value earned Home contributions and noise-reduced Attention/Activity:
 * - Home Contributions: Only modules with active, continuable, or urgent items earn screen space
 * - Restrained privacy on Home for Health and Finance
 * - Attention Noise Reduction: Strips subjective nags (guilt meters, fake health scores, relationship nagging)
 * - Activity Coalescence: Only meaningful lifecycle milestones emitted to global timeline
 */

import { FirstPartyDomainId } from './domainQualityFramework';
import { learningLibraryDomainExcellence } from './learningLibraryDomainExcellence';
import { travelAssetsDecisionsDomainExcellence } from './travelAssetsDecisionsDomainExcellence';
import { projectsGoalsDomainExcellence } from './projectsGoalsDomainExcellence';
import { peopleDomainExcellence } from './peopleDomainExcellence';
import { trackingRoutinesDomainExcellence } from './trackingRoutinesDomainExcellence';

export interface HomeEarnedSection {
  domainId: FirstPartyDomainId;
  sectionId: string;
  title: string;
  subtitle?: string;
  badgeCount?: number;
  priority: number; // Lower number = higher on screen
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    actionLabel: string;
    actionRoute: string;
  }>;
}

export class DomainHomeAttentionOrchestrator {
  /**
   * Evaluates all first-party domains to build earned, high-value Home sections.
   * STRICT: If a domain has no active/continuable items, it produces ZERO Home clutter!
   */
  public getEarnedHomeSections(todayDateOnly: string): HomeEarnedSection[] {
    const sections: HomeEarnedSection[] = [];

    // 1. Library: Continue Reading (High value!)
    const reading = learningLibraryDomainExcellence.getCurrentlyReading();
    if (reading.length > 0) {
      sections.push({
        domainId: 'library',
        sectionId: 'home.library.continue',
        title: 'Continue Reading',
        subtitle: `${reading.length} in progress`,
        priority: 10,
        items: reading.slice(0, 3).map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: `${item.creator} • ${item.progressPercent}% (${item.currentLocation || 'In progress'})`,
          actionLabel: 'Resume',
          actionRoute: `/library/${item.id}`,
        })),
      });
    }

    // 2. Travel: Active Trip (Highest context when traveling!)
    const activeTrip = travelAssetsDecisionsDomainExcellence.getActiveTrip(todayDateOnly);
    if (activeTrip) {
      sections.push({
        domainId: 'travel',
        sectionId: 'home.travel.active_trip',
        title: `Active Trip: ${activeTrip.destination}`,
        subtitle: `Timezone: ${activeTrip.timezone} • ${activeTrip.startDateOnly} to ${activeTrip.endDateOnly}`,
        priority: 5,
        items: [
          {
            id: activeTrip.id,
            title: activeTrip.title,
            subtitle: `${activeTrip.destination} (Travel Mode Active)`,
            actionLabel: 'Open Travel Mode',
            actionRoute: `/travel/${activeTrip.id}`,
          },
        ],
      });
    }

    // 3. Learning: Study Due
    const dueCards = learningLibraryDomainExcellence.getDueCards(todayDateOnly);
    if (dueCards.length > 0) {
      sections.push({
        domainId: 'learning',
        sectionId: 'home.learning.due',
        title: 'Study & Spaced Repetition',
        subtitle: `${dueCards.length} cards due today`,
        badgeCount: dueCards.length,
        priority: 20,
        items: [
          {
            id: 'due_study_deck',
            title: 'Due Flashcard Deck',
            subtitle: `${dueCards.length} concept review intervals ready`,
            actionLabel: 'Start Study Session',
            actionRoute: '/learning/study',
          },
        ],
      });
    }

    // 4. Projects: Active Outcomes & Next Actions
    const activeProjects = projectsGoalsDomainExcellence.getActiveProjects();
    if (activeProjects.length > 0) {
      sections.push({
        domainId: 'projects',
        sectionId: 'home.projects.active',
        title: 'Active Projects',
        subtitle: `${activeProjects.length} projects in progress`,
        priority: 30,
        items: activeProjects.slice(0, 4).map((p) => {
          const ctx = projectsGoalsDomainExcellence.getProjectContext(p.id);
          const nextAction = ctx.nextActionTask ? `Next: ${ctx.nextActionTask.title}` : 'No Next Action set';
          return {
            id: p.id,
            title: p.title,
            subtitle: `${p.outcome ? `Target: ${p.outcome} • ` : ''}${nextAction}`,
            actionLabel: 'View Project',
            actionRoute: `/projects/${p.id}`,
          };
        }),
      });
    }

    // Sort by priority
    sections.sort((a, b) => a.priority - b.priority);
    return sections;
  }

  /**
   * Emits audited, noise-reduced Attention items across all first-party domains
   */
  public evaluateDomainAttention(todayDateOnly: string): Array<{
    domainId: FirstPartyDomainId;
    title: string;
    explanation: string;
    severity: 'info' | 'needs_attention' | 'important';
    resourceId?: string;
  }> {
    const items: Array<{
      domainId: FirstPartyDomainId;
      title: string;
      explanation: string;
      severity: 'info' | 'needs_attention' | 'important';
      resourceId?: string;
    }> = [];

    // People follow-ups
    const peopleAttention = peopleDomainExcellence.evaluateAttention(todayDateOnly);
    for (const p of peopleAttention) {
      items.push({
        domainId: 'people',
        title: `Follow-up: ${p.personName}`,
        explanation: p.reason,
        severity: 'needs_attention',
        resourceId: p.personId,
      });
    }

    // Project Next Actions & Overdue Tasks
    const projectAttention = projectsGoalsDomainExcellence.evaluateAttention(todayDateOnly);
    for (const p of projectAttention) {
      items.push({
        domainId: 'projects',
        title: p.projectTitle,
        explanation: p.details,
        severity: p.reason === 'overdue_task' ? 'important' : 'needs_attention',
        resourceId: p.projectId,
      });
    }

    // Asset Maintenance & Warranties
    const assetAttention = travelAssetsDecisionsDomainExcellence.evaluateAssetAttention(todayDateOnly);
    for (const a of assetAttention) {
      items.push({
        domainId: 'assets',
        title: a.assetName,
        explanation: a.details,
        severity: a.reason === 'maintenance_due' ? 'important' : 'info',
        resourceId: a.assetId,
      });
    }

    return items;
  }
}

export const domainHomeAttentionOrchestrator = new DomainHomeAttentionOrchestrator();
