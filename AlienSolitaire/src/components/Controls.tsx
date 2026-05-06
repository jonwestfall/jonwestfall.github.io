import type { StatsByMode, SuitMode, ThemeName } from '../game/types';

interface ControlsProps {
  seed: string;
  suitMode: SuitMode;
  stockCount: number;
  moves: number;
  undoCount: number;
  elapsed: string;
  muted: boolean;
  theme: ThemeName;
  stats: StatsByMode;
  onSeedChange: (seed: string) => void;
  onSuitModeChange: (mode: SuitMode) => void;
  onNewGame: () => void;
  onReplay: () => void;
  onDraw: () => void;
  onHint: () => void;
  onUndo: () => void;
  onAuto: () => void;
  onRules: () => void;
  onMute: () => void;
  onTheme: (theme: ThemeName) => void;
  onResetStats: () => void;
}

export default function Controls({
  seed,
  suitMode,
  stockCount,
  moves,
  undoCount,
  elapsed,
  muted,
  theme,
  stats,
  onSeedChange,
  onSuitModeChange,
  onNewGame,
  onReplay,
  onDraw,
  onHint,
  onUndo,
  onAuto,
  onRules,
  onMute,
  onTheme,
  onResetStats
}: ControlsProps) {
  return (
    <aside className="control-panel">
      <div className="stats-strip" aria-label="Current game stats">
        <span><strong>{moves}</strong> moves</span>
        <span><strong>{elapsed}</strong> time</span>
        <span><strong>{undoCount}</strong> undo</span>
        <span><strong>{stockCount}</strong> stock</span>
      </div>

      <div className="control-grid">
        <button type="button" onClick={onNewGame}>New Game</button>
        <button type="button" onClick={onReplay}>Replay Deal</button>
        <button type="button" onClick={onDraw}>Draw</button>
        <button type="button" onClick={onAuto}>Auto</button>
        <button type="button" onClick={onHint}>Hint</button>
        <button type="button" onClick={onUndo}>Undo</button>
        <button type="button" onClick={onRules}>Rules</button>
        <button type="button" onClick={onMute}>{muted ? 'Muted' : 'Sound'}</button>
      </div>

      <label className="field">
        Seed
        <input value={seed} onChange={(event) => onSeedChange(event.target.value)} />
      </label>

      <label className="field">
        Suits
        <select value={suitMode} onChange={(event) => onSuitModeChange(Number(event.target.value) as SuitMode)}>
          <option value={1}>1 suit</option>
          <option value={2}>2 suits</option>
          <option value={3}>3 suits</option>
          <option value={4}>4 suits</option>
          <option value={5}>5 suits</option>
        </select>
      </label>

      <label className="field">
        Theme
        <select value={theme} onChange={(event) => onTheme(event.target.value as ThemeName)}>
          <option value="storm">Stormy Lake Erie</option>
          <option value="bungalow">Cleveland Bungalow</option>
          <option value="tour">Scottish Weather Goose Tour</option>
        </select>
      </label>

      <div className="lifetime-stats">
        <span>Played {stats.gamesPlayed}</span>
        <span>Wins {stats.wins}</span>
        <span>Streak {stats.winStreak}</span>
        <span>Best {stats.bestTime === null ? '...' : `${Math.floor(stats.bestTime / 60)}:${String(stats.bestTime % 60).padStart(2, '0')}`}</span>
        <span>Fewest {stats.fewestMoves ?? '...'}</span>
      </div>

      <button className="danger-button" type="button" onClick={onResetStats}>Reset Stats</button>
    </aside>
  );
}
