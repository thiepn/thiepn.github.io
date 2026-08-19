interface PerfSnapshot {
  lcp: number;
  cls: number;
  longTasks: number;
  resources: number;
  transferBytes: number;
}

const snapshot: PerfSnapshot = { lcp: 0, cls: 0, longTasks: 0, resources: 0, transferBytes: 0 };

function observe(type: string, callback: (entry: PerformanceEntry) => void) {
  try {
    const observer = new PerformanceObserver((list) => list.getEntries().forEach(callback));
    observer.observe({ type, buffered: true });
    return observer;
  } catch {
    return null;
  }
}

observe('largest-contentful-paint', (entry) => { snapshot.lcp = Math.max(snapshot.lcp, entry.startTime); });
observe('layout-shift', (entry) => {
  const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
  if (!shift.hadRecentInput) snapshot.cls += shift.value ?? 0;
});
observe('longtask', () => { snapshot.longTasks += 1; });

function publish() {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  snapshot.resources = resources.length;
  snapshot.transferBytes = resources.reduce((sum, entry) => sum + Math.max(0, entry.transferSize || entry.encodedBodySize || 0), 0);
  document.documentElement.dataset.perfDebug = 'true';
  Object.assign(window, { __THIEPN_PERF__: snapshot });
  console.table({
    LCP_ms: Math.round(snapshot.lcp),
    CLS: Number(snapshot.cls.toFixed(4)),
    Long_tasks: snapshot.longTasks,
    Resources: snapshot.resources,
    Transfer_KB: Math.round(snapshot.transferBytes / 1024),
  });
}

if (document.readyState === 'complete') publish();
else window.addEventListener('load', publish, { once: true });

export {};
