import type { GameSnapshot, GameState, Stats, StatsByMode, SuitMode, ThemeName } from './types';

const GAME_KEY = 'alien-solitaire-current-v3';
const STATS_KEY = 'alien-solitaire-stats';
const SETTINGS_KEY = 'alien-solitaire-settings';

const emptyModeStats = (): StatsByMode => ({
  gamesPlayed: 0,
  wins: 0,
  bestTime: null,
  fewestMoves: null,
  winStreak: 0
});

export function defaultStats(): Stats {
  return {
    1: emptyModeStats(),
    2: emptyModeStats(),
    3: emptyModeStats(),
    4: emptyModeStats(),
    5: emptyModeStats()
  };
}

export function loadStats(): Stats {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATS_KEY) ?? 'null') as Partial<Stats> | null;
    return { ...defaultStats(), ...(parsed ?? {}) };
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats: Stats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function resetStats(): Stats {
  const stats = defaultStats();
  saveStats(stats);
  return stats;
}

export function recordGameStarted(stats: Stats, mode: SuitMode): Stats {
  const next = { ...stats, [mode]: { ...stats[mode], gamesPlayed: stats[mode].gamesPlayed + 1 } };
  saveStats(next);
  return next;
}

export function recordWin(stats: Stats, mode: SuitMode, elapsed: number, moves: number): Stats {
  const current = stats[mode];
  const nextMode: StatsByMode = {
    ...current,
    wins: current.wins + 1,
    winStreak: current.winStreak + 1,
    bestTime: current.bestTime === null ? elapsed : Math.min(current.bestTime, elapsed),
    fewestMoves: current.fewestMoves === null ? moves : Math.min(current.fewestMoves, moves)
  };
  const next = { ...stats, [mode]: nextMode };
  saveStats(next);
  return next;
}

export function recordLoss(stats: Stats, mode: SuitMode): Stats {
  const next = { ...stats, [mode]: { ...stats[mode], winStreak: 0 } };
  saveStats(next);
  return next;
}

export function saveGame(state: GameState): void {
  localStorage.setItem(
    GAME_KEY,
    JSON.stringify({
      snapshot: {
        tableau: state.tableau,
        reserves: state.reserves,
        stock: state.stock,
        foundations: state.foundations,
        foundationTargets: state.foundationTargets,
        moves: state.moves,
        undoCount: state.undoCount,
        seed: state.seed,
        suitMode: state.suitMode,
        status: state.status,
        theme: state.theme,
        message: state.message
      } satisfies GameSnapshot,
      history: state.history,
      startedAt: state.startedAt,
      elapsed: state.elapsed
    })
  );
}

export function loadGame(): GameState | null {
  try {
    const stored = JSON.parse(localStorage.getItem(GAME_KEY) ?? 'null') as
      | { snapshot: GameSnapshot; history: GameSnapshot[]; startedAt: number; elapsed: number }
      | null;
    if (!stored) return null;
    return {
      ...stored.snapshot,
      history: stored.history ?? [],
      startedAt: Date.now() - (stored.elapsed ?? 0) * 1000,
      elapsed: stored.elapsed ?? 0,
      selected: null
    };
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  localStorage.removeItem(GAME_KEY);
}

export function loadSettings(): { muted: boolean; theme: ThemeName; tutorialSeen: boolean } {
  try {
    return { muted: false, theme: 'storm', tutorialSeen: false, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as object) } as {
      muted: boolean;
      theme: ThemeName;
      tutorialSeen: boolean;
    };
  } catch {
    return { muted: false, theme: 'storm', tutorialSeen: false };
  }
}

export function saveSettings(settings: { muted: boolean; theme: ThemeName; tutorialSeen: boolean }): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
