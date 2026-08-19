import {
  getPreviewActivationDelay,
  getPreviewActiveLimit,
  normalizePreviewDuration,
  type PreviewKind,
  type PreviewState,
} from '../lib/preview-core';
import { prefersReducedMotion } from '../motion/reducedMotion';
import { FEATURES } from '../data/features';

type PreviewElement = HTMLElement & { dataset: DOMStringMap & { previewState?: PreviewState } };

const roots = FEATURES.animatedPreviews ? Array.from(document.querySelectorAll<PreviewElement>('[data-preview-root]')) : [];
const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const activeLimit = getPreviewActiveLimit(coarsePointer);
const active: PreviewInstance[] = [];

class PreviewInstance {
  root: PreviewElement;
  trigger: HTMLElement;
  video: HTMLVideoElement | null;
  kind: PreviewKind;
  duration: number;
  visible = true;
  armTimer = 0;
  settleTimer = 0;
  mediaPrepared = false;
  mediaFailed = false;

  constructor(root: PreviewElement) {
    this.root = root;
    this.kind = (root.dataset.previewKind ?? 'static') as PreviewKind;
    this.duration = normalizePreviewDuration(root.dataset.previewDuration);
    this.video = root.querySelector<HTMLVideoElement>('[data-preview-video]');
    const parentLink = root.closest<HTMLElement>('a[href]');
    this.trigger = root.dataset.previewFocusable === 'true' ? root : (parentLink ?? root);
    this.video?.addEventListener('playing', this.onVideoPlaying);
    this.video?.addEventListener('error', this.onVideoError);
    this.setState('poster');
  }

  onVideoPlaying = () => { this.root.dataset.previewMedia = 'video'; };
  onVideoError = () => {
    this.mediaFailed = true;
    this.root.dataset.previewMedia = 'fallback';
    if (this.root.dataset.previewState === 'armed') this.activate();
  };

  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) this.reset();
  }

  setState(state: PreviewState) {
    this.root.dataset.previewState = state;
    const label = this.root.querySelector<HTMLElement>('[data-preview-status]');
    if (!label) return;
    const provenance = this.root.dataset.previewProvenance;
    const activeLabel = provenance === 'captured' ? 'LIVE' : 'DEMO';
    label.textContent = state === 'poster' ? 'PREVIEW' : state === 'armed' ? 'READY' : state === 'active' ? activeLabel : state === 'settled' ? 'SET' : 'POSTER';
  }

  prepareMedia() {
    if (this.kind !== 'video' || !this.video || this.mediaPrepared || this.mediaFailed) return;
    const source = this.root.dataset.previewSource;
    if (!source) {
      this.mediaFailed = true;
      this.setState('unavailable');
      return;
    }
    this.mediaPrepared = true;
    this.video.src = source;
    this.video.load();
  }

  arm() {
    if (!this.visible || prefersReducedMotion() || this.kind === 'static') return;
    window.clearTimeout(this.armTimer);
    window.clearTimeout(this.settleTimer);
    this.setState('armed');
    this.prepareMedia();
    this.armTimer = window.setTimeout(() => this.activate(), getPreviewActivationDelay(this.kind));
  }

  activate() {
    if (!this.visible || prefersReducedMotion()) return;
    window.clearTimeout(this.armTimer);
    while (active.length >= activeLimit) active.shift()?.reset();
    if (!active.includes(this)) active.push(this);
    this.setState('active');

    if (this.kind === 'video' && this.video && !this.mediaFailed) {
      this.video.currentTime = 0;
      const play = this.video.play();
      play?.catch(() => {
        this.mediaFailed = true;
        this.root.dataset.previewMedia = 'fallback';
      });
    }

    window.clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => this.settle(), this.duration);
  }

  settle() {
    if (this.root.dataset.previewState !== 'active') return;
    this.video?.pause();
    this.setState('settled');
    const index = active.indexOf(this);
    if (index >= 0) active.splice(index, 1);
  }

  reset() {
    window.clearTimeout(this.armTimer);
    window.clearTimeout(this.settleTimer);
    this.video?.pause();
    if (this.video) this.video.currentTime = 0;
    delete this.root.dataset.previewMedia;
    this.setState('poster');
    const index = active.indexOf(this);
    if (index >= 0) active.splice(index, 1);
  }

  destroy() {
    this.reset();
    this.video?.removeEventListener('playing', this.onVideoPlaying);
    this.video?.removeEventListener('error', this.onVideoError);
  }
}

const instanceByRoot = new Map<PreviewElement, PreviewInstance>();
roots.forEach((root) => instanceByRoot.set(root, new PreviewInstance(root)));
const instances = Array.from(instanceByRoot.values());

function rootFromEventTarget(target: EventTarget | null): PreviewElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<PreviewElement>('[data-preview-root]');
}

// Event delegation avoids four listeners per preview when the archive grows to
// hundreds of artifacts. Pointer/focus transitions inside the same preview are ignored.
const onPointerOver = (event: PointerEvent) => {
  if (coarsePointer) return;
  const root = rootFromEventTarget(event.target);
  if (!root || root.contains(event.relatedTarget as Node | null)) return;
  instanceByRoot.get(root)?.arm();
};
const onPointerOut = (event: PointerEvent) => {
  const root = rootFromEventTarget(event.target);
  if (!root || root.contains(event.relatedTarget as Node | null)) return;
  instanceByRoot.get(root)?.reset();
};
const onFocusIn = (event: FocusEvent) => {
  const root = rootFromEventTarget(event.target);
  if (!root) return;
  instanceByRoot.get(root)?.arm();
};
const onFocusOut = (event: FocusEvent) => {
  const root = rootFromEventTarget(event.target);
  if (!root || root.contains(event.relatedTarget as Node | null)) return;
  instanceByRoot.get(root)?.reset();
};

document.addEventListener('pointerover', onPointerOver, { passive: true });
document.addEventListener('pointerout', onPointerOut, { passive: true });
document.addEventListener('focusin', onFocusIn);
document.addEventListener('focusout', onFocusOut);

let observer: IntersectionObserver | null = null;
if ('IntersectionObserver' in window) {
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      instanceByRoot.get(entry.target as PreviewElement)?.setVisible(entry.isIntersecting && entry.intersectionRatio > 0.04);
    }
  }, { rootMargin: '240px 0px', threshold: [0, .05] });
  roots.forEach((root) => observer?.observe(root));
}

const onVisibility = () => { if (document.hidden) instances.forEach((instance) => instance.reset()); };
const onPageHide = () => instances.forEach((instance) => instance.reset());
document.addEventListener('visibilitychange', onVisibility);
window.addEventListener('pagehide', onPageHide);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    observer?.disconnect();
    document.removeEventListener('pointerover', onPointerOver);
    document.removeEventListener('pointerout', onPointerOut);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    instances.forEach((instance) => instance.destroy());
  });
}
