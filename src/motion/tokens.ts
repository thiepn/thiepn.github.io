export const motionTokens = {
  instant: 80,
  fast: 140,
  standard: 220,
  layout: 320,
  page: 440,
  demo: 3200,
} as const;

export const motionEasing = {
  standard: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
  enter: [0.16, 1, 0.3, 1] as [number, number, number, number],
  exit: [0.7, 0, 0.84, 0] as [number, number, number, number],
};
