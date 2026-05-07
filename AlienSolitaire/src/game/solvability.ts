import { applyMove, checkWin, cloneSnapshot, dealStockToTableau, getLegalMoves } from './rules';
import type { GameSnapshot, Move } from './types';

export type SolverStep = Move | { type: 'draw' };

interface SolverOptions {
  maxVisited?: number;
  maxDepth?: number;
}

interface SolverNode {
  state: GameSnapshot;
  path: SolverStep[];
}

function cardKey(card: { suit: string; rank: number; faceUp?: boolean }): string {
  return `${card.suit}:${card.rank}:${card.faceUp === false ? 'd' : 'u'}`;
}

function stateKey(state: GameSnapshot): string {
  const foundations = Object.keys(state.foundations)
    .sort()
    .map((id) => `${id}:${state.foundations[id]?.length ?? 0}`)
    .join(',');
  const tableau = state.tableau.map((column) => column.map(cardKey).join('.')).join('|');
  const reserves = state.reserves.map((card) => (card ? cardKey(card) : '_')).join('.');
  const stock = state.stock.map(cardKey).join('.');
  return `${foundations}/${reserves}/${tableau}/${stock}`;
}

function movedCardForStep(step: SolverStep, state: GameSnapshot) {
  if (step.type === 'tableauToFoundation') return state.tableau[step.fromColumn][step.cardIndex];
  if (step.type === 'reserveToFoundation') return state.reserves[step.reserveIndex];
  if (step.type === 'reserveToTableau') return state.reserves[step.reserveIndex];
  if (step.type === 'tableauToTableau') return state.tableau[step.fromColumn][step.startIndex];
  return null;
}

function revealsHiddenCard(move: Move, state: GameSnapshot): boolean {
  if (move.type !== 'tableauToTableau' && move.type !== 'tableauToFoundation') return false;
  const column = state.tableau[move.fromColumn];
  const firstRemovedIndex = move.type === 'tableauToTableau' ? move.startIndex : move.cardIndex;
  return firstRemovedIndex > 0 && column[firstRemovedIndex - 1]?.faceUp === false;
}

function stepPriority(step: SolverStep, state: GameSnapshot): number {
  if (step.type === 'draw') return 9;
  const card = movedCardForStep(step, state);
  if (step.type.endsWith('Foundation')) {
    if (!card) return 20;
    if (card.rank <= 2) return 0;
    return revealsHiddenCard(step, state) ? 2 : 7;
  }
  if (revealsHiddenCard(step, state)) return 1;
  if (step.type === 'reserveToTableau') return 6;
  if (step.type === 'tableauToTableau') {
    const destination = state.tableau[step.toColumn];
    return destination.length === 0 ? 5 : 10;
  }
  return 20;
}

function orderedSteps(state: GameSnapshot): SolverStep[] {
  const moves = getLegalMoves(state);
  const steps: SolverStep[] = state.stock.length > 0 ? [...moves, { type: 'draw' }] : moves;
  return steps.sort((a, b) => stepPriority(a, state) - stepPriority(b, state));
}

function applySolverStep(state: GameSnapshot, step: SolverStep): GameSnapshot {
  if (step.type === 'draw') return dealStockToTableau(state);
  return applyMove(state, step);
}

export function findWinningPath(initialState: GameSnapshot, options: SolverOptions = {}): SolverStep[] | null {
  const maxVisited = options.maxVisited ?? 12000;
  const maxDepth = options.maxDepth ?? 240;
  const start = cloneSnapshot(initialState);
  const visited = new Set<string>([stateKey(start)]);
  const stack: SolverNode[] = [{ state: start, path: [] }];

  while (stack.length > 0 && visited.size < maxVisited) {
    const node = stack.pop() as SolverNode;
    if (checkWin(node.state)) return node.path;
    if (node.path.length >= maxDepth) continue;

    const steps = orderedSteps(node.state);
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const step = steps[index];
      const next = applySolverStep(node.state, step);
      if (next === node.state) continue;
      const key = stateKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      stack.push({ state: next, path: [...node.path, step] });
    }
  }

  return null;
}
