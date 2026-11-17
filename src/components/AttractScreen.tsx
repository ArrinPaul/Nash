import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ASK_YOUR_KID_LINES } from '../character/nash';
import { glyphFor } from './RPSGlyph';
import { MOVE_LABEL } from './moveTheme';
import type { Move } from '../data/types';

interface AttractScreenProps {
  onStart: () => void;
}

const ASK_YOUR_KID_ROTATE_MS = 6000;
/** How long each shape holds the stage before the next one takes over. */
const STAGE_MS = 1500;

/** The stage repaints itself in the colour of whichever move is on it. */
const STAGE: { move: Move; bg: string; fg: string }[] = [
  { move: 'rock', bg: '#f2603a', fg: '#15120e' },
  { move: 'paper', bg: '#f4d24a', fg: '#15120e' },
  { move: 'scissors', bg: '#2c3cff', fg: '#efe9dc' },
];

export const AttractScreen: React.FC<AttractScreenProps> = ({ onStart }) => {
  const [askIndex, setAskIndex] = useState(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setAskIndex((i) => (i + 1) % ASK_YOUR_KID_LINES.length);
    }, ASK_YOUR_KID_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setStage((s) => (s + 1) % STAGE.length), STAGE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  const current = STAGE[stage];

  return (
    <motion.div
      data-testid="attract-root"
      initial={{ opacity: 0, backgroundColor: current.bg, color: current.fg }}
      animate={{ opacity: 1, backgroundColor: current.bg, color: current.fg }}
      exit={{ opacity: 0 }}
      transition={{ backgroundColor: { duration: 0.45 }, color: { duration: 0.45 }, opacity: { duration: 0.25 } }}
      onClick={onStart}
      className="relative w-full min-h-screen cursor-pointer select-none flex flex-col items-center justify-between px-6 pt-5 pb-5 overflow-hidden"
      style={{ ['--glyph-detail' as string]: current.bg }}
    >
      <p className="display text-3xl self-start" aria-hidden="true">
        Nash
      </p>

      <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
        <div className="relative grid place-items-center w-[min(30vh,60vw)] h-[min(30vh,60vw)]" aria-hidden="true">
          <AnimatePresence mode="popLayout">
            <motion.svg
              key={current.move}
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full"
              initial={{ scale: 0.55, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 1.25, rotate: 10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {glyphFor(current.move)}
            </motion.svg>
          </AnimatePresence>
        </div>

        <ul className="flex items-center gap-5 sm:gap-8 display text-2xl sm:text-3xl" aria-hidden="true">
          {STAGE.map((s) => (
            <li
              key={s.move}
              className="transition-opacity duration-300"
              style={{ opacity: s.move === current.move ? 1 : 0.28 }}
            >
              {MOVE_LABEL[s.move]}
            </li>
          ))}
        </ul>

        <h1 className="display text-[clamp(2.25rem,5.5vw,4.5rem)] max-w-5xl">Can you outguess Nash?</h1>
        <p className="text-lg sm:text-xl max-w-md leading-snug opacity-85">
          A machine that learns your habits, one round at a time.
        </p>

        <div className="flex flex-col items-center gap-2">
          <motion.span
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="btn btn-solid text-lg px-10 min-h-14"
            style={{ borderColor: 'currentColor', background: current.fg, color: current.bg }}
          >
            Tap anywhere to play
          </motion.span>
          <p className="text-sm opacity-75">
            or press <span className="kbd">Space</span> / <span className="kbd">Enter</span>
          </p>
        </div>
      </div>

      <div className="h-8 max-w-xl text-center" data-testid="ask-your-kid">
        <AnimatePresence mode="wait">
          <motion.p
            key={askIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="italic text-base opacity-85"
          >
            {ASK_YOUR_KID_LINES[askIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
