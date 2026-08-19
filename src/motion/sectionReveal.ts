import { animate, inView, stagger } from 'motion';
import { motionEasing } from './tokens';
import { prefersReducedMotion } from './reducedMotion';

export function initSectionReveals(root: ParentNode = document): () => void {
  if (prefersReducedMotion()) return () => undefined;

  const cleanups: Array<() => void> = [];
  root.querySelectorAll<HTMLElement>('[data-motion-section]').forEach((section) => {
    const targets = [...section.children].filter((child): child is HTMLElement => child instanceof HTMLElement);
    if (!targets.length) return;

    const stop = inView(section, () => {
      if (section.dataset.motionRevealed === 'true') return;
      section.dataset.motionRevealed = 'true';
      void animate(targets, { opacity: [.35, 1], y: [12, 0] }, {
        duration: .34,
        delay: stagger(.04),
        ease: motionEasing.enter,
      });
    }, { amount: .12, margin: '0px 0px -8% 0px' });

    cleanups.push(stop);
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}
