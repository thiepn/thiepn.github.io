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
      duration: seconds(250),
      delay: .10,
      ease: motionEasing.enter,
    });
  }

  if (title) {
    void animate(title, { opacity: [0, 1], y: [12, 0] }, {
      duration: seconds(340),
      delay: .18,
      ease: motionEasing.enter,
    });
  }

  if (copy.length) {
    void animate([...copy], { opacity: [0, 1], y: [9, 0] }, {
      duration: seconds(330),
      delay: stagger(.07, { startDelay: .32 }),
      ease: motionEasing.enter,
    });
  }

  if (recordRows.length) {
    void animate([...recordRows], { opacity: [.24, 1], y: [5, 0] }, {
      duration: seconds(280),
      delay: stagger(.045, { startDelay: .42 }),
      ease: motionEasing.standard,
    });
  }

  if (fragmentStages.length) {
    void animate([...fragmentStages], { opacity: [0, 1], scale: [.97, 1], y: [6, 0] }, {
      duration: seconds(360),
      delay: stagger(.045, { startDelay: .55 }),
      ease: motionEasing.enter,
    });
  }
}
