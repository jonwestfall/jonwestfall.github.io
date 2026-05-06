import { foundationSlotsForMode } from './deck';
import type { Card, Foundations, GameSnapshot, GameState, Move, Rank, Suit } from './types';

function cloneCard(card: Card): Card {
  return { ...card };
}

export function cloneSnapshot(state: GameSnapshot): GameSnapshot {
  return {
    tableau: state.tableau.map((column) => column.map(cloneCard)),
    reserves: state.reserves.map((card) => (card ? cloneCard(card) : null)),
    stock: state.stock.map(cloneCard),
    foundations: Object.fromEntries(
      Object.entries(state.foundations).map(([foundationId, cards]) => [foundationId, (cards ?? []).map(cloneCard)])
    ) as Foundations,
    foundationTargets: { ...state.foundationTargets },
    moves: state.moves,
    undoCount: state.undoCount,
    seed: state.seed,
    suitMode: state.suitMode,
    status: state.status,
    theme: state.theme,
    message: state.message
  };
}

export function snapshotFromState(state: GameState): GameSnapshot {
  return cloneSnapshot(state);
}

export function areRanksAdjacent(a: Rank, b: Rank): boolean {
  return Math.abs(a - b) === 1;
}

export function canMoveSingleCardToTableau(card: Card, destinationCardOrEmpty: Card | null): boolean {
  if (!card.faceUp) return false;
  return destinationCardOrEmpty === null || (destinationCardOrEmpty.faceUp && areRanksAdjacent(card.rank, destinationCardOrEmpty.rank));
}

export function isValidRun(cards: Card[]): boolean {
  if (cards.length === 0 || cards.some((card) => !card.faceUp)) return false;
  const suit = cards[0].suit;
  return cards.every((card) => card.suit === suit) && cards.every((card, index) => index === 0 || areRanksAdjacent(card.rank, cards[index - 1].rank));
}

export function getMovableRun(column: Card[], startIndex: number): Card[] | null {
  if (startIndex < 0 || startIndex >= column.length) return null;
  const run = column.slice(startIndex);
  // A single top card can always be considered a run; deeper single-card moves are
  // not allowed because cards above it would be left unsupported.
  if (run.length === 1) return run[0].faceUp ? run : null;
  return isValidRun(run) ? run : null;
}

export function canMoveRunToTableau(run: Card[], destinationCardOrEmpty: Card | null): boolean {
  if (!isValidRun(run)) return false;
  return destinationCardOrEmpty === null || (destinationCardOrEmpty.faceUp && areRanksAdjacent(run[0].rank, destinationCardOrEmpty.rank));
}

export function nextFoundationRankForPile(pile: Card[]): Rank {
  const length = pile.length;
  return ((length % 13) + 1) as Rank;
}

export function canMoveCardToFoundationSlot(card: Card, foundations: Foundations, foundationId: string, suit: Suit): boolean {
  if (!card.faceUp) return false;
  const pile = foundations[foundationId];
  if (!pile || pile.length >= 13 || card.suit !== suit) return false;
  return card.rank === nextFoundationRankForPile(pile);
}

export function canMoveCardToFoundation(card: Card, foundations: Foundations, _foundationTargets: Partial<Record<Suit, number>> = {}): boolean {
  return Object.entries(foundations).some(([foundationId, pile]) => {
    const suit = foundationId.split('-')[0] as Suit;
    return pile.length < 13 && canMoveCardToFoundationSlot(card, foundations, foundationId, suit);
  });
}

export function getLegalMoves(state: GameSnapshot): Move[] {
  const moves: Move[] = [];
  const foundationSlots = foundationSlotsForMode(state.suitMode);

  state.tableau.forEach((column, fromColumn) => {
    column.forEach((_card, startIndex) => {
      const run = getMovableRun(column, startIndex);
      if (!run) return;
      state.tableau.forEach((destination, toColumn) => {
        if (fromColumn === toColumn) return;
        const destinationCard = destination.at(-1) ?? null;
        const canMove = run.length === 1
          ? canMoveSingleCardToTableau(run[0], destinationCard)
          : canMoveRunToTableau(run, destinationCard);
        if (canMove) moves.push({ type: 'tableauToTableau', fromColumn, startIndex, toColumn });
      });
    });

    const topIndex = column.length - 1;
    const topCard = column[topIndex];
    if (topCard) {
      foundationSlots.forEach((slot) => {
        if (canMoveCardToFoundationSlot(topCard, state.foundations, slot.id, slot.suit)) {
          moves.push({ type: 'tableauToFoundation', fromColumn, cardIndex: topIndex, foundationId: slot.id });
        }
      });
    }
  });

  state.reserves.forEach((card, reserveIndex) => {
    if (!card) return;
    state.tableau.forEach((column, toColumn) => {
      if (canMoveSingleCardToTableau(card, column.at(-1) ?? null)) {
        moves.push({ type: 'reserveToTableau', reserveIndex, toColumn });
      }
    });
    foundationSlots.forEach((slot) => {
      if (canMoveCardToFoundationSlot(card, state.foundations, slot.id, slot.suit)) {
        moves.push({ type: 'reserveToFoundation', reserveIndex, foundationId: slot.id });
      }
    });
  });

  return moves;
}

