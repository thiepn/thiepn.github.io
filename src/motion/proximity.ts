export interface ProximityPoint {
  id: string;
  x: number;
  y: number;
}

export interface ProximityResult {
  id: string;
  distance: number;
  intensity: number;
  offsetX: number;
  offsetY: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Pure proximity calculation used by the Living Index controller and tests.
 * The nearest item can fully wake, the second is deliberately restrained, and
 * all motion is capped to a sub-2px mechanical nudge.
 */
export function calculateProximity(
  points: ProximityPoint[],
  pointer: { x: number; y: number },
  radius = 220,
  maxMovement = 1.8,
): ProximityResult[] {
  const ranked = points
    .map((point) => ({ point, distance: Math.hypot(pointer.x - point.x, pointer.y - point.y) }))
    .sort((a, b) => a.distance - b.distance);

  return ranked.map(({ point, distance }, index) => {
    let intensity = clamp(1 - distance / radius);
    if (index === 1) intensity = Math.min(intensity, .52);
    if (index > 1) intensity *= .28;

    const dx = pointer.x - point.x;
    const dy = pointer.y - point.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const movement = intensity * maxMovement;

    return {
      id: point.id,
      distance,
      intensity,
      offsetX: dx / length * movement,
      offsetY: dy / length * movement,
    };
  });
}
