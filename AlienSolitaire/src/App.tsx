import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AlienCommentary from './components/AlienCommentary';
import Controls from './components/Controls';
import Foundation from './components/Foundation';
import Reserve from './components/Reserve';
import RulesModal from './components/RulesModal';
import Tableau from './components/Tableau';
import { activeSuitsForMode, dealGame } from './game/deck';
import { getHint, getHintList } from './game/solverHints';
import {
  applyMove,
  canMoveCardToFoundation,
  canMoveRunToTableau,
  canMoveSingleCardToTableau,
  checkStuck,
  checkWin,
  cloneSnapshot,
  dealStockToTableau,
  getLegalMoves,
  getMovableRun,
  isValidRun,
  snapshotFromState
} from './game/rules';
import {
  clearSavedGame,
  loadGame,
  loadSettings,
  loadStats,
  recordGameStarted,
  recordLoss,
  recordWin,
  resetStats,
  saveGame,
  saveSettings
} from './game/storage';
import type { Card, GameSnapshot, GameState, Move, Selection, Stats, Suit, SuitMode, ThemeName } from './game/types';

function makeSeed(): string {
  return `lake-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function createGame(mode: SuitMode, seed: string, theme: ThemeName): GameState {
  const deal = dealGame(mode, seed);
  return {
    ...deal,
    moves: 0,
    undoCount: 0,
    seed,
    suitMode: mode,
    status: 'playing',
    selected: null,
    history: [],
    startedAt: Date.now(),
    elapsed: 0,
    theme,
    message: 'Lake Erie Advisory: do not trust any column wearing a hoodie.'
  };
}

function withOutcome(state: GameState): GameState {
  const snapshot = snapshotFromState(state);
  if (checkWin(snapshot)) return { ...state, status: 'won', selected: null, message: 'Weather Goose headline: Foundations complete.' };
  if (checkStuck(snapshot)) return { ...state, status: 'lost', selected: null, message: 'Too Cold - no legal moves and the stock is empty.' };
  return { ...state, status: 'playing' };
}

function pushMove(state: GameState, nextSnapshot: GameSnapshot, message?: string): GameState {
  const next = withOutcome({
    ...nextSnapshot,
    selected: null,
    history: [...state.history, snapshotFromState(state)].slice(-80),
    startedAt: state.startedAt,
    elapsed: state.elapsed,
    message: message ?? nextSnapshot.message
  });
  return next;
}

function useBeep(muted: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  return useCallback(
    (kind: 'move' | 'invalid' | 'foundation' | 'win') => {
      if (muted) return;
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = contextRef.current ?? new AudioContextClass();
      contextRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const tones = { move: 330, invalid: 120, foundation: 520, win: 660 };
      oscillator.frequency.value = tones[kind];
      oscillator.type = kind === 'invalid' ? 'sawtooth' : 'sine';
      gain.gain.setValueAtTime(0.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
    },
    [muted]
  );
}

export default function App() {
  const settings = useMemo(() => loadSettings(), []);
  const initialLoad = useMemo(() => {
    const loaded = loadGame();
    if (loaded) return { game: loaded, shouldRecord: false };
    const seed = makeSeed();
    return { game: createGame(1, seed, settings.theme), shouldRecord: true };
  }, [settings.theme]);
  const [muted, setMuted] = useState(settings.muted);
  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [seedInput, setSeedInput] = useState(initialLoad.game.seed);
  const [showRules, setShowRules] = useState(false);
  const [hintLines, setHintLines] = useState<string[]>([]);
  const [hintedColumns, setHintedColumns] = useState<number[]>([]);
  const [state, setState] = useState<GameState>(initialLoad.game);
  const beep = useBeep(muted);
  const winRecorded = useRef(state.status === 'won');
  const lossRecorded = useRef(state.status === 'lost');
  const initialStatsRecorded = useRef(false);
  const debugMode = useMemo(() => new URLSearchParams(window.location.search).get('debug') === '1', []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((current) => (current.status === 'playing' ? { ...current, elapsed: Math.floor((Date.now() - current.startedAt) / 1000) } : current));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    saveGame(state);
  }, [state]);

  useEffect(() => {
    if (!initialLoad.shouldRecord || initialStatsRecorded.current) return;
    initialStatsRecorded.current = true;
    setStats((current) => recordGameStarted(current, initialLoad.game.suitMode));
  }, [initialLoad.game.suitMode, initialLoad.shouldRecord]);

  useEffect(() => {
    saveSettings({ muted, theme: state.theme });
  }, [muted, state.theme]);

  useEffect(() => {
    if (state.status === 'won' && !winRecorded.current) {
      winRecorded.current = true;
      setStats((current) => recordWin(current, state.suitMode, state.elapsed, state.moves));
      beep('win');
    }
    if (state.status === 'lost' && !lossRecorded.current) {
      lossRecorded.current = true;
      setStats((current) => recordLoss(current, state.suitMode));
      beep('invalid');
    }
  }, [beep, state.elapsed, state.moves, state.status, state.suitMode]);

  const activeSuits = activeSuitsForMode(state.suitMode);

  const selectedCards = useMemo(() => {
    if (!state.selected) return [];
    if (state.selected.source === 'reserve') return state.reserves[state.selected.reserveIndex] ? [state.reserves[state.selected.reserveIndex] as Card] : [];
    return getMovableRun(state.tableau[state.selected.columnIndex], state.selected.startIndex) ?? [];
  }, [state]);

  const legalTableauTargets = useMemo(
    () =>
      state.tableau.map((column, toColumn) => {
        if (!state.selected || selectedCards.length === 0) return false;
        if (state.selected.source === 'tableau' && state.selected.columnIndex === toColumn) return false;
        const destination = column.at(-1) ?? null;
        return selectedCards.length === 1 ? canMoveSingleCardToTableau(selectedCards[0], destination) : canMoveRunToTableau(selectedCards, destination);
      }),
    [selectedCards, state.selected, state.tableau]
  );

  const legalFoundationTargets = useMemo(() => {
    const targets: Partial<Record<Suit, boolean>> = {};
    if (selectedCards.length === 1) {
      targets[selectedCards[0].suit] = canMoveCardToFoundation(selectedCards[0], state.foundations, state.foundationTargets);
    }
    return targets;
  }, [selectedCards, state.foundations, state.foundationTargets]);

  const commitMove = useCallback(
    (move: Move, message?: string) => {
      setState((current) => {
        if (current.status !== 'playing') return current;
        const before = snapshotFromState(current);
        const nextSnapshot = applyMove(before, move);
        if (nextSnapshot === before) {
          beep('invalid');
          return { ...current, message: 'Invalid move. The Weather Goose refuses to certify it.' };
        }
        beep(move.type.endsWith('Foundation') ? 'foundation' : 'move');
        return pushMove(current, nextSnapshot, message);
      });
    },
    [beep]
  );

  const startGame = useCallback(
    (mode = state.suitMode, seed = makeSeed(), theme = state.theme) => {
      clearSavedGame();
      winRecorded.current = false;
      lossRecorded.current = false;
      setHintLines([]);
      setHintedColumns([]);
      setSeedInput(seed);
      setStats((current) => recordGameStarted(current, mode));
      setState(createGame(mode, seed, theme));
    },
    [state.suitMode, state.theme]
  );

  const selectTableauCard = (columnIndex: number, cardIndex: number) => {
    if (state.selected && legalTableauTargets[columnIndex]) {
      moveSelectedToTableau(columnIndex);
      return;
    }
    const run = getMovableRun(state.tableau[columnIndex], cardIndex);
    if (!run) {
      beep('invalid');
      setState((current) => ({ ...current, selected: null, message: 'That buried card is not filing travel paperwork today.' }));
      return;
    }
    setState((current) => ({ ...current, selected: { source: 'tableau', columnIndex, startIndex: cardIndex }, message: 'Move the same-suit knot, earthling.' }));
  };

  const selectReserve = (reserveIndex: number) => {
    if (!state.reserves[reserveIndex]) return;
    setState((current) => ({ ...current, selected: { source: 'reserve', reserveIndex }, message: 'Breaking: Reserve Card Situation Developing.' }));
  };

  const moveSelectedToTableau = (toColumn: number) => {
    const selected = state.selected;
    if (!selected || !legalTableauTargets[toColumn]) return;
    if (selected.source === 'tableau') commitMove({ type: 'tableauToTableau', fromColumn: selected.columnIndex, startIndex: selected.startIndex, toColumn });
    else commitMove({ type: 'reserveToTableau', reserveIndex: selected.reserveIndex, toColumn });
  };

  const moveSelectedToFoundation = (suit: Suit) => {
    const selected = state.selected;
    if (!selected || !legalFoundationTargets[suit]) return;
    if (selected.source === 'tableau') commitMove({ type: 'tableauToFoundation', fromColumn: selected.columnIndex, cardIndex: state.tableau[selected.columnIndex].length - 1 });
    else commitMove({ type: 'reserveToFoundation', reserveIndex: selected.reserveIndex });
  };

  const autoFoundationFromTableau = (columnIndex: number, cardIndex: number) => {
    const card = state.tableau[columnIndex][cardIndex];
    if (cardIndex === state.tableau[columnIndex].length - 1 && canMoveCardToFoundation(card, state.foundations, state.foundationTargets)) {
      commitMove({ type: 'tableauToFoundation', fromColumn: columnIndex, cardIndex });
    }
  };

  const autoFoundationFromReserve = (reserveIndex: number) => {
    const card = state.reserves[reserveIndex];
    if (card && canMoveCardToFoundation(card, state.foundations, state.foundationTargets)) {
      commitMove({ type: 'reserveToFoundation', reserveIndex });
    }
  };

  const draw = useCallback(() => {
    const legalMoves = getLegalMoves(snapshotFromState(state));
    if (legalMoves.length > 0 && !window.confirm('Legal moves exist. Draw anyway?')) return;
    if (state.stock.length === 0) {
      beep('invalid');
      setState((current) => ({ ...current, message: 'The stock is empty. The Creature has left the driveway.' }));
      return;
    }
    setState((current) => pushMove(current, dealStockToTableau(snapshotFromState(current))));
    beep('move');
  }, [beep, state]);

  const undo = useCallback(() => {
    setState((current) => {
      const previous = current.history.at(-1);
      if (!previous) {
        beep('invalid');
        return { ...current, message: 'Undo shelf is empty. Walmart clearance sticker says final sale.' };
      }
      return {
        ...cloneSnapshot(previous),
        undoCount: current.undoCount + 1,
        selected: null,
        history: current.history.slice(0, -1),
        startedAt: Date.now() - current.elapsed * 1000,
        elapsed: current.elapsed,
        message: 'Undo granted by Fossil Club committee.'
      };
    });
  }, [beep]);

  const showHint = useCallback(() => {
    const hint = getHint(snapshotFromState(state));
    setHintLines(getHintList(snapshotFromState(state)));
    if (!hint) {
      setHintedColumns([]);
      setState((current) => ({ ...current, message: 'Smudge found no legal move. Check the stock.' }));
      return;
    }
    setHintedColumns(hint.move.type === 'tableauToTableau' ? [hint.move.fromColumn, hint.move.toColumn] : []);
    setState((current) => ({ ...current, message: hint.text }));
  }, [state]);

  const autoMove = useCallback(() => {
    setState((current) => {
      let working = snapshotFromState(current);
      const original = snapshotFromState(current);
      let moved = false;
      let searching = true;
      while (searching) {
        searching = false;
        const safeMove = getLegalMoves(working).find((move) => {
          const card =
            move.type === 'tableauToFoundation'
              ? working.tableau[move.fromColumn][move.cardIndex]
              : move.type === 'reserveToFoundation'
                ? working.reserves[move.reserveIndex]
                : null;
          return card && card.rank <= 2;
        });
        if (safeMove) {
          working = applyMove(working, safeMove);
          moved = true;
          searching = true;
        }
      }
      if (!moved) {
        beep('invalid');
        return { ...current, message: 'Auto found no clearly safe Aces or Twos.' };
      }
      beep('foundation');
      return withOutcome({
        ...working,
        selected: null,
        history: [...current.history, original].slice(-80),
        startedAt: current.startedAt,
        elapsed: current.elapsed,
        message: 'Auto filed every obviously safe Ace and Two.'
      });
    });
  }, [beep]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.key.toLowerCase() === 'h') showHint();
      if (event.key.toLowerCase() === 'u') undo();
      if (event.key.toLowerCase() === 'n') startGame();
      if (event.key.toLowerCase() === 'a') autoMove();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [autoMove, showHint, startGame, undo]);

  const runDebugTests = () => {
    const brain8: Card = { id: 'brain-8-test', rank: 8, suit: 'brain', copyIndex: 0, faceUp: true };
    const brain7: Card = { id: 'brain-7-test', rank: 7, suit: 'brain', copyIndex: 0, faceUp: true };
    const goose9: Card = { id: 'goose-9-test', rank: 9, suit: 'goose', copyIndex: 0, faceUp: true };
    const mixedRun = [brain8, goose9];
    const bendingRun: Card[] = [brain8, { ...brain8, id: 'brain-9-test', rank: 9 }, { ...brain8, id: 'brain-8b-test' }, brain7];
    const testState = createGame(1, 'debug', 'storm');
    const faceDown: Card = { ...brain8, id: 'down', faceUp: false };
    const exposed = applyMove({ ...snapshotFromState(testState), tableau: [[faceDown, brain8], [brain7], [], [], []] }, { type: 'tableauToTableau', fromColumn: 0, startIndex: 1, toColumn: 2 });
    return [
      ['Single 8 moves to 7', canMoveSingleCardToTableau(brain8, brain7)],
      ['Single 8 moves to 9', canMoveSingleCardToTableau(brain8, goose9)],
      ['Mixed run blocked', !isValidRun(mixedRun)],
      ['Same-suit direction-changing run moves', isValidRun(bendingRun)],
      ['Foundation requires next rank', !canMoveCardToFoundation(brain7, { brain: [] }, { brain: 13 }) && canMoveCardToFoundation({ ...brain8, rank: 1 }, { brain: [] }, { brain: 13 })],
      ['Exposed face-down card flips', exposed.tableau[0][0].faceUp]
    ];
  };

  return (
    <main className={`app theme-${state.theme}`}>
      <div className="weather-bg" aria-hidden="true">
        <span className="lake" />
        <span className="cedar" />
        <span className="geese" />
      </div>
      <header className="topbar">
        <div>
          <h1>Alien Solitaire</h1>
          <p>The Scary Alien, The Weather Goose, and Friends file cards under storm conditions.</p>
        </div>
        <div className={`status-badge ${state.status}`}>{state.status.toUpperCase()}</div>
      </header>

      <section className="game-shell">
        <div className="board">
          <div className="top-piles">
            <Reserve
              cards={state.reserves}
              selectedIndex={state.selected?.source === 'reserve' ? state.selected.reserveIndex : null}
              legalTargets={[false, false]}
              onSelect={selectReserve}
              onDoubleClick={autoFoundationFromReserve}
            />
            <section className="foundation-row" aria-label="Foundations">
              {activeSuits.map((suit) => (
                <Foundation
                  key={suit}
                  suit={suit}
                  cards={state.foundations[suit] ?? []}
                  target={state.foundationTargets[suit] ?? 13}
                  active={Boolean(legalFoundationTargets[suit])}
                  onClick={() => moveSelectedToFoundation(suit)}
                  onPointerUp={() => moveSelectedToFoundation(suit)}
                />
              ))}
            </section>
            <button className="stock-pile" type="button" onClick={draw}>
              <span className="stock-dome" />
              <strong>{state.stock.length}</strong>
              <small>Stock</small>
            </button>
          </div>

          <Tableau
            columns={state.tableau}
            selected={state.selected}
            legalTargets={legalTableauTargets}
            hintedColumns={hintedColumns}
            onSelectCard={selectTableauCard}
            onColumnTarget={moveSelectedToTableau}
            onDoubleClick={autoFoundationFromTableau}
          />
        </div>

        <div className="side-stack">
          <Controls
            seed={seedInput}
            suitMode={state.suitMode}
            stockCount={state.stock.length}
            moves={state.moves}
            undoCount={state.undoCount}
            elapsed={formatTime(state.elapsed)}
            muted={muted}
            theme={state.theme}
            stats={stats[state.suitMode]}
            onSeedChange={setSeedInput}
            onSuitModeChange={(mode) => startGame(mode, makeSeed(), state.theme)}
            onNewGame={() => startGame(state.suitMode, makeSeed(), state.theme)}
            onReplay={() => startGame(state.suitMode, seedInput || state.seed, state.theme)}
            onDraw={draw}
            onHint={showHint}
            onUndo={undo}
            onAuto={autoMove}
            onRules={() => setShowRules(true)}
            onMute={() => setMuted((current) => !current)}
            onTheme={(theme) => setState((current) => ({ ...current, theme }))}
            onResetStats={() => {
              if (window.confirm('Reset Alien Solitaire stats?')) setStats(resetStats());
            }}
          />
          <AlienCommentary message={state.message} status={state.status} seedNumber={state.moves + state.stock.length} />
          {hintLines.length > 0 && (
            <section className="hint-panel">
              <h2>Weather Goose Hint Desk</h2>
              {hintLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </section>
          )}
        </div>
      </section>

      {state.status !== 'playing' && (
        <section className="result-panel">
          <h2>{state.status === 'won' ? 'Foundations Complete' : 'No Legal Moves'}</h2>
          <p>{state.status === 'won' ? 'The Weather Goose confirms victory. Carnivore Pizza with fried egg is now meteorologically appropriate.' : 'Stock empty, moves gone, Lake Erie spray everywhere.'}</p>
          <button type="button" onClick={() => startGame(state.suitMode, makeSeed(), state.theme)}>New Game</button>
        </section>
      )}

      {debugMode && (
        <section className="debug-panel">
          <h2>Developer Rule Tests</h2>
          {runDebugTests().map(([label, passed]) => (
            <p key={String(label)} className={passed ? 'pass' : 'fail'}>
              {passed ? 'PASS' : 'FAIL'} - {label}
            </p>
          ))}
        </section>
      )}

      {showRules && <RulesModal suitMode={state.suitMode} onClose={() => setShowRules(false)} />}
    </main>
  );
}
