export function normalizeConcurrency(value, fallback = 6, maximum = 12) {
  const parsed = Number(value);
  const candidate = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  return Math.max(1, Math.min(maximum, candidate));
}

export async function forEachConcurrent(items, concurrency, worker) {
  const values = Array.from(items);
  if (!values.length) return;

  const limit = Math.min(normalizeConcurrency(concurrency), values.length);
  let nextIndex = 0;

  const runners = Array.from({ length: limit }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      await worker(values[index], index);
    }
  });

  await Promise.all(runners);
}
