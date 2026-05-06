export default function TutorialModal({
  firstRun,
  onClose,
  onDone
}: {
  firstRun: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="rules-modal tutorial-modal" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close tutorial">x</button>
        <h2 id="tutorial-title">{firstRun ? 'Want the Alien Solitaire tutorial?' : 'Alien Solitaire Tutorial'}</h2>
        {firstRun && <p>The Weather Goose can brief you before the first deal gets any stranger.</p>}
        <ol>
          <li>Clear cards to foundations from Ace upward. In duplicate-suit modes, each suit foundation repeats A through K for every copy.</li>
          <li>Tap a card or same-suit run, then tap a glowing tableau or foundation target.</li>
          <li>Drag a face-up card or same-suit run onto a glowing column or foundation when using a mouse or trackpad.</li>
          <li>Single cards can land on ranks one higher or one lower, any suit. Group moves must be same-suit adjacent runs.</li>
          <li>Use reserves early. They do not refill.</li>
          <li>Draw only when useful. The stock deals left to right and never recycles.</li>
          <li>Press H for hints, U for undo, A for conservative auto-foundation, and N for a new game.</li>
        </ol>
        <div className="tutorial-actions">
          {firstRun && <button type="button" onClick={onClose}>Skip For Now</button>}
          <button type="button" onClick={onDone}>{firstRun ? 'Show Me The Deal' : 'Done'}</button>
        </div>
      </section>
    </div>
  );
}
