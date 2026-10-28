import React, { useState, useEffect, useRef } from 'react';

export interface NoteEntranceWrapperProps {
  children: React.ReactNode;
  index: number;
  filterKey?: string;
  className?: string;
  staggerMs?: number;
  maxDelayMs?: number;
}

/**
 * NoteEntranceWrapper provides smooth entrance animations (fade-in, slide-up)
 * to note items using standard Tailwind transition classes.
 *
 * It initiates elements at opacity-0 translate-y-3.5 and transitions smoothly to
 * opacity-100 translate-y-0 with an ease-out timing curve and staggered index delay.
 * Whenever filters, search queries, or note collections change (via filterKey),
 * the entrance animation cleanly re-triggers to improve visual fluidity.
 */
export const NoteEntranceWrapper: React.FC<NoteEntranceWrapperProps> = ({
  children,
  index,
  filterKey = '',
  className = '',
  staggerMs = 22,
  maxDelayMs = 240,
}) => {
  const [isEntered, setIsEntered] = useState(false);
  const isFirstMount = useRef(true);

  useEffect(() => {
    setIsEntered(false);

    let raf1: number | null = null;
    let raf2: number | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setIsEntered(true);
        });
      });
    } else {
      fallbackTimer = setTimeout(() => {
        setIsEntered(true);
      }, 16);
    }

    isFirstMount.current = false;

    return () => {
      if (raf1 !== null) window.cancelAnimationFrame(raf1);
      if (raf2 !== null) window.cancelAnimationFrame(raf2);
      if (fallbackTimer !== null) clearTimeout(fallbackTimer);
    };
  }, [filterKey]);

  const delayMs = Math.min(index * staggerMs, maxDelayMs);

  return (
    <div
      className={`transition-all duration-300 ease-out transform motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100 ${
        isEntered
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-3.5'
      } ${className}`}
      style={{
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
};
