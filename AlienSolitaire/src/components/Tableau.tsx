import Card from './Card';
import type { Card as GameCard, Selection } from '../game/types';

interface TableauProps {
  columns: GameCard[][];
  selected: Selection | null;
  legalTargets: boolean[];
  hintedColumns: number[];
  onSelectCard: (columnIndex: number, cardIndex: number) => void;
  onColumnTarget: (columnIndex: number) => void;
  onDoubleClick: (columnIndex: number, cardIndex: number) => void;
}

export default function Tableau({ columns, selected, legalTargets, hintedColumns, onSelectCard, onColumnTarget, onDoubleClick }: TableauProps) {
  return (
    <section className="tableau" aria-label="Tableau columns">
      {columns.map((column, columnIndex) => (
        <div
          className={`tableau-column target ${legalTargets[columnIndex] ? 'legal-target' : ''} ${hintedColumns.includes(columnIndex) ? 'hint-column' : ''}`}
          key={columnIndex}
          onPointerUp={(event) => {
            if (event.target === event.currentTarget) onColumnTarget(columnIndex);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onColumnTarget(columnIndex);
          }}
        >
          <span className="column-label">Column {columnIndex + 1}</span>
          {column.length === 0 && <button className="empty-column" type="button" onClick={() => onColumnTarget(columnIndex)}>Empty</button>}
          {column.map((card, cardIndex) => {
            const isSelected =
              selected?.source === 'tableau' &&
              selected.columnIndex === columnIndex &&
              cardIndex >= selected.startIndex;
            return (
              <div className="tableau-card-wrap" key={card.id} style={{ top: `${cardIndex * 34}px`, zIndex: cardIndex + 1 }}>
                <Card
                  card={card}
                  selected={isSelected}
                  hinted={hintedColumns.includes(columnIndex) && cardIndex === column.length - 1}
                  onClick={() => onSelectCard(columnIndex, cardIndex)}
                  onPointerDown={() => {
                    if (!selected) onSelectCard(columnIndex, cardIndex);
                  }}
                  onDoubleClick={() => onDoubleClick(columnIndex, cardIndex)}
                />
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
