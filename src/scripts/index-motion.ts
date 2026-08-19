import { FEATURES } from '../data/features';
import { runHeroEntrance } from '../motion/heroEntrance';
import { initSectionReveals } from '../motion/sectionReveal';

const hero = document.querySelector<HTMLElement>('[data-index-hero]');
if (hero) runHeroEntrance(hero);

const destroySections = FEATURES.sectionReveals ? initSectionReveals(document) : () => undefined;
if (import.meta.hot) import.meta.hot.dispose(destroySections);
