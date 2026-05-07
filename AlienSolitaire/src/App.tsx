import type { DragEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AlienCommentary from './components/AlienCommentary';
import Controls from './components/Controls';
import Foundation from './components/Foundation';
import Reserve from './components/Reserve';
import RulesModal from './components/RulesModal';
import Tableau from './components/Tableau';
import TutorialModal from './components/TutorialModal';
import { activeSuitsForMode, dealGame, foundationSlotsForMode } from './game/deck';
import { getHint, getHintList } from './game/solverHints';
import { findWinningPath } from './game/solvability';
import {
  applyMove,
  canMoveCardToFoundation,
  canMoveCardToFoundationSlot,
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
    message: 'Lake Erie Advisory: solver-certified chaos is now in progress.'
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
  const [tutorialSeen, setTutorialSeen] = useState(settings.tutorialSeen);
  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [seedInput, setSeedInput] = useState(initialLoad.game.seed);
  const [showRules, setShowRules] = useState(false);
  const [showTutorial, setShowTutorial] = useState(!settings.tutorialSeen);
  const [hintLines, setHintLines] = useState<string[]>([]);
  const [hintedColumns, setHintedColumns] = useState<number[]>([]);
  const [state, setState] = useState<GameState>(initialLoad.game);
  const beep = useBeep(muted);
  const winRecorded = useRef(state.status === 'won');
  const lossRecorded = useRef(state.status === 'lost');
  const initialStatsRecorded = useRef(false);
  const dragSelectionRef = useRef<Selection | null>(null);
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
    saveSettings({ muted, theme: state.theme, tutorialSeen });
  }, [muted, state.theme, tutorialSeen]);

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
  const foundationSlots = useMemo(() => foundationSlotsForMode(state.suitMode), [state.suitMode]);

  const cardsForSelection = useCallback((selection: Selection | null, current: GameState): Card[] => {
    if (!selection) return [];
    if (selection.source === 'reserve') return current.reserves[selection.reserveIndex] ? [current.reserves[selection.reserveIndex] as Card] : [];
    return getMovableRun(current.tableau[selection.columnIndex], selection.startIndex) ?? [];
  }, []);

  const selectedCards = useMemo(() => cardsForSelection(state.selected, state), [cardsForSelection, state]);

  const canSelectionMoveToTableau = useCallback(
    (selection: Selection | null, toColumn: number, current: GameState) => {
      const cards = cardsForSelection(selection, current);
      if (!selection || cards.length === 0) return false;
      if (selection.source === 'tableau' && selection.columnIndex === toColumn) return false;
      const destination = current.tableau[toColumn].at(-1) ?? null;
      return cards.length === 1 ? canMoveSingleCardToTableau(cards[0], destination) : canMoveRunToTableau(cards, destination);
    },
    [cardsForSelection]
  );

  const canSelectionMoveToFoundation = useCallback(
    (selection: Selection | null, foundationId: string, suit: Suit, current: GameState) => {
      const cards = cardsForSelection(selection, current);
      return cards.length === 1 && canMoveCardToFoundationSlot(cards[0], current.foundations, foundationId, suit);
    },
    [cardsForSelection]
  );

  const legalTableauTargets = useMemo(
    () =>
      state.tableau.map((column, toColumn) => {
        void column;
        return canSelectionMoveToTableau(state.selected, toColumn, state);
      }),
    [canSelectionMoveToTableau, state]
  );

  const legalFoundationTargets = useMemo(() => {
    const targets: Record<string, boolean> = {};
    foundationSlots.forEach((slot) => {
      targets[slot.id] = canSelectionMoveToFoundation(state.selected, slot.id, slot.suit, state);
    });
    return targets;
  }, [canSelectionMoveToFoundation, foundationSlots, state]);

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

  const moveSelectedToTableau = (toColumn: number, overrideSelection?: Selection | null) => {
    const selected = overrideSelection ?? state.selected;
    if (!selected || !canSelectionMoveToTableau(selected, toColumn, state)) return;
    if (selected.source === 'tableau') commitMove({ type: 'tableauToTableau', fromColumn: selected.columnIndex, startIndex: selected.startIndex, toColumn });
    else commitMove({ type: 'reserveToTableau', reserveIndex: selected.reserveIndex, toColumn });
  };

  const moveSelectedToFoundation = (foundationId: string, suit: Suit, overrideSelection?: Selection | null) => {
    const selected = overrideSelection ?? state.selected;
    if (!selected || !canSelectionMoveToFoundation(selected, foundationId, suit, state)) return;
    if (selected.source === 'tableau') {
      commitMove({ type: 'tableauToFoundation', fromColumn: selected.columnIndex, cardIndex: state.tableau[selected.columnIndex].length - 1, foundationId });
    } else {
      commitMove({ type: 'reserveToFoundation', reserveIndex: selected.reserveIndex, foundationId });
    }
  };

  const startTableauDrag = (columnIndex: number, cardIndex: number, event: DragEvent<HTMLButtonElement>) => {
    const run = getMovableRun(state.tableau[columnIndex], cardIndex);
    if (!run) {
      event.preventDefault();
      return;
    }
    const selection: Selection = { source: 'tableau', columnIndex, startIndex: cardIndex };
    dragSelectionRef.current = selection;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify(selection));
    setState((current) => ({ ...current, selected: selection, message: 'Drag the legal knot to a glowing target.' }));
  };

  const startReserveDrag = (reserveIndex: number, event: DragEvent<HTMLButtonElement>) => {
    if (!state.reserves[reserveIndex]) {
      event.preventDefault();
      return;
    }
    const selection: Selection = { source: 'reserve', reserveIndex };
    dragSelectionRef.current = selection;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify(selection));
    setState((current) => ({ ...current, selected: selection, message: 'Weather Goose confirms reserve card in flight.' }));
  };

  const finishDrag = () => {
    dragSelectionRef.current = null;
  };

  const autoFoundationFromTableau = (columnIndex: number, cardIndex: number) => {
    const card = state.tableau[columnIndex][cardIndex];
    const foundationSlot = foundationSlots.find((slot) => canMoveCardToFoundationSlot(card, state.foundations, slot.id, slot.suit));
    if (cardIndex === state.tableau[columnIndex].length - 1 && foundationSlot) {
      commitMove({ type: 'tableauToFoundation', fromColumn: columnIndex, cardIndex, foundationId: foundationSlot.id });
    }
  };

  const autoFoundationFromReserve = (reserveIndex: number) => {
    const card = state.reserves[reserveIndex];
    const foundationSlot = card ? foundationSlots.find((slot) => canMoveCardToFoundationSlot(card, state.foundations, slot.id, slot.suit)) : null;
    if (card && foundationSlot) {
      commitMove({ type: 'reserveToFoundation', reserveIndex, foundationId: foundationSlot.id });
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
    const winnableState = createGame(1, 'debug-winnable', 'storm');
    const solverCertified = findWinningPath(snapshotFromState(winnableState), { maxVisited: 20000, maxDepth: 260 }) !== null;
    const faceDown: Card = { ...brain8, id: 'down', faceUp: false };
    const exposed = applyMove({ ...snapshotFromState(testState), tableau: [[faceDown, brain8], [brain7], [], [], []] }, { type: 'tableauToTableau', fromColumn: 0, startIndex: 1, toColumn: 2 });
    const aceOne: Card = { ...brain8, id: 'brain-ace-1', rank: 1 };
    const aceTwo: Card = { ...brain8, id: 'brain-ace-2', rank: 1 };
    const duplicateAceFoundations = { 'brain-0': [aceOne], 'brain-1': [], 'brain-2': [], 'brain-3': [] };
    return [
      ['Single 8 moves to 7', canMoveSingleCardToTableau(brain8, brain7)],
      ['Single 8 moves to 9', canMoveSingleCardToTableau(brain8, goose9)],
      ['Mixed run blocked', !isValidRun(mixedRun)],
      ['Same-suit direction-changing run moves', isValidRun(bendingRun)],
      ['Foundation requires next rank', !canMoveCardToFoundation(brain7, { brain: [] }, { brain: 13 }) && canMoveCardToFoundation({ ...brain8, rank: 1 }, { brain: [] }, { brain: 13 })],
      ['Exposed face-down card flips', exposed.tableau[0][0].faceUp],
      ['New one-suit deal has a legal solver path', solverCertified],
      ['Second duplicate Ace can move to another receiving pile', canMoveCardToFoundationSlot(aceTwo, duplicateAceFoundations, 'brain-1', 'brain')]
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
            onDragStart={startReserveDrag}
            onDragEnd={finishDrag}
          />
            <section className="foundation-row" aria-label="Foundations">
              {foundationSlots.map(({ id, suit, copyIndex }) => {
                const slotCards = state.foundations[id] ?? [];
                const isActive = Boolean(legalFoundationTargets[id]);
                return (
                <Foundation
                  key={id}
                  suit={suit}
                  cards={slotCards}
                  target={13}
                  copyIndex={copyIndex}
                  active={isActive}
                  onClick={() => moveSelectedToFoundation(id, suit)}
                  onPointerUp={() => moveSelectedToFoundation(id, suit)}
                  onDrop={() => moveSelectedToFoundation(id, suit, dragSelectionRef.current ?? state.selected)}
                />
                );
              })}
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
            onDragStartCard={startTableauDrag}
            onDragEnd={finishDrag}
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
            onTutorial={() => setShowTutorial(true)}
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
      {showTutorial && (
        <TutorialModal
          firstRun={!tutorialSeen}
          onClose={() => {
            setTutorialSeen(true);
            setShowTutorial(false);
          }}
          onDone={() => {
            setTutorialSeen(true);
            setShowTutorial(false);
          }}
        />
      )}
    </main>
  );
}
