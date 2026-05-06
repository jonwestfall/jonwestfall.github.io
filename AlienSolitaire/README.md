# Alien Solitaire

Alien Solitaire is a fully static Vite + React + TypeScript solitaire game inspired by public rules for a reversible-adjacency solitaire variant. It uses original art direction, CSS/SVG-style illustrations, and no copied app assets, names, card backs, sounds, icons, typography, or proprietary UI.

Theme: The Scary Alien, The Weather Goose, Mr. Bird, Mr. Smudge, Lake Erie storm spray, The Creature, Bird TV, classic cars, Fossil Club, and suspicious clearance stickers.

## Run Locally

```bash
npm install
npm run dev
npm run build
```

The Vite dev server prints a local URL. For hot-reload development, open `http://localhost:5173/AlienSolitaire/app.html`.

`AlienSolitaire/index.html` is intentionally the checked-in GitHub Pages build output. It loads compiled files from `AlienSolitaire/assets/`, which is what makes `https://jonwestfall.github.io/AlienSolitaire/index.html` work when this folder is served directly from the user-site repository.

## Rules

- Five tableau columns, two face-up reserve cards, a stock, and one foundation per active suit.
- Modes: 1, 2, 3, 4, or 5 suits. Default is 1 suit.
- Ranks are A through K.
- The initial deal uses 23 tableau cards across five columns, with only the top card of each column face-up. Two more cards become face-up reserves. The rest become stock.
- Single face-up cards move onto tableau cards that are exactly one rank higher or lower, regardless of suit.
- Empty tableau columns accept any single face-up card or any valid movable run.
- Only face-up same-suit adjacent runs can move as a group. Direction changes inside a run are legal, so `10, J, 10, 9, 8` is valid if all cards share the same suit.
- Mixed-suit runs cannot move as a group.
- Foundations build upward by suit from Ace to King. Duplicate-suit modes show one physical receiving pile per suit copy.
- Reserves can move to tableau or foundation and do not refill in the default variant.
- Drawing deals one face-up card to each tableau column from left to right. If fewer than five cards remain, it deals until the stock is empty. The stock does not recycle.
- The game is lost only when the stock is empty and no legal moves remain.
- Auto is conservative: it moves available Aces and Twos only, because higher cards can still matter for tableau sequencing.
- New deals are generated from a seeded, foundation-legal reveal sequence. That means every new game is theoretically winnable by clearing available foundation cards and drawing only after the current visible sequence has cleared.

## Deck And Foundation Assumptions

Duplicate-suit modes still need every card to reach a foundation, so the top row shows one physical Ace-through-King receiving pile for each copy of that suit:

- 1 suit: Brain suit, four copies, 52 cards total.
- 2 suits: Brain and Goose, two copies each, 52 cards total.
- 3 suits: Brain doubled, Goose and Budgie single, 52 cards total.
- 4 suits: Brain, Goose, Budgie, and Limo, one copy each, 52 cards total.
- 5 suits: Brain, Goose, Budgie, Limo, and Lake Erie, one copy each, 65 cards total.

Five-suit mode intentionally uses 65 cards so each original suit can have a complete foundation.

## Controls

- Click or tap a card/run to select it, then click or tap a highlighted tableau/foundation target.
- Drag a face-up card or valid same-suit run onto a highlighted tableau/foundation target with a mouse or trackpad.
- Double-click or double-tap a top tableau card or reserve card to move it to foundation when legal.
- `H`: show hints.
- `U`: undo.
- `N`: new game.
- `A`: conservative auto-foundation.

The game tracks moves, time, undo count, games played, wins, best time, fewest moves, and win streak in `localStorage`. Reloading resumes the current game.

On first launch, Alien Solitaire offers a tutorial. You can reopen it from the Tutorial button. Themes include Stormy Lake Erie, Cleveland Bungalow, Scottish Weather Goose Tour, and Lake Erie Daylight.

## Winnable Deal Model

Random solitaire deals can be impossible without a solver pass. Alien Solitaire avoids that by constructing each seeded deal in foundation-legal reveal order:

1. The deck generator creates a seeded sequence where every card is legal for its foundation when it appears.
2. The first five cards become tableau tops, the next two become reserves, the remaining tableau cards are placed in the order they will be exposed, and the rest go to stock.
3. A proof path always exists: play available foundation cards, let exposed face-down cards flip, clear reserves when their rank is next, then draw once the current visible sequence is clear.

The seed still matters, especially in multi-suit modes, because the generator chooses among currently legal suits using the seeded random stream.

## Debug Rule Tests

Open the app with `?debug=1` to show the in-app developer test panel. It checks adjacency moves, mixed-suit group blocking, same-suit direction-changing runs, foundation rank order, and auto-flipping exposed face-down cards.

## GitHub Pages

`vite.config.ts` currently uses:

```ts
base: '/AlienSolitaire/'
```

That is correct for a project published at `https://USERNAME.github.io/AlienSolitaire/`, or for this folder being deployed as its own repository named `AlienSolitaire`.

If you deploy from a different repository name, change `base` to `'/REPOSITORY_NAME/'`. If deploying at a user-site root such as `https://USERNAME.github.io/`, use `base: '/'`.

### Manual Build

```bash
npm install
npm run build
```

The build creates `dist/` and then syncs the GitHub Pages-ready files into:

- `index.html`
- `assets/`

Commit those files when deploying from a GitHub user-site repository that serves the branch root directly.

### GitHub Actions

This project includes `.github/workflows/deploy.yml`. In a standalone repository where `AlienSolitaire` is the repository root:

1. Push the project to GitHub.
2. In repository settings, set Pages source to GitHub Actions.
3. Run the workflow by pushing to `main`.
4. The workflow builds `dist` and publishes it to Pages.

## Known Limitations

- The game uses original CSS illustrations rather than raster art or external image files.
- Auto-foundation is deliberately cautious and only files Aces and Twos.
- Pointer play uses select-and-release targeting rather than a floating dragged card preview.
- Sound effects are simple Web Audio beeps and respect the muted setting.
