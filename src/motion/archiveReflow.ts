import { animate } from 'motion';
import { motionEasing } from './tokens';
import { prefersReducedMotion } from './reducedMotion';
import type { ArchivePositions } from '../lib/archive-performance';

export { ARCHIVE_REFLOW_ITEM_LIMIT, captureArchivePositions, shouldAnimateArchiveReflow } from '../lib/archive-performance';

export function animateArchiveReflow(container: HTMLElement, before: ArchivePositions): void {
  if (prefersReducedMotion() || !before.size) return;

  container.querySelectorAll<HTMLElement>('[data-archive-item]:not([hidden])').forEach((item) => {
    const slug = item.dataset.slug;
    if (!slug) return;
    const previous = before.get(slug);
    const current = item.getBoundingClientRect();
    if (!previous) {
      const nearViewport = current.bottom >= -window.innerHeight * .2 && current.top <= window.innerHeight * 1.2;
      if (nearViewport) {
        void animate(item, { opacity: [0, 1], scale: [.985, 1] }, {
          duration: .24,
          ease: motionEasing.enter,
        });
      }
      return;
    }
    const x = previous.left - current.left;
    const y = previous.top - current.top;
    if (Math.abs(x) < .5 && Math.abs(y) < .5) return;

    void animate(item, { x: [x, 0], y: [y, 0] }, {
      duration: .34,
      ease: motionEasing.standard,
    });
  });
}
