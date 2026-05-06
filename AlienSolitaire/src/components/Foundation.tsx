import Card from './Card';
import { rankLabel, SUITS } from '../game/deck';
import type { Card as GameCard, Suit } from '../game/types';

interface FoundationProps {
  suit: Suit;
  cards: GameCard[];
  target: number;
  copyIndex?: number;
  active?: boolean;
  onClick?: () => void;
  onPointerUp?: () => void;
  onDrop?: () => void;
}

export default function Foundation({ suit, cards, target, copyIndex, active, onClick, onPointerUp, onDrop }: FoundationProps) {
  const suitInfo = SUITS.find((entry) => entry.suit === suit);
  const top = cards.at(-1);
  const nextRank = ((cards.length % 13) + 1) as GameCard['rank'];

  return (
    <div
      role="button"
      tabIndex={0}
      className={`foundation target suit-${suit} ${active ? 'legal-target' : ''}`}
      onClick={onClick}
      onPointerUp={onPointerUp}
      onMouseUp={onPointerUp}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClick?.();
      }}
      aria-label={`${suitInfo?.label} foundation, next ${rankLabel(nextRank)}`}
    >
      {top ? <Card card={top} compact /> : <span className="foundation-empty">{suitInfo?.icon}</span>}
      <span className="pile-caption">
        {suitInfo?.label}{copyIndex !== undefined ? ` ${copyIndex + 1}` : ''} {cards.length}/{target}
      </span>
    </div>
  );
}