export function autoFlipExposedCards<T extends GameSnapshot>(state: T): T {
  state.tableau = state.tableau.map((column) => {
    if (column.length === 0) return column;
    const topCard = column[column.length - 1];
    if (!topCard.faceUp) {
      return column.map((card, index) => (index === column.length - 1 ? { ...card, faceUp: true } : card));
    }
    return column;
  });
  return state;
}

export function applyMove(state: GameSnapshot, move: Move): GameSnapshot {
  const next = cloneSnapshot(state);

  if (move.type === 'tableauToTableau') {
    const fromColumn = next.tableau[move.fromColumn];
    const run = getMovableRun(fromColumn, move.startIndex);
    const destination = next.tableau[move.toColumn];
    const destinationCard = destination.at(-1) ?? null;
    if (!run || !canMoveRunToTableau(run, destinationCard)) return state;
    next.tableau[move.fromColumn] = fromColumn.slice(0, move.startIndex);
    next.tableau[move.toColumn] = destination.concat(run.map(cloneCard));
  }

  if (move.type === 'reserveToTableau') {
    const card = next.reserves[move.reserveIndex];
    const destination = next.tableau[move.toColumn];
    if (!card || !canMoveSingleCardToTableau(card, destination.at(-1) ?? null)) return state;
    next.reserves[move.reserveIndex] = null;
    next.tableau[move.toColumn] = destination.concat(cloneCard(card));
  }

  if (move.type === 'tableauToFoundation') {
    const column = next.tableau[move.fromColumn];
    const card = column[move.cardIndex];
    const suit = move.foundationId.split('-')[0] as Suit;
    if (move.cardIndex !== column.length - 1 || !card || !canMoveCardToFoundationSlot(card, next.foundations, move.foundationId, suit)) return state;
    next.tableau[move.fromColumn] = column.slice(0, -1);
    next.foundations[move.foundationId] = [...(next.foundations[move.foundationId] ?? []), cloneCard(card)];
  }

  if (move.type === 'reserveToFoundation') {
    const card = next.reserves[move.reserveIndex];
    const suit = move.foundationId.split('-')[0] as Suit;
    if (!card || !canMoveCardToFoundationSlot(card, next.foundations, move.foundationId, suit)) return state;
    next.reserves[move.reserveIndex] = null;
    next.foundations[move.foundationId] = [...(next.foundations[move.foundationId] ?? []), cloneCard(card)];
  }

  next.moves += 1;
  next.message = 'Move logged by the Lake Erie incident desk.';
  return autoFlipExposedCards(next);
}

export function dealStockToTableau(state: GameSnapshot): GameSnapshot {
  const next = cloneSnapshot(state);
  const dealCount = Math.min(5, next.stock.length);
  for (let index = 0; index < dealCount; index += 1) {
    const card = next.stock.shift();
    if (card) next.tableau[index].push({ ...card, faceUp: true });
  }
  next.moves += 1;
  next.message = dealCount < 5 ? 'Stock sputtered out across the shoreline.' : 'Five new objects entered the weather pattern.';
  return autoFlipExposedCards(next);
}

export function checkWin(state: GameSnapshot): boolean {
  const targetTotal = Object.values(state.foundationTargets).reduce((sum, count) => sum + (count ?? 0), 0);
  const foundationTotal = Object.values(state.foundations).reduce((sum, pile) => sum + (pile?.length ?? 0), 0);
  return targetTotal > 0 && foundationTotal === targetTotal;
}

export function checkStuck(state: GameSnapshot): boolean {
  return state.stock.length === 0 && getLegalMoves(state).length === 0 && !checkWin(state);
}
