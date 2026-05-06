import { getLegalMoves } from './rules';
import type { GameSnapshot, Move } from './types';

function movePriority(move: Move): number {
  if (move.type.endsWith('Foundation')) return 3;
  if (move.type === 'tableauToTableau') return 2;
  return 1;
}

export function describeMove(move: Move, state: GameSnapshot): string {
  if (move.type === 'tableauToFoundation') {
    const card = state.tableau[move.fromColumn][move.cardIndex];
    return `Foundation weather: move ${card.id.split('-').slice(0, 2).join(' ')} from column ${move.fromColumn + 1}.`;
  }
  if (move.type === 'reserveToFoundation') {
    const card = state.reserves[move.reserveIndex];
    return card ? `Breaking: reserve ${move.reserveIndex + 1} can file ${card.id.split('-').slice(0, 2).join(' ')} upstairs.` : 'Reserve slot is empty.';
  }
  if (move.type === 'tableauToTableau') {
    return `Smudge has detected a legal run from column ${move.fromColumn + 1} to column ${move.toColumn + 1}.`;
  }
  return `Reserve card ${move.reserveIndex + 1} can move to column ${move.toColumn + 1}.`;
}

export function getHint(state: GameSnapshot): { move: Move; text: string } | null {
  const [move] = getLegalMoves(state).sort((a, b) => movePriority(b) - movePriority(a));
  return move ? { move, text: describeMove(move, state) } : null;
}

export function getHintList(state: GameSnapshot, limit = 6): string[] {
  return getLegalMoves(state)
    .sort((a, b) => movePriority(b) - movePriority(a))
    .slice(0, limit)
    .map((move) => describeMove(move, state));
}
