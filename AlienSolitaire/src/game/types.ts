export type Suit = 'brain' | 'goose' | 'budgie' | 'limo' | 'lake';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type SuitMode = 1 | 2 | 3 | 4 | 5;
export type GameStatus = 'playing' | 'won' | 'lost';
export type ThemeName = 'storm' | 'bungalow' | 'tour' | 'light';

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  copyIndex: number;
  faceUp: boolean;
}

export interface SuitInfo {
  suit: Suit;
  label: string;
  icon: string;
  color: string;
}

export interface FoundationSlot {
  id: string;
  suit: Suit;
  copyIndex: number;
}

export type Foundations = Record<string, Card[]>;
export type FoundationTargets = Partial<Record<Suit, number>>;

export interface TableauSelection {
  source: 'tableau';
  columnIndex: number;
  startIndex: number;
}

export interface ReserveSelection {
  source: 'reserve';
  reserveIndex: number;
}

export type Selection = TableauSelection | ReserveSelection;

export interface GameSnapshot {
  tableau: Card[][];
  reserves: Array<Card | null>;
  stock: Card[];
  foundations: Foundations;
  foundationTargets: FoundationTargets;
  moves: number;
  undoCount: number;
  seed: string;
  suitMode: SuitMode;
  status: GameStatus;
  theme: ThemeName;
  message: string;
}

export interface GameState extends GameSnapshot {
  selected: Selection | null;
  history: GameSnapshot[];
  startedAt: number;
  elapsed: number;
}

export type Move =
  | { type: 'tableauToTableau'; fromColumn: number; startIndex: number; toColumn: number }
  | { type: 'reserveToTableau'; reserveIndex: number; toColumn: number }
  | { type: 'tableauToFoundation'; fromColumn: number; cardIndex: number; foundationId: string }
  | { type: 'reserveToFoundation'; reserveIndex: number; foundationId: string };

export interface StatsByMode {
  gamesPlayed: number;
  wins: number;
  bestTime: number | null;
  fewestMoves: number | null;
  winStreak: number;
}

export type Stats = Record<SuitMode, StatsByMode>;
