import React from 'react';
import { motion } from 'framer-motion';
import { NashAvatar } from './NashAvatar';

interface AttractScreenProps {
  onStart: () => void;
}

export const AttractScreen: React.FC<AttractScreenProps> = ({ onStart }) => {
  return (
    <motion.div
      data-testid="attract-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onStart}
      className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center cursor-pointer"
    >
      <NashAvatar mood="neutral" size={120} />
      <div>
        <h1 className="font-display text-5xl sm:text-6xl text-paper tracking-tight">Nash</h1>
        <p className="font-mono text-sm uppercase tracking-widest text-accent mt-2">
          Rock · Paper · Scissors vs AI
        </p>
      </div>

      {/* Parent-at-a-glance: always visible on attract, answers "why is this not just luck"
          before the first round even starts (PLAN.md "Parent & student appeal"). */}
      <p className="font-body text-base text-muted max-w-md leading-relaxed">
        This AI starts blind and learns your pattern within a few rounds — the same kind of
        sequence prediction behind autocomplete and recommendation engines, playing
        rock-paper-scissors instead.
      </p>

      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="font-mono text-xs uppercase tracking-widest text-muted border border-panel-line px-5 py-3"
      >
        Tap anywhere to start
      </motion.div>
    </motion.div>
  );
};
