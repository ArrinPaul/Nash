import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createMatchStore } from './store/matchStore';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Advances past RoundScreen's "Nash is picking..." delay so the pick actually submits. */
function advancePastThinking() {
  act(() => {
    vi.advanceTimersByTime(400);
  });
}

function startMatch(difficulty: 'fair' | 'ruthless' = 'fair') {
  fireEvent.click(screen.getByTestId('attract-root'));
  fireEvent.click(screen.getByTestId('setup-continue')); // name
  fireEvent.click(screen.getByTestId('setup-continue')); // game
  fireEvent.click(screen.getByTestId(`difficulty-${difficulty}`));
  fireEvent.click(screen.getByTestId('begin-match'));
}

function playRound(move: 'rock' | 'paper' | 'scissors' = 'rock') {
  fireEvent.click(screen.getByTestId(`move-${move}`));
  advancePastThinking();
  fireEvent.click(screen.getByTestId('continue-round'));
}

describe('App', () => {
  it('renders the attract screen first', () => {
    render(<App store={createMatchStore(() => 0)} />);
    expect(screen.getByTestId('attract-root')).toBeInTheDocument();
  });

  it('tapping attract opens setup, and choosing a difficulty + starting opens round 1', () => {
    render(<App store={createMatchStore(() => 0)} />);
    startMatch('fair');
    expect(screen.getByTestId('round-root')).toHaveAttribute('data-round', '1');
  });

  it('a rapid double-click on a move button only registers one submit (double-submit guard)', () => {
    const store = createMatchStore(() => 0);
    render(<App store={store} />);
    startMatch('fair');
    const rockBtn = screen.getByTestId('move-rock');
    fireEvent.click(rockBtn);
    fireEvent.click(rockBtn); // thinking=true already; RoundScreen's handlePick ignores this
    advancePastThinking();
    expect(store.getState().history).toHaveLength(1);
  });

  it('submitting a move resolves the round and shows the reveal panel with a real verdict', () => {
    render(<App store={createMatchStore(() => 0)} />);
    startMatch('fair');
    fireEvent.click(screen.getByTestId('move-rock'));
    advancePastThinking();
    expect(screen.getByTestId('reveal-root')).toBeInTheDocument();
    expect(screen.getByTestId('round-winner')).toBeInTheDocument();
  });

  it('offers no way to change a pick after the reveal', () => {
    render(<App store={createMatchStore(() => 0)} />);
    startMatch('fair');
    fireEvent.click(screen.getByTestId('move-rock'));
    advancePastThinking();
    expect(screen.queryByTestId('undo-round')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'u' });
    expect(screen.getByTestId('reveal-root')).toBeInTheDocument();
  });

  it("Nash's mood actually differs between the reading warm-up and the locking-pattern phase", () => {
    // rng=0 -> AI's random pick and the counter-weight check are both deterministic.
    render(<App store={createMatchStore(() => 0)} />);
    startMatch('fair');

    // Round 1 (Fair's warm-up, rounds 1-3): reading.
    expect(screen.getByTestId('nash-avatar')).toHaveAttribute('data-mood', 'reading');
    playRound('paper');

    expect(screen.getByTestId('nash-avatar')).toHaveAttribute('data-mood', 'reading');
    playRound('paper');

    expect(screen.getByTestId('nash-avatar')).toHaveAttribute('data-mood', 'reading');
    playRound('paper');

    // Round 4 (Fair's adaptive threshold): locking-pattern. This is the actual UI branching
    // on real match state, not a decorative toggle (PLAN.md risk #2).
    expect(screen.getByTestId('round-root')).toHaveAttribute('data-round', '4');
    expect(screen.getByTestId('nash-avatar')).toHaveAttribute('data-mood', 'locking-pattern');
  });

  it('playing a full match reaches the result screen with a real, non-templated insight', () => {
    render(<App store={createMatchStore(() => 0)} />);
    startMatch('fair');

    let guard = 0;
    while (!screen.queryByTestId('result-root')) {
      if (screen.queryByTestId('round-root')) {
        playRound('paper');
      }
      guard++;
      if (guard > 10) throw new Error('match did not reach the result screen');
    }

    expect(screen.getByTestId('result-root')).toBeInTheDocument();
    expect(screen.getByTestId('match-result')).toBeInTheDocument();
    expect(screen.getByTestId('insights-list').children.length).toBeGreaterThan(0);
  });

  it('shows a streak-building pulse once the player is 2+ rounds into a win streak', () => {
    render(<App store={createMatchStore(() => 0)} />);
    startMatch('fair');

    // Round 1: paper beats the AI's rng=0 random "rock" -> player's 1st win, no pulse yet.
    fireEvent.click(screen.getByTestId('move-paper'));
    advancePastThinking();
    expect(screen.queryByTestId('streak-pulse')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('continue-round'));

    // Round 2: another win -> now 2 in a row, pulse should appear.
    fireEvent.click(screen.getByTestId('move-paper'));
    advancePastThinking();
    expect(screen.getByTestId('streak-pulse')).toHaveTextContent('2 in a row');
  });

  it('flags a new best streak on the result screen the first time anyone plays today', () => {
    render(<App store={createMatchStore(() => 0)} />);
    startMatch('fair');

    let guard = 0;
    while (!screen.queryByTestId('result-root')) {
      if (screen.queryByTestId('round-root')) {
        playRound('paper');
      }
      guard++;
      if (guard > 10) throw new Error('match did not reach the result screen');
    }

    // First match of the (cleared) day: any real streak is automatically a new best.
    expect(screen.getByTestId('new-best-streak')).toBeInTheDocument();
  });

  describe('idle timeout', () => {
    it('returns to attract after 45s of no interaction', () => {
      render(<App store={createMatchStore(() => 0)} />);
      startMatch('fair');
      act(() => {
        vi.advanceTimersByTime(46000);
      });
      expect(screen.getByTestId('attract-root')).toBeInTheDocument();
    });
  });
});

