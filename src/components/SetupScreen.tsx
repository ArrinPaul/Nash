import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MatchDifficulty, GameMode, MatchLength, AIArchetype } from '../data/types';
import { ADAPTIVE_FROM_ROUND } from '../game/ai';

interface SetupScreenProps {
  playerName: string;
  onNameChange: (name: string) => void;
  difficulty: MatchDifficulty | null;
  onDifficultyChange: (d: MatchDifficulty) => void;
  onStart: () => void;
  player2Name?: string;
  onPlayer2NameChange?: (name: string) => void;
  mode?: GameMode;
  onModeChange?: (m: GameMode) => void;
  matchLength?: MatchLength;
  onMatchLengthChange?: (l: MatchLength) => void;
  archetype?: AIArchetype;
  onArchetypeChange?: (a: AIArchetype) => void;
}

type Step = 'name' | 'game' | 'difficulty';

const DIFFICULTY_COPY: Record<MatchDifficulty, { label: string; detail: string }> = {
  fair: {
    label: 'Fair',
    detail: `Guesses at random through round ${ADAPTIVE_FROM_ROUND.fair - 1}, then starts reading you.`,
  },
  ruthless: {
    label: 'Ruthless',
    detail: `Starts reading you from round ${ADAPTIVE_FROM_ROUND.ruthless}, and commits to its read more often.`,
  },
};

const MODES: { id: GameMode; label: string; sub: string }[] = [
  { id: 'vs-ai', label: 'Solo vs Nash', sub: 'First to the target wins' },
  { id: 'survival', label: 'Survival', sub: 'Three lives, no end' },
  { id: 'multiplayer', label: 'Two players', sub: 'Same keyboard' },
];

const ARCHETYPES: { id: AIArchetype; label: string; desc: string }[] = [
  { id: 'nash', label: 'Pattern reader', desc: 'Tracks what you play and which move follows which.' },
  { id: 'psychologist', label: 'Psychologist', desc: 'Bets on win-stay, lose-shift habits.' },
];

