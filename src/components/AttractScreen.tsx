import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ASK_YOUR_KID_LINES } from '../character/nash';
import { NashAvatar } from './NashAvatar';
import { glyphFor } from './RPSGlyph';
import { MOVE_TILE, MOVE_LABEL, tileStyle } from './moveTheme';
import type { Move } from '../data/types';

interface AttractScreenProps {
  onStart: () => void;
}

const ASK_YOUR_KID_ROTATE_MS = 6000;
const MOVES: Move[] = ['rock', 'paper', 'scissors'];

export const AttractScreen: React.FC<AttractScreenProps> = ({ onStart }) => {
  const [askIndex, setAskIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setAskIndex((i) => (i + 1) % ASK_YOUR_KID_LINES.length);
    }, ASK_YOUR_KID_ROTATE_MS);
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

  return (
    <motion.div
      data-testid="attract-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onStart}
      className="w-full min-h-screen cursor-pointer select-none grid lg:grid-cols-[1.05fr_1fr] items-center gap-12 px-6 sm:px-12 lg:px-20 pt-20 pb-10 max-w-7xl mx-auto"
    >
      <div className="flex flex-col gap-5 max-w-xl">
        <div className="flex items-center gap-4">
          <NashAvatar mood="neutral" size={64} />
          <div>
            <p className="label !text-ink">Nash</p>
            <p className="display-i text-xl text-ink/80">“I’m Nash. I learn as we go.”</p>
          </div>
        </div>

        <h1 className="display text-[clamp(3rem,6.5vw,5rem)]">Can you out&shy;guess Nash?</h1>
        <div className="h-1 w-24 bg-rock rounded-full" />

        <p className="text-xl sm:text-2xl leading-snug text-ink/85">
          Rock, paper, scissors against a machine that starts blind and learns your habits. Every round it
          gets a little harder to fool.
        </p>

        <div>
          <motion.span
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="btn btn-solid text-lg px-10 min-h-16"
          >
            Tap anywhere to play
          </motion.span>
          <p className="text-sm text-mute mt-3">
            or press <span className="kbd">Space</span> / <span className="kbd">Enter</span>
          </p>
        </div>

        <div className="border-t-2 border-ink/15 pt-5 flex flex-col gap-3" data-testid="ask-your-kid">
          <div className="min-h-7">
            <AnimatePresence mode="wait">
              <motion.p
                key={askIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="italic text-ink/80 text-lg"
              >
                {ASK_YOUR_KID_LINES[askIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="text-sm text-mute">Shows the same sequence prediction behind autocomplete and recommendations.</p>
        </div>
      </div>

      {/* A fanned stack of sample rounds, like the cards Nash is reading from. */}
      <div className="relative hidden md:block h-[30rem] w-full max-w-md justify-self-center" aria-hidden="true">
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: 7 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 140, damping: 16 }}
          className="absolute top-0 right-0 w-72 rounded-[1.75rem] bg-blade text-bone p-6"
        >
          <p className="label !text-bone/70">Round 5</p>
          <p className="display-i text-2xl mt-1">“Nash expected paper.”</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: -5 }}
          transition={{ delay: 0.18, type: 'spring', stiffness: 140, damping: 16 }}
          className="absolute bottom-6 left-0 w-64 rounded-[1.75rem] bg-sheet p-6"
        >
          <p className="label !text-ink/70">Round 3</p>
          <p className="display-i text-2xl mt-1">“Rock again?”</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: -1.5 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 140, damping: 16 }}
          className="absolute top-20 left-6 right-6 rounded-[1.75rem] bg-[#fbf8f1] border-[3px] border-ink p-7"
        >
          <p className="label mb-3">A sample round</p>
          <p className="display text-4xl leading-[0.98]">You’ve thrown rock three times.</p>
          <p className="text-lg text-ink/75 mt-3">Nash noticed. What do you play next?</p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            {MOVES.map((move) => (
              <div
                key={move}
                className={`${MOVE_TILE[move].bg} ${MOVE_TILE[move].fg} rounded-2xl py-3 flex flex-col items-center gap-1`}
                style={tileStyle(move)}
              >
                <svg viewBox="0 0 100 100" className="w-9 h-9">
                  {glyphFor(move)}
                </svg>
                <span className="text-sm font-semibold">{MOVE_LABEL[move]}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
