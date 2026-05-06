import type { Card, FoundationTargets, Rank, Suit, SuitInfo, SuitMode } from './types';

export const SUITS: SuitInfo[] = [
  { suit: 'brain', label: 'Brain', icon: 'B', color: '#ff633d' },
  { suit: 'goose', label: 'Goose', icon: 'G', color: '#f7f3d6' },
  { suit: 'budgie', label: 'Budgie', icon: 'U', color: '#f8d94a' },
  { suit: 'limo', label: 'Limo', icon: 'L', color: '#9cff5d' },
  { suit: 'lake', label: 'Lake Erie', icon: 'E', color: '#4fd9ff' }
];

export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function rankLabel(rank: Rank): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function activeSuitsForMode(mode: SuitMode): Suit[] {
  return SUITS.slice(0, mode).map((suit) => suit.suit);
}

export function copyPlanForMode(mode: SuitMode): Partial<Record<Suit, number>> {
  if (mode === 1) return { brain: 4 };
  if (mode === 2) return { brain: 2, goose: 2 };
  if (mode === 3) return { brain: 2, goose: 1, budgie: 1 };
  if (mode === 4) return { brain: 1, goose: 1, budgie: 1, limo: 1 };
  return { brain: 1, goose: 1, budgie: 1, limo: 1, lake: 1 };
}

export interface FoundationSlot {
  id: string;
  suit: Suit;
  copyIndex: number;
}

export function foundationSlotsForMode(mode: SuitMode): FoundationSlot[] {
  return Object.entries(copyPlanForMode(mode)).flatMap(([suit, copies]) =>
    Array.from({ length: copies ?? 0 }, (_unused, copyIndex) => ({
      id: `${suit}-${copyIndex}`,
      suit: suit as Suit,
      copyIndex
    }))
  );
}

export function foundationTargetsForMode(mode: SuitMode): FoundationTargets {
  return Object.fromEntries(
    Object.entries(copyPlanForMode(mode)).map(([suit, copies]) => [suit, (copies ?? 0) * 13])
  ) as FoundationTargets;
}

export function createDeck(mode: SuitMode): Card[] {
  const plan = copyPlanForMode(mode);
  const cards: Card[] = [];
  for (const [suit, copies] of Object.entries(plan) as Array<[Suit, number]>) {
    for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
      for (const rank of RANKS) {
        cards.push({
          id: `${suit}-${rank}-${copyIndex}`,
          rank,
          suit,
          copyIndex,
          faceUp: false
        });
      }
    }
  }
  return cards;
}

function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeck(cards: Card[], seed: string): Card[] {
  const random = mulberry32(hashSeed(seed));
  const shuffled = cards.map((card) => ({ ...card }));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function foundationOrderedDeck(mode: SuitMode, seed: string): Card[] {
  const random = mulberry32(hashSeed(seed));
  const targets = foundationTargetsForMode(mode);
  const progress = Object.fromEntries(activeSuitsForMode(mode).map((suit) => [suit, 0])) as Record<Suit, number>;
  const cards: Card[] = [];

  while (cards.length < Object.values(targets).reduce((sum, count) => sum + (count ?? 0), 0)) {
    const available = activeSuitsForMode(mode).filter((suit) => progress[suit] < (targets[suit] ?? 0));
    const suit = available[Math.floor(random() * available.length)];
    const nextIndex = progress[suit];
    const rank = ((nextIndex % 13) + 1) as Rank;
    const copyIndex = Math.floor(nextIndex / 13);
    cards.push({
      id: `${suit}-${rank}-${copyIndex}`,
      rank,
      suit,
      copyIndex,
      faceUp: false
    });
    progress[suit] += 1;
  }

  return cards;
}

export function dealGame(mode: SuitMode, seed: string) {
  // Deals are generated in a seeded foundation-legal sequence, then placed into
  // reveal order. This makes every deal theoretically winnable without needing
  // an expensive solitaire solver in the browser.
  const deck = foundationOrderedDeck(mode, seed);
  const tableauCounts = [5, 5, 5, 4, 4];
  const topRow = tableauCounts.map(() => deck.shift() as Card);
  const reserves = deck.splice(0, 2).map((card) => ({ ...card, faceUp: true }));
  const topDownColumns: Card[][] = tableauCounts.map((_count, columnIndex) => [topRow[columnIndex]]);
  const maxDepth = Math.max(...tableauCounts);

  for (let depth = 1; depth < maxDepth; depth += 1) {
    for (let columnIndex = 0; columnIndex < tableauCounts.length; columnIndex += 1) {
      if (depth < tableauCounts[columnIndex]) {
        topDownColumns[columnIndex].push(deck.shift() as Card);
      }
    }
  }

  const tableau = topDownColumns.map((topDownColumn) =>
    topDownColumn
      .slice()
      .reverse()
      .map((card, index, column) => ({
        ...card,
        faceUp: index === column.length - 1
      }))
  );
  const stock = deck.map((card) => ({ ...card, faceUp: false }));
  const foundations = Object.fromEntries(activeSuitsForMode(mode).map((suit) => [suit, []]));

  return {
    tableau,
    reserves,
    stock,
    foundations,
    foundationTargets: foundationTargetsForMode(mode)
  };
}