export const SetupScreen: React.FC<SetupScreenProps> = ({
  playerName,
  onNameChange,
  difficulty,
  onDifficultyChange,
  onStart,
  player2Name = '',
  onPlayer2NameChange,
  mode = 'vs-ai',
  onModeChange,
  matchLength = 7,
  onMatchLengthChange,
  archetype = 'nash',
  onArchetypeChange,
}) => {
  const [rawStep, setStep] = useState<Step>(playerName.trim() ? 'game' : 'name');
  const isDuel = mode === 'multiplayer';
  // A duel has no difficulty step; if the mode flips while it is showing, fall back to Game.
  const step: Step = isDuel && rawStep === 'difficulty' ? 'game' : rawStep;
  // A duel has no AI to tune, so it skips the difficulty step entirely.
  const steps: { id: Step; label: string }[] = [
    { id: 'name', label: 'Name' },
    { id: 'game', label: 'Game' },
    ...(isDuel ? [] : [{ id: 'difficulty' as Step, label: 'Difficulty' }]),
  ];
  const index = steps.findIndex((s) => s.id === step);

  const lastStep = steps[steps.length - 1].id;
  const canAdvance = step !== 'difficulty' || Boolean(difficulty);

  const advance = () => {
    if (!canAdvance) return;
    if (step === lastStep) {
      onStart();
      return;
    }
    setStep(steps[index + 1].id);
  };
  const back = () => {
    if (index > 0) setStep(steps[index - 1].id);
  };

  // Enter advances unless a button is focused (it would activate that button itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = (document.activeElement?.tagName ?? 'BODY').toLowerCase();
      if (tag === 'button') return;
      e.preventDefault();
      advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const headline =
    step === 'name' ? 'Who’s playing?' : step === 'game' ? 'What are we playing?' : 'How hard should Nash be?';

  return (
    <motion.div
      data-testid="setup-root"
      data-step={step}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full min-h-screen flex flex-col items-center gap-10 px-6 pt-24 pb-12 select-none"
    >
      <ol className="flex items-center gap-3 text-sm font-semibold" aria-label="Setup progress">
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <li aria-hidden="true" className="w-8 sm:w-14 h-0.5 bg-ink/25" />}
            <li
              aria-current={i === index ? 'step' : undefined}
              className={`flex items-center gap-2 ${i <= index ? 'text-ink' : 'text-mute'}`}
            >
              <span
                className={`grid place-items-center w-7 h-7 rounded-full border-2 border-ink text-xs ${
                  i < index ? 'bg-ink text-bone' : i === index ? 'bg-sheet' : 'border-ink/30'
                }`}
              >
                {i < index ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </li>
          </React.Fragment>
        ))}
      </ol>

      <div className="w-full max-w-xl flex flex-col gap-8 flex-1">
        <div className="text-center">
          <p className="label mb-2">
            Step {index + 1} of {steps.length}
          </p>
          <h2 className="display text-5xl sm:text-6xl">{headline}</h2>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col gap-7"
          >
            {step === 'name' && (
              <div>
                <label htmlFor="player-name" className="label block mb-1">
                  Name for the leaderboard (optional)
                </label>
                <input
                  id="player-name"
                  type="text"
                  autoFocus
                  value={playerName}
                  onChange={(e) => onNameChange(e.target.value)}
                  maxLength={24}
                  placeholder="Anonymous"
                  className="field"
                />
              </div>
            )}

            {step === 'game' && (
              <>
                {onModeChange && (
                  <div className="grid sm:grid-cols-3 gap-3" role="group" aria-label="Game type">
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        data-testid={`mode-${m.id}`}
                        className="choice"
                        aria-pressed={mode === m.id}
                        onClick={() => {
                          onModeChange(m.id);
                          if (m.id !== 'vs-ai' && !difficulty) onDifficultyChange('fair');
                        }}
                      >
                        <div className="font-semibold text-lg">{m.label}</div>
                        <div className="choice-sub text-sm text-mute">{m.sub}</div>
                      </button>
                    ))}
                  </div>
                )}

                {mode !== 'survival' && onMatchLengthChange && (
                  <div>
                    <h3 className="label mb-2">Match length</h3>
                    <div className="flex gap-3" role="group" aria-label="Match length">
                      {([3, 7, 11] as MatchLength[]).map((len) => (
                        <button
                          key={len}
                          type="button"
                          className="choice flex-1 !py-3"
                          aria-pressed={matchLength === len}
                          onClick={() => onMatchLengthChange(len)}
                        >
                          <span className="font-semibold text-lg">Best of {len}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isDuel && onPlayer2NameChange && (
                  <div>
                    <label htmlFor="player2-name" className="label block mb-1">
                      Player 2 name &middot; {playerName.trim() || 'Player 1'} uses A S D, they use J K L
                    </label>
                    <input
                      id="player2-name"
                      type="text"
                      value={player2Name}
                      onChange={(e) => onPlayer2NameChange(e.target.value)}
                      maxLength={24}
                      placeholder="Player 2"
                      className="field"
                    />
                  </div>
                )}
              </>
            )}

            {step === 'difficulty' && (
              <>
                <div className="grid sm:grid-cols-2 gap-3" role="group" aria-label="Difficulty">
                  {(Object.keys(DIFFICULTY_COPY) as MatchDifficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      data-testid={`difficulty-${d}`}
                      className="choice"
                      aria-pressed={difficulty === d}
                      onClick={() => onDifficultyChange(d)}
                    >
                      <div className="display-i text-3xl mb-1">{DIFFICULTY_COPY[d].label}</div>
                      <div className="choice-sub text-sm text-mute">{DIFFICULTY_COPY[d].detail}</div>
                    </button>
                  ))}
                </div>

                {onArchetypeChange && (
                  <div>
                    <h3 className="label mb-2">How Nash thinks</h3>
                    <div className="grid sm:grid-cols-2 gap-3" role="group" aria-label="Nash style">
                      {ARCHETYPES.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className="choice"
                          aria-pressed={archetype === a.id}
                          onClick={() => onArchetypeChange(a.id)}
                        >
                          <div className="font-semibold text-lg">{a.label}</div>
                          <div className="choice-sub text-sm text-mute">{a.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col items-center gap-3 mt-2">
          <button
            type="button"
            data-testid={step === lastStep ? 'begin-match' : 'setup-continue'}
            disabled={!canAdvance}
            onClick={advance}
            className="btn btn-solid text-xl min-h-16 w-full"
          >
            {step !== lastStep ? 'Continue' : isDuel ? 'Start duel' : 'Begin match'}
            <span aria-hidden="true">&rarr;</span>
          </button>
          <div className="flex items-center gap-4 text-sm text-mute">
            {index > 0 && (
              <button type="button" onClick={back} className="underline underline-offset-4 font-semibold cursor-pointer">
                Back
              </button>
            )}
            <span>
              or press <span className="kbd">Enter</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
