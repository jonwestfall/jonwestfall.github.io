import { rankLabel, SUITS } from '../game/deck';
import type { Card as GameCard } from '../game/types';

interface CardProps {
  card: GameCard;
  selected?: boolean;
  hinted?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPointerDown?: () => void;
}

export default function Card({ card, selected, hinted, compact, onClick, onDoubleClick, onPointerDown }: CardProps) {
  const suit = SUITS.find((entry) => entry.suit === card.suit);

  if (!card.faceUp) {
    return (
      <button className={`card card-back ${compact ? 'compact-card' : ''}`} aria-label="Face-down alien dome card" type="button">
        <span className="brain-lines" />
      </button>
    );
  }

  return (
    <button
      className={`card suit-${card.suit} ${selected ? 'selected' : ''} ${hinted ? 'hinted' : ''} ${compact ? 'compact-card' : ''}`}
      type="button"
      aria-label={`${rankLabel(card.rank)} of ${suit?.label ?? card.suit}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
    >
      <span className="card-corner">
        <strong>{rankLabel(card.rank)}</strong>
        <small>{suit?.icon}</small>
      </span>
      <span className="suit-art" aria-hidden="true">
        {suit?.icon}
      </span>
      <span className="card-label">{suit?.label}</span>
    </button>
  );
}
