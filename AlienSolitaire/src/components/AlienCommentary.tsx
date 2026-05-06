import type { GameStatus } from '../game/types';

const alienLines = [
  'After 70 years on Earth, I still distrust this column.',
  'This deal is not on clearance.',
  'Move the same-suit knot, earthling.',
  'The Creature is waiting. Finish the foundations.'
];

const gooseLines = [
  'Breaking: Reserve Card Situation Developing.',
  'Lake Erie wind advisory: tableau unstable.',
  'Too Cold - Kings Have Frozen in Place.',
  'Concert Lacks Birds, But Move Quality Improving.',
  '5 degree windchill - Tableau Chaos Increasing.',
  'Lake Erie Advisory: Kings Blocking Everything.'
];

export function randomLine(seed: number, speaker: 'alien' | 'goose'): string {
  const lines = speaker === 'alien' ? alienLines : gooseLines;
  return lines[Math.abs(seed) % lines.length];
}

export default function AlienCommentary({ message, status, seedNumber }: { message: string; status: GameStatus; seedNumber: number }) {
  return (
    <section className="commentary-panel" aria-label="Scary Alien and Weather Goose commentary">
      <div className="alien-portrait" aria-hidden="true">
        <div className="dome">
          <div className="brain" />
          <div className="eyes">
            <span />
            <span />
          </div>
          <div className="jaw" />
        </div>
        <div className="hoodie">DELTA STATE OF OUTER SPACE</div>
      </div>
      <div className="speech scary">
        <strong>The Scary Alien</strong>
        <p>{message || randomLine(seedNumber, 'alien')}</p>
      </div>
      <div className="goose-card">
        <div className="goose-portrait" aria-hidden="true">
          <span className="hat" />
          <span className="goose-head" />
          <span className="mic" />
        </div>
        <div>
          <strong>The Weather Goose</strong>
          <p>{status === 'won' ? 'Win confirmed. Foundations improving despite shoreline spray.' : randomLine(seedNumber + 3, 'goose')}</p>
        </div>
      </div>
      <div className="lore-ticker">
        Mr. Bird watches Bird TV. Mr. Smudge checks the Ace. The Creature idles near Marblehead. Cedar Point blinks in the distance.
      </div>
    </section>
  );
}