describe('shot clock', () => {
  it('throws a random move for you if you stall after SHOOT', () => {
    const store = createMatchStore(() => 0);
    render(<App store={store} />);
    startMatch('fair');
    expect(store.getState().history).toHaveLength(0);
    // Effects chain beat-by-beat, so tick in small steps and let React flush between them.
    for (let i = 0; i < 70; i++) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(store.getState().history).toHaveLength(1);
    expect(screen.getByTestId('reveal-root')).toBeInTheDocument();
  });
});

describe('setup wizard', () => {
  it('walks name, game, difficulty in order and only then begins', () => {
    render(<App store={createMatchStore(() => 0)} />);
    fireEvent.click(screen.getByTestId('attract-root'));
    expect(screen.getByTestId('setup-root')).toHaveAttribute('data-step', 'name');
    fireEvent.click(screen.getByTestId('setup-continue'));
    expect(screen.getByTestId('setup-root')).toHaveAttribute('data-step', 'game');
    fireEvent.click(screen.getByTestId('setup-continue'));
    expect(screen.getByTestId('setup-root')).toHaveAttribute('data-step', 'difficulty');
    expect(screen.getByTestId('begin-match')).toBeDisabled();
    fireEvent.click(screen.getByTestId('difficulty-fair'));
    expect(screen.getByTestId('begin-match')).toBeEnabled();
  });
});

describe('hands-free activity', () => {
  it('counts a camera activity event as interaction so the kiosk does not idle out', () => {
    render(<App store={createMatchStore(() => 0)} />);
    startMatch('fair');
    act(() => {
      vi.advanceTimersByTime(40000);
    });
    act(() => {
      window.dispatchEvent(new Event('nash-activity'));
    });
    act(() => {
      vi.advanceTimersByTime(40000);
    });
    expect(screen.queryByTestId('attract-root')).not.toBeInTheDocument();
  });
});
