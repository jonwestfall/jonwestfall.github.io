# Alien Solitaire

Alien Solitaire is a fully static Vite + React + TypeScript solitaire game inspired by public rules for a reversible-adjacency solitaire variant. It uses original art direction, CSS/SVG-style illustrations, and no copied app assets, names, card backs, sounds, icons, typography, or proprietary UI.

Theme: The Scary Alien, The Weather Goose, Mr. Bird, Mr. Smudge, Lake Erie storm spray, The Creature, Bird TV, classic cars, Fossil Club, and suspicious clearance stickers.

## Run Locally

```bash
npm install
npm run dev
npm run build
```

The Vite dev server prints a local URL, usually `http://localhost:5173/AlienSolitaire/`.

## Rules

- Five tableau columns, two face-up reserve cards, a stock, and one foundation per active suit.
- Modes: 1, 2, 3, 4, or 5 suits. Default is 1 suit.
- Ranks are A through K.
- The initial deal uses 23 tableau cards across five columns, with only the top card of each column face-up. Two more cards become face-up reserves. The rest become stock.
- Single face-up cards move onto tableau cards that are exactly one rank higher or lower, regardless of suit.
- Empty tableau columns accept any single face-up card or any valid movable run.
- Only face-up same-suit adjacent runs can move as a group. Direction changes inside a run are legal, so `10, J, 10, 9, 8` is valid if all cards share the same suit.
- Mixed-suit runs cannot move as a group.
- Foundations build upward by suit from Ace to King.
- Reserves can move to tableau or foundation and do not refill in the default variant.
- Drawing deals one face-up card to each tableau column from left to right. If fewer than five cards remain, it deals until the stock is empty. The stock does not recycle.
- The game is lost only when the stock is empty and no legal moves remain.
- Auto is conservative: it moves available Aces and Twos only, because higher cards can still matter for tableau sequencing.

## Deck And Foundation Assumptions

Duplicate-suit modes still need every card to reach a foundation, so foundations accept repeated Ace-through-King cycles for each copy of that suit:

- 1 suit: Brain suit, four copies, 52 cards total.
- 2 suits: Brain and Goose, two copies each, 52 cards total.
- 3 suits: Brain doubled, Goose and Budgie single, 52 cards total.
- 4 suits: Brain, Goose, Budgie, and Limo, one copy each, 52 cards total.
- 5 suits: Brain, Goose, Budgie, Limo, and Lake Erie, one copy each, 65 cards total.

Five-suit mode intentionally uses 65 cards so each original suit can have a complete foundation.

## Controls

- Click or tap a card/run to select it, then click or tap a highlighted tableau/foundation target.
- Double-click or double-tap a top tableau card or reserve card to move it to foundation when legal.
- Drag-style touch/mouse play is supported with pointer selection and pointer-up targets.
- `H`: show hints.
- `U`: undo.
- `N`: new game.
- `A`: conservative auto-foundation.

The game tracks moves, time, undo count, games played, wins, best time, fewest moves, and win streak in `localStorage`. Reloading resumes the current game.

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

Upload or publish the generated `dist` folder to GitHub Pages.

### GitHub Actions

This project includes `.github/workflows/deploy.yml`. In a standalone repository:

1. Push the project to GitHub.
2. In repository settings, set Pages source to GitHub Actions.
3. Run the workflow by pushing to `main`.
4. The workflow builds `dist` and publishes it to Pages.

## Known Limitations

- The game uses original CSS illustrations rather than raster art or external image files.
- Auto-foundation is deliberately cautious and only files Aces and Twos.
- Pointer play uses select-and-release targeting rather than a floating dragged card preview.
- Sound effects are simple Web Audio beeps and respect the muted setting.
