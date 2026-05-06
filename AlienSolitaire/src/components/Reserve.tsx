import Card from './Card';
import type { Card as GameCard } from '../game/types';

interface ReserveProps {
  cards: Array<GameCard | null>;
  selectedIndex: number | null;
  legalTargets: boolean[];
  onSelect: (index: number) => void;
  onMoveToReserve?: (index: number) => void;
  onDoubleClick: (index: number) => void;
}

export default function Reserve({ cards, selectedIndex, legalTargets, onSelect, onMoveToReserve, onDoubleClick }: ReserveProps) {
  return (
    <section className="reserve-row" aria-label="Reserve cards">
      {cards.map((card, index) => (
        <div
          role="button"
          tabIndex={0}
          className={`reserve-slot target ${legalTargets[index] ? 'legal-target' : ''}`}
          key={index}
          aria-label={`Reserve slot ${index + 1}`}
          onClick={() => {
            if (card) onSelect(index);
            else onMoveToReserve?.(index);
          }}
          onPointerUp={() => onMoveToReserve?.(index)}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && card) onSelect(index);
          }}
        >
          {card ? (
            <Card
              card={card}
              compact
              selected={selectedIndex === index}
              onClick={() => onSelect(index)}
              onPointerDown={() => onSelect(index)}
              onDoubleClick={() => onDoubleClick(index)}
            />
          ) : (
            <span className="empty-slot">Reserve</span>
          )}
        </div>
      ))}
    </section>
  );
}
