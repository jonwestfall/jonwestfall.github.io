import type { DragEvent } from 'react';
import Card from './Card';
import type { Card as GameCard, Selection } from '../game/types';

const STACK_GAP = 34;

interface TableauProps {
  columns: GameCard[][];
  selected: Selection | null;
  legalTargets: boolean[];
  hintedColumns: number[];
  onSelectCard: (columnIndex: number, cardIndex: number) => void;
  onColumnTarget: (columnIndex: number) => void;
  onDoubleClick: (columnIndex: number, cardIndex: number) => void;
  onDragStartCard: (columnIndex: number, cardIndex: number, event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}

export default function Tableau({ columns, selected, legalTargets, hintedColumns, onSelectCard, onColumnTarget, onDoubleClick, onDragStartCard, onDragEnd }: TableauProps) {
  return (
    <section className="tableau" aria-label="Tableau columns">
      {columns.map((column, columnIndex) => {
        const stackHeight = column.length > 0 ? (column.length - 1) * STACK_GAP : 0;
        return (
          <div
            className={`tableau-column target ${legalTargets[columnIndex] ? 'legal-target' : ''} ${hintedColumns.includes(columnIndex) ? 'hint-column' : ''}`}
            key={columnIndex}
            style={{ minHeight: `calc(var(--tableau-top-pad) + var(--card-h) + ${stackHeight}px + var(--tableau-bottom-pad))` }}
            onPointerUp={(event) => {
              if (event.target === event.currentTarget) onColumnTarget(columnIndex);
            }}
            onMouseUp={(event) => {
              if (event.target === event.currentTarget || legalTargets[columnIndex]) onColumnTarget(columnIndex);
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              onColumnTarget(columnIndex);
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
                <div className="tableau-card-wrap" key={card.id} style={{ top: `calc(var(--tableau-top-pad) + ${cardIndex * STACK_GAP}px)`, zIndex: cardIndex + 2 }}>
                  <Card
                    card={card}
                    selected={isSelected}
                    hinted={hintedColumns.includes(columnIndex) && cardIndex === column.length - 1}
                    onClick={() => onSelectCard(columnIndex, cardIndex)}
                    onPointerDown={() => {
                      if (!selected) onSelectCard(columnIndex, cardIndex);
                    }}
                    onDoubleClick={() => onDoubleClick(columnIndex, cardIndex)}
                    onDragStart={(event) => onDragStartCard(columnIndex, cardIndex, event)}
                    onDragEnd={onDragEnd}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
