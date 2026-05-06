import type { SuitMode } from '../game/types';

export default function RulesModal({ suitMode, onClose }: { suitMode: SuitMode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close rules">x</button>
        <h2 id="rules-title">Alien Solitaire Rules</h2>
        <p>
          Build every active suit foundation upward from Ace to King. Duplicate-suit modes use repeated Ace-through-King foundation cycles so every card can clear.
        </p>
        <ul>
          <li>Five tableau columns, two face-up reserves, and a stock that never recycles.</li>
          <li>Single face-up tableau and reserve cards move onto adjacent ranks up or down, regardless of suit.</li>
          <li>Only face-up same-suit adjacent runs can move as a group. Direction changes are allowed inside the run.</li>
          <li>Empty tableau columns accept any single card or valid same-suit run.</li>
          <li>Draw deals one card to each column, left to right, stopping when the stock is empty.</li>
          <li>Reserves do not refill in this default variant.</li>
          <li>Auto is intentionally conservative: it moves currently available Aces and Twos only.</li>
          <li>Keyboard: H hint, U undo, N new game, A auto.</li>
        </ul>
        <p>
          Current mode: {suitMode} suit{suitMode === 1 ? '' : 's'}. Five-suit mode uses 65 cards, one full set for each original suit.
        </p>
      </section>
    </div>
  );
}
