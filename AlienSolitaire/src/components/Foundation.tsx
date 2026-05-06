import Card from './Card';
import { rankLabel, SUITS } from '../game/deck';
import type { Card as GameCard, Suit } from '../game/types';

interface FoundationProps {
  suit: Suit;
  cards: GameCard[];
  target: number;
  active?: boolean;
  onClick?: () => void;
  onPointerUp?: () => void;
}

export default function Foundation({ suit, cards, target, active, onClick, onPointerUp }: FoundationProps) {
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
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClick?.();
      }}
      aria-label={`${suitInfo?.label} foundation, next ${rankLabel(nextRank)}`}
    >
      {top ? <Card card={top} compact /> : <span className="foundation-empty">{suitInfo?.icon}</span>}
      <span className="pile-caption">
        {suitInfo?.label} {cards.length}/{target}
      </span>
    </div>
  );
}
