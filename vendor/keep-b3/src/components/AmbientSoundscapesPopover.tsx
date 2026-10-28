import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  CloudRain,
  Flame,
  Waves,
  Wind,
  Volume2,
  VolumeX,
  Keyboard,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { soundscapeService, SoundscapeType } from '../utils/soundscapes';

interface AmbientSoundscapesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AmbientSoundscapesPopover: React.FC<AmbientSoundscapesPopoverProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentType, setCurrentType] = useState<SoundscapeType>(soundscapeService.getCurrentType());
  const [isPlaying, setIsPlaying] = useState<boolean>(soundscapeService.getIsPlaying());
  const [volume, setVolume] = useState<number>(soundscapeService.getVolume());
  const [typewriter, setTypewriter] = useState<boolean>(soundscapeService.isTypewriterEnabled());
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentType(soundscapeService.getCurrentType());
    setIsPlaying(soundscapeService.getIsPlaying());
    setVolume(soundscapeService.getVolume());
    setTypewriter(soundscapeService.isTypewriterEnabled());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelectSound = (type: SoundscapeType) => {
    if (currentType === type && isPlaying) {
      soundscapeService.stop();
      setIsPlaying(false);
    } else {
      soundscapeService.start(type);
      setCurrentType(type);
      setIsPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      soundscapeService.stop();
      setIsPlaying(false);
    } else {
      const typeToPlay = currentType === 'none' ? 'rain' : currentType;
      soundscapeService.start(typeToPlay);
      setCurrentType(typeToPlay);
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    soundscapeService.setVolume(v);
  };

  const handleToggleTypewriter = () => {
    const next = !typewriter;
    setTypewriter(next);
    soundscapeService.setTypewriterEnabled(next);
    if (next) {
      soundscapeService.playTypewriterClick();
    }
  };

  if (!isOpen) return null;

  const presets: { id: SoundscapeType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'rain',
      label: 'Gentle Rain',
      icon: <CloudRain className="w-4 h-4 text-sky-500" />,
      desc: 'Soft rainfall & distant drops',
    },
    {
      id: 'campfire',
      label: 'Campfire',
      icon: <Flame className="w-4 h-4 text-amber-500" />,
      desc: 'Warm logs & crackling embers',
    },
    {
      id: 'waves',
      label: 'Ocean Surf',
      icon: <Waves className="w-4 h-4 text-teal-500" />,
      desc: 'Rhythmic tidal swells',
    },
    {
      id: 'brown_noise',
      label: 'Brown Noise',
      icon: <Wind className="w-4 h-4 text-indigo-400" />,
      desc: 'Deep warm focus drone',
    },
  ];

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-72 p-3.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-2xl shadow-2xl z-50 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-100"
      role="dialog"
      aria-label="Zen Focus Ambient Soundscapes"
    >
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100">
          <Headphones className="w-4 h-4 text-amber-500" />
          <span>Ambient Soundscapes</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          aria-label="Close soundscapes"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset Buttons Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {presets.map((p) => {
          const isActive = isPlaying && currentType === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectSound(p.id)}
              className={`p-2 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                isActive
                  ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-bold shadow-xs'
                  : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="p-1 rounded-md bg-white dark:bg-stone-900 shadow-2xs">
                  {p.icon}
                </span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <span className="text-xs font-semibold leading-tight mt-0.5">{p.label}</span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                {p.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Volume Slider & Play/Pause */}
      <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400 text-[11px]">
            {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>Volume ({Math.round(volume * 100)}%)</span>
          </div>
          <button
            onClick={handleTogglePlay}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              isPlaying
                ? 'bg-amber-500 text-stone-950 border-amber-600'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" /> Play
              </>
            )}
          </button>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          aria-label="Ambient volume slider"
        />
      </div>

      {/* Tactile Keystroke Click Option */}
      <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
          <Keyboard className="w-3.5 h-3.5 text-stone-500" />
          <span className="text-[11px]">Typewriter Keystrokes</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={typewriter}
          onClick={handleToggleTypewriter}
          className={`w-8 h-4 rounded-full transition-colors relative ${
            typewriter ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-700'
          }`}
        >
          <span
            className={`block w-3 h-3 rounded-full bg-white shadow-xs transition-transform absolute top-0.5 ${
              typewriter ? 'left-4.5' : 'left-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
