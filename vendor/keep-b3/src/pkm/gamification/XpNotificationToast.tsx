import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Sparkles, Trophy, Flame } from 'lucide-react';

export interface XpNotificationData {
  amount: number;
  reason?: string;
  level: number;
  leveledUp?: boolean;
}

interface XpNotificationToastProps {
  notification: XpNotificationData | null;
  onDismiss: () => void;
}

export const XpNotificationToast: React.FC<XpNotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!notification || !containerRef.current) return;

    // Clean up any existing timeline
    if (tlRef.current) {
      tlRef.current.kill();
    }

    const container = containerRef.current;
    const icon = iconRef.current;
    const badge = badgeRef.current;
    const text = textRef.current;

    // Reset initial state
    gsap.set(container, {
      opacity: 0,
      scale: 0.5,
      y: 40,
      rotation: -3,
      transformOrigin: 'bottom right',
    });

    if (icon) {
      gsap.set(icon, { scale: 0.4, rotation: -20 });
    }

    if (badge) {
      gsap.set(badge, { scale: 0, opacity: 0 });
    }

    if (text) {
      gsap.set(text, { scale: 0.8, opacity: 0 });
    }

    // Build smooth GSAP pop, float, and fade timeline
    const tl = gsap.timeline({
      onComplete: () => {
        onDismiss();
      },
    });

    tlRef.current = tl;

    // 1. "Pop" into view with elastic/back easing
    tl.to(container, {
      opacity: 1,
      scale: 1.06,
      y: -8,
      rotation: 1,
      duration: 0.38,
      ease: 'back.out(2.4)',
    })
      .to(container, {
        scale: 1,
        rotation: 0,
        y: 0,
        duration: 0.18,
        ease: 'power2.out',
      })
      // Stagger icon pop & spin
      .to(
        icon,
        {
          scale: 1.25,
          rotation: 12,
          duration: 0.25,
          ease: 'back.out(3)',
        },
        '-=0.3'
      )
      .to(
        icon,
        {
          scale: 1,
          rotation: 0,
          duration: 0.2,
          ease: 'power1.out',
        },
        '-=0.1'
      )
      // Number counter pop
      .to(
        text,
        {
          opacity: 1,
          scale: 1,
          duration: 0.2,
          ease: 'power2.out',
        },
        '-=0.25'
      );

    // If leveled up, animate the Level Up badge with extra emphasis
    if (notification.leveledUp && badge) {
      tl.to(
        badge,
        {
          opacity: 1,
          scale: 1.15,
          duration: 0.25,
          ease: 'back.out(2)',
        },
        '-=0.2'
      ).to(badge, {
        scale: 1,
        duration: 0.15,
        ease: 'power1.out',
      });
    }

    // 2. Gentle upward float while hovering in view
    tl.to(container, {
      y: -22,
      duration: 2.2,
      ease: 'sine.inOut',
    });

    // 3. Float up slightly faster and fade out smoothly
    tl.to(container, {
      opacity: 0,
      y: -48,
      scale: 0.9,
      duration: 0.45,
      ease: 'power2.in',
    });

    return () => {
      tl.kill();
    };
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isLevelUp = !!notification.leveledUp;

  return (
    <div className="fixed bottom-14 right-6 z-50 pointer-events-none select-none">
      <div
        ref={containerRef}
        className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${
          isLevelUp
            ? 'bg-amber-950/95 border-amber-500/70 text-amber-100 shadow-[0_12px_40px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/40'
            : 'bg-stone-900/95 border-amber-500/30 text-stone-100 shadow-[0_10px_35px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Animated Icon Avatar */}
        <div
          ref={iconRef}
          className={`p-2.5 rounded-xl shrink-0 ${
            isLevelUp
              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 shadow-md shadow-amber-500/30'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}
        >
          {isLevelUp ? (
            <Trophy className="w-5 h-5 drop-shadow" />
          ) : notification.amount >= 50 ? (
            <Flame className="w-5 h-5" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>

        {/* Content details */}
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <span
              ref={textRef}
              className={`font-black tracking-tight text-base ${
                isLevelUp
                  ? 'bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent'
                  : 'text-amber-400'
              }`}
            >
              +{notification.amount} XP
            </span>

            {isLevelUp && (
              <span
                ref={badgeRef}
                className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-extrabold uppercase tracking-wider shadow-xs"
              >
                Level {notification.level} Up!
              </span>
            )}
          </div>

          {notification.reason && (
            <p className="text-xs text-stone-300 font-medium mt-0.5 max-w-[240px] truncate leading-tight">
              {notification.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
