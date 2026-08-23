import { animate, stagger } from 'motion';
import { motionEasing } from './tokens';
import { prefersReducedMotion } from './reducedMotion';

const seconds = (milliseconds: number) => milliseconds / 1000;

export function runHeroEntrance(root: HTMLElement): void {
  if (prefersReducedMotion()) {
    root.dataset.heroMotion = 'static';
    return;
  }

  root.dataset.heroMotion = 'active';

  const rule = root.querySelector<HTMLElement>('.section-index__rule');
  const title = root.querySelector<HTMLElement>('[data-hero-title]');
  const copy = root.querySelectorAll<HTMLElement>('[data-hero-copy]');
  const recordRows = root.querySelectorAll<HTMLElement>('[data-hero-record] > div');
  const fragmentStages = root.querySelectorAll<HTMLElement>('[data-index-fragment-stage]');

  if (rule) {
    rule.style.transformOrigin = 'left center';
    void animate(rule, { scaleX: [0, 1] }, {
      duration: seconds(220),
      delay: .06,
      ease: motionEasing.enter,
    });
  }

  if (title) {
    void animate(title, { opacity: [.42, 1], y: [6, 0] }, {
      duration: seconds(300),
      delay: .12,
      ease: motionEasing.enter,
    });
  }

  if (copy.length) {
    void animate([...copy], { opacity: [.52, 1], y: [4, 0] }, {
      duration: seconds(280),
      delay: stagger(.045, { startDelay: .22 }),
      ease: motionEasing.enter,
    });
  }

  if (recordRows.length) {
    void animate([...recordRows], { opacity: [.58, 1], y: [2, 0] }, {
      duration: seconds(240),
      delay: stagger(.03, { startDelay: .30 }),
      ease: motionEasing.standard,
    });
  }

  if (fragmentStages.length) {
    void animate([...fragmentStages], { opacity: [.48, 1], y: [3, 0] }, {
      duration: seconds(300),
      delay: stagger(.035, { startDelay: .38 }),
      ease: motionEasing.enter,
    });
  }
}
