import { scroll } from 'motion';
import { hasFinePointer, prefersReducedMotion } from '../motion/reducedMotion';
import { calculateProximity } from '../motion/proximity';

interface FragmentGeometry {
  element: HTMLElement;
  centerX: number;
  centerY: number;
}

const ACTIVATION_RADIUS = 220;
const FULL_WAKE_DELAY = 220;
const MOBILE_INTERVAL = 3600;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function initLivingIndex(root: HTMLElement): () => void {
  const fragments = [...root.querySelectorAll<HTMLElement>('[data-index-fragment]')];
  if (!fragments.length) return () => undefined;

  const scanner = root.querySelector<HTMLElement>('[data-index-scanner]');
  const finePointer = hasFinePointer();
  const reduced = prefersReducedMotion();
  const scannerEnabled = root.dataset.scannerEnabled === 'true' && finePointer && !reduced;
  const proximityEnabled = root.dataset.proximityEnabled !== 'false' && finePointer && !reduced;
  let geometries: FragmentGeometry[] = [];
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let mobileTimer = 0;
  let mobileIndex = 0;
  let fieldVisible = true;
  const wakeTimers = new Map<HTMLElement, number>();
  const cleanups: Array<() => void> = [];

  root.dataset.livingIndexMode = reduced ? 'static' : finePointer ? 'proximity' : 'mobile';

  const measure = () => {
    const fieldRect = root.getBoundingClientRect();
    geometries = fragments.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        element,
        centerX: rect.left - fieldRect.left + rect.width / 2,
        centerY: rect.top - fieldRect.top + rect.height / 2,
      };
    });
  };

  const clearWake = (fragment: HTMLElement) => {
    const timer = wakeTimers.get(fragment);
    if (timer) window.clearTimeout(timer);
    wakeTimers.delete(fragment);
    if (!fragment.matches(':focus-within') && !fragment.matches(':hover')) fragment.dataset.awake = 'false';
  };

  const queueWake = (fragment: HTMLElement) => {
    clearWake(fragment);
    const timer = window.setTimeout(() => {
      fragment.dataset.awake = 'true';
      wakeTimers.delete(fragment);
    }, FULL_WAKE_DELAY);
    wakeTimers.set(fragment, timer);
  };

  const resetProximity = () => {
    fragments.forEach((fragment) => {
      fragment.style.setProperty('--proximity', '0');
      fragment.style.setProperty('--proximity-x', '0px');
      fragment.style.setProperty('--proximity-y', '0px');
      if (!fragment.matches(':focus-within') && !fragment.matches(':hover')) fragment.dataset.awake = 'false';
    });
    if (scanner) scanner.style.opacity = '0';
  };

  const updateProximity = () => {
    frame = 0;
    if (!proximityEnabled) return;

    const byId = new Map(geometries.map((geometry, index) => [String(index), geometry.element]));
    const results = calculateProximity(
      geometries.map((geometry, index) => ({ id: String(index), x: geometry.centerX, y: geometry.centerY })),
      { x: pointerX, y: pointerY },
      ACTIVATION_RADIUS,
    );

    results.forEach((result) => {
      const fragment = byId.get(result.id);
      if (!fragment) return;
      fragment.style.setProperty('--proximity', result.intensity.toFixed(3));
      fragment.style.setProperty('--proximity-x', `${result.offsetX.toFixed(2)}px`);
      fragment.style.setProperty('--proximity-y', `${result.offsetY.toFixed(2)}px`);
    });
  };

  if (proximityEnabled) {
    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      if (scannerEnabled && scanner) {
        scanner.style.setProperty('--scan-x', `${clamp(pointerX / Math.max(rect.width, 1)) * 100}%`);
        scanner.style.opacity = '.72';
      }
      if (!frame) frame = requestAnimationFrame(updateProximity);
    };
    const onPointerLeave = () => resetProximity();
    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave);
    cleanups.push(() => root.removeEventListener('pointermove', onPointerMove));
    cleanups.push(() => root.removeEventListener('pointerleave', onPointerLeave));
  }

  fragments.forEach((fragment) => {
    const onEnter = () => queueWake(fragment);
    const onLeave = () => clearWake(fragment);
    const onFocus = () => {
      fragment.dataset.awake = 'true';
      fragment.style.setProperty('--proximity', '1');
    };
    const onBlur = () => {
      if (!fragment.matches(':hover')) fragment.dataset.awake = 'false';
      fragment.style.setProperty('--proximity', '0');
    };
    fragment.addEventListener('pointerenter', onEnter);
    fragment.addEventListener('pointerleave', onLeave);
    fragment.addEventListener('focusin', onFocus);
    fragment.addEventListener('focusout', onBlur);
    cleanups.push(() => fragment.removeEventListener('pointerenter', onEnter));
    cleanups.push(() => fragment.removeEventListener('pointerleave', onLeave));
    cleanups.push(() => fragment.removeEventListener('focusin', onFocus));
    cleanups.push(() => fragment.removeEventListener('focusout', onBlur));
  });

  if (!finePointer && !reduced) {
    const observer = new IntersectionObserver(([entry]) => { fieldVisible = Boolean(entry?.isIntersecting); }, { threshold: .15 });
    observer.observe(root);
    cleanups.push(() => observer.disconnect());

    const advance = () => {
      if (!fieldVisible || document.hidden) return;
      fragments.forEach((fragment) => { fragment.dataset.awake = 'false'; });
      const fragment = fragments[mobileIndex % fragments.length];
      if (fragment) fragment.dataset.awake = 'true';
      mobileIndex += 1;
    };
    advance();
    mobileTimer = window.setInterval(advance, MOBILE_INTERVAL);
    cleanups.push(() => window.clearInterval(mobileTimer));
  }

  if (!reduced) {
    const stopScroll = scroll((progress: number) => {
      // The field gently resolves into the structured Featured section instead of
      // flying its fragments across the page.
      const resolve = clamp((progress - .50) / .42);
      root.style.setProperty('--field-resolve', resolve.toFixed(3));
    }, { target: root, offset: ['start start', 'end start'] });
    cleanups.push(stopScroll);
  }

  const resizeObserver = new ResizeObserver(() => measure());
  resizeObserver.observe(root);
  cleanups.push(() => resizeObserver.disconnect());
  measure();

  const onVisibility = () => {
    if (document.hidden) resetProximity();
  };
  document.addEventListener('visibilitychange', onVisibility);
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

  return () => {
    if (frame) cancelAnimationFrame(frame);
    wakeTimers.forEach((timer) => window.clearTimeout(timer));
    cleanups.forEach((cleanup) => cleanup());
  };
}

const roots = [...document.querySelectorAll<HTMLElement>('[data-living-index]')];
const destroyers = roots.map(initLivingIndex);

if (import.meta.hot) {
  import.meta.hot.dispose(() => destroyers.forEach((destroy) => destroy()));
}
