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
      void animate(targets, { opacity: [.68, 1], y: [6, 0] }, {
        duration: .30,
        delay: stagger(.025),
        ease: motionEasing.enter,
      });
    }, { amount: .12, margin: '0px 0px -8% 0px' });

    cleanups.push(stop);
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}
