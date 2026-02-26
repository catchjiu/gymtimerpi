import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

type TimerMode = 'WORK' | 'REST' | 'SETTING';

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseBufferToSeconds = (buffer: string): number => {
  const digits = buffer.replace(/\D/g, '');
  if (digits.length === 0) return 0;
  if (digits.length === 1) return parseInt(digits, 10) * 60;
  if (digits.length === 2) return parseInt(digits, 10) * 60;
  const mins = parseInt(digits.slice(0, -2), 10) || 0;
  const secs = parseInt(digits.slice(-2), 10) || 0;
  return Math.min(mins * 60 + secs, 99 * 60 + 59);
};

const clampTime = (seconds: number): number =>
  Math.max(0, Math.min(seconds, 99 * 60 + 59));

export default function GymTimer() {
  const [totalSeconds, setTotalSeconds] = useState(90);
  const [initialSeconds, setInitialSeconds] = useState(90);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('WORK');
  const [keypadBuffer, setKeypadBuffer] = useState('');
  const [isKeypadMode, setIsKeypadMode] = useState(false);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const lastBeepSecond = useRef<number | null>(null);
  const keypadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialSecondsRef = useRef(initialSeconds);
  initialSecondsRef.current = initialSeconds;

  const progress = initialSeconds > 0 ? (totalSeconds / initialSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 180;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const resetKeypadTimeout = useCallback(() => {
    if (keypadTimeoutRef.current) clearTimeout(keypadTimeoutRef.current);
    keypadTimeoutRef.current = setTimeout(() => {
      if (isKeypadMode && keypadBuffer.length > 0) {
        const newTime = parseBufferToSeconds(keypadBuffer);
        setTotalSeconds(newTime);
        setInitialSeconds(newTime);
        setKeypadBuffer('');
        setIsKeypadMode(false);
      }
      keypadTimeoutRef.current = null;
    }, 3000);
  }, [isKeypadMode, keypadBuffer]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsRunning((prev) => !prev);
          if (!isRunning) setMode('WORK');
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (isKeypadMode) {
            setKeypadBuffer('');
            setIsKeypadMode(false);
          }
          setTotalSeconds((prev) => clampTime(prev + 5));
          setInitialSeconds((prev) => clampTime(prev + 5));
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (isKeypadMode) {
            setKeypadBuffer('');
            setIsKeypadMode(false);
          }
          setTotalSeconds((prev) => clampTime(prev - 5));
          setInitialSeconds((prev) => clampTime(prev - 5));
          break;

        case 'r':
        case 'R':
          e.preventDefault();
          setTotalSeconds(initialSeconds);
          setIsRunning(false);
          setKeypadBuffer('');
          setIsKeypadMode(false);
          lastBeepSecond.current = null;
          setMode('SETTING');
          break;

        case 'Enter':
          e.preventDefault();
          if (isKeypadMode) {
            const newTime =
              keypadBuffer.length > 0 ? parseBufferToSeconds(keypadBuffer) : totalSeconds;
            setTotalSeconds(newTime);
            setInitialSeconds(newTime);
            setKeypadBuffer('');
            setIsKeypadMode(false);
            if (keypadTimeoutRef.current) {
              clearTimeout(keypadTimeoutRef.current);
              keypadTimeoutRef.current = null;
            }
          }
          break;

        default:
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            setIsKeypadMode(true);
            const newBuffer = (keypadBuffer + e.key).slice(-4);
            setKeypadBuffer(newBuffer);
            resetKeypadTimeout();
          }
          break;
      }
    },
    [isRunning, initialSeconds, totalSeconds, keypadBuffer, isKeypadMode, resetKeypadTimeout]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTotalSeconds((prev) => {
        const next = prev - 1;

        if (next === 3 || next === 2 || next === 1) {
          if (lastBeepSecond.current !== next) {
            lastBeepSecond.current = next;
            setFlashTrigger((t) => t + 1);
            console.log('BEEP_SHORT');
            fetch('http://127.0.0.1:8765/beep?type=short').catch(() => {});
          }
        } else if (next === 0) {
          if (lastBeepSecond.current !== 0) {
            lastBeepSecond.current = 0;
            setShakeTrigger((t) => t + 1);
            console.log('BEEP_LONG');
            fetch('http://127.0.0.1:8765/beep?type=long').catch(() => {});
          }
        } else if (next < 0) {
          setIsRunning(false);
          return initialSecondsRef.current;
        } else {
          lastBeepSecond.current = null;
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const displayTime = isKeypadMode
    ? keypadBuffer.length > 0
      ? formatTime(parseBufferToSeconds(keypadBuffer))
      : formatTime(totalSeconds)
    : formatTime(Math.max(0, totalSeconds));

  const statusLabel =
    mode === 'WORK' ? 'WORK' : mode === 'REST' ? 'REST' : 'SETTING';

  return (
    <div className="min-h-screen w-full bg-charcoal flex flex-col items-center justify-center p-8 overflow-hidden select-none">
      {/* Glassmorphism Status Badge */}
      <motion.div
        key={statusLabel}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 px-8 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
      >
        <span className="text-neon-mint font-bold text-xl tracking-widest">
          {statusLabel}
        </span>
      </motion.div>

      {/* Main Timer Display */}
      <motion.div
        key={shakeTrigger}
        animate={
          shakeTrigger > 0
            ? {
                x: [0, -12, 12, -12, 12, -8, 8, -4, 4, 0],
                transition: { duration: 0.5 },
              }
            : {}
        }
        className="relative"
      >
        {/* Circular Progress Ring - scaled for 1080p kiosk */}
        <div className="relative w-[480px] h-[480px] min-[1920px]:w-[540px] min-[1920px]:h-[540px] flex items-center justify-center">
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 400 400"
          >
            <circle
              cx="200"
              cy="200"
              r="180"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="12"
            />
            <motion.circle
              cx="200"
              cy="200"
              r="180"
              fill="none"
              stroke="#2efd6d"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </svg>

          {/* Timer Digits */}
          <motion.div
            key={flashTrigger}
            animate={
              flashTrigger > 0
                ? {
                    filter: ['brightness(1)', 'brightness(1.6)', 'brightness(1)'],
                    transition: { duration: 0.15 },
                  }
                : {}
            }
            className={`absolute flex flex-col items-center ${
              isKeypadMode ? 'animate-pulse-input' : ''
            }`}
          >
            <span className="text-[10rem] sm:text-[11rem] font-extrabold text-white font-sans tabular-nums tracking-tighter drop-shadow-[0_0_60px_rgba(46,253,109,0.35)]" style={{ textShadow: '0 0 80px rgba(46,253,109,0.2)' }}>
              {displayTime}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Keypad Input Overlay */}
      <AnimatePresence>
        {isKeypadMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 px-4 py-2 rounded-xl border border-neon-mint/30 bg-neon-mint/5 backdrop-blur-sm"
          >
            <span className="text-neon-mint/90 text-sm font-medium tracking-wider">
              INPUT · Press Enter to confirm · Auto-confirm in 3s
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Hints */}
      <div className="mt-10 flex gap-8 text-white/40 text-sm font-medium items-center">
        <span className="flex items-center gap-2">
          {isRunning ? (
            <Pause className="w-4 h-4 text-neon-mint/60" />
          ) : (
            <Play className="w-4 h-4 text-neon-mint/60" />
          )}
          <kbd className="px-2 py-1 rounded bg-white/10 font-mono">SPACE</kbd>
          Start/Stop
        </span>
        <span className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-white/10 font-mono">↑</kbd>
          <kbd className="px-2 py-1 rounded bg-white/10 font-mono">↓</kbd>
          ±5s
        </span>
        <span className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-white/10 font-mono">0-9</kbd>
          Keypad
        </span>
        <span className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-white/10 font-mono">R</kbd>
          Reset
        </span>
      </div>
    </div>
  );
}
