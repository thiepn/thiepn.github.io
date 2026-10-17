import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Pin, Calendar, Clock } from 'lucide-react';
import { formatShortDate, formatDateTime, formatRelativeTime } from '../../utils/date';

interface MasonryTiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  disabled?: boolean;
  layoutId?: string;
  layout?: boolean | 'position' | 'size';
  isPinned?: boolean;
  createdAt?: string;
  updatedAt?: string;
  index?: number;
}

export const MasonryTiltCard: React.FC<MasonryTiltCardProps> = ({
  children,
  className = '',
  maxTilt = 4.5,
  disabled = false,
  layoutId,
  layout = true,
  isPinned = false,
  createdAt,
  updatedAt,
  index,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Check for touch or reduced motion settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionMedia.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      motionMedia.addEventListener('change', handleMotionChange);

      const touchMedia = window.matchMedia('(pointer: coarse)');
      setIsTouchDevice(touchMedia.matches);

      const handleTouchChange = (e: MediaQueryListEvent) => {
        setIsTouchDevice(e.matches);
      };

      touchMedia.addEventListener('change', handleTouchChange);

      return () => {
        motionMedia.removeEventListener('change', handleMotionChange);
        touchMedia.removeEventListener('change', handleTouchChange);
      };
    }
  }, []);

  // Motion values for relative cursor coordinates [-0.5, 0.5]
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth responsive spring physics
  const springConfig = { stiffness: 280, damping: 22, mass: 0.35 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Map spring coordinates to subtle rotation angles
  const rotateX = useTransform(springY, [-0.5, 0.5], [maxTilt, -maxTilt]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-maxTilt, maxTilt]);

  // Subtle interactive light reflection glare
  const glareX = useTransform(springX, [-0.5, 0.5], ['20%', '80%']);
  const glareY = useTransform(springY, [-0.5, 0.5], ['20%', '80%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || prefersReducedMotion || isTouchDevice) return;
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const layoutTransition = {
    type: 'spring' as const,
    stiffness: 350,
    damping: 30,
    mass: 0.8,
  };

  const renderTooltip = () => (
    <AnimatePresence>
      {isHovered && (createdAt || updatedAt) && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-35 pointer-events-none max-w-[94%] w-max px-2.5 py-1 rounded-lg bg-stone-900/95 dark:bg-stone-950/95 text-stone-100 backdrop-blur-md border border-stone-700/80 dark:border-stone-700 shadow-xl flex items-center gap-2.5 text-[10px] font-medium select-none ring-1 ring-black/10"
        >
          {createdAt && (
            <div
              className="flex items-center gap-1 text-stone-300"
              title={`Created on ${formatDateTime(createdAt) || formatShortDate(createdAt)}`}
            >
              <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
              <span>
                <span className="text-stone-400 font-normal">Created:</span>{' '}
                <span className="font-semibold text-stone-200">{formatShortDate(createdAt)}</span>
              </span>
            </div>
          )}
          {createdAt && updatedAt && (
            <span className="w-1 h-1 rounded-full bg-stone-600 shrink-0" />
          )}
          {updatedAt && (
            <div
              className="flex items-center gap-1 text-stone-300"
              title={`Last updated ${formatDateTime(updatedAt) || formatShortDate(updatedAt)}`}
            >
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>
                <span className="text-stone-400 font-normal">Updated:</span>{' '}
                <span className="font-semibold text-stone-200">{formatRelativeTime(updatedAt)}</span>
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderPinIndicator = () =>
    isPinned ? (
      <div
        className="absolute -top-1.5 -right-1.5 z-25 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-amber-500 text-stone-950 shadow-md border-2 border-white dark:border-stone-900 pointer-events-none transform transition-transform group-hover:scale-110"
        title="Pinned note"
        aria-label="Pinned note indicator"
      >
        <Pin className="w-3 h-3 fill-stone-950 text-stone-950 stroke-[2.5]" />
      </div>
    ) : null;

  // If disabled, reduced motion, or touch device, render animated layout container without 3D tilt
  if (disabled || prefersReducedMotion || isTouchDevice) {
    return (
      <motion.div
        layout={!prefersReducedMotion && layout}
        layoutId={layoutId}
        initial={false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.15 } }}
        transition={
          prefersReducedMotion
            ? { opacity: { duration: 0.15 } }
            : { layout: layoutTransition }
        }
        ref={cardRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative group ${className}`}
      >
        {renderPinIndicator()}
        {children}
        {renderTooltip()}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout={layout}
      layoutId={layoutId}
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.93, y: -4, transition: { duration: 0.16, ease: 'easeOut' } }}
      transition={{ layout: layoutTransition }}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1000 }}
      className={`relative group ${className}`}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        animate={{
          scale: isHovered ? 1.015 : 1,
          y: isHovered ? -3 : 0,
        }}
        transition={{
          duration: 0.22,
          ease: 'easeOut',
        }}
        className="w-full h-full relative"
      >
        {renderPinIndicator()}
        {children}

        {/* Tactile Glare / Sheen Overlay */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10 transition-opacity duration-300 overflow-hidden"
          style={{
            opacity: isHovered ? 0.1 : 0,
            background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.9), transparent 60%)`,
          }}
        />
      </motion.div>
      {renderTooltip()}
    </motion.div>
  );
};

