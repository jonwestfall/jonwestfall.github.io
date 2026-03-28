# Different Enough?

Is that signal, or just noise?

Different Enough? is a teaching-forward inferential statistics helper for practical decision support. It helps users choose a test, run analysis, get plain-language interpretation, and generate APA-style reporting while emphasizing effect sizes, confidence intervals, and interpretation risk.

## v1 Scope

Supported analyses:
- Independent-samples t-test (Welch default)
- Paired-samples t-test
- Chi-square goodness-of-fit
- Chi-square test of independence
- Correlation (Pearson default, with Spearman recommendation when appropriate)

Input modes:
- Raw pasted values
- CSV upload with type inference and preview
- Summary statistics entry
- Contingency-table entry

Also includes:
- Question-first and data-first onboarding
- Manual test selection mode
- Missing data warnings with listwise exclusion reporting
- Trust panel and assumptions/warnings
- APA copy button
- Export analysis/results to JSON and reload
- Print-friendly summary
- 3 built-in example datasets

## Project Structure

```txt
src/
  components/      # UI pieces (landing, onboarding, data input, results, charts)
  data/            # CSV parsing and missing-data utilities
  examples/        # Built-in sample datasets
  logic/           # Recommendation, analysis composition, interpretation, APA helpers
  stats/           # Statistical/math utilities and tests
  utils/           # Export/import helpers
  types.ts         # Shared types
```

## Local Development

Requirements:
- Node.js 20+ recommended

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

Run unit tests:

```bash
npm run test
```

## GitHub Pages Deployment (Vite)

This project uses `vite.config.ts` with:
- `base` inferred from `GITHUB_REPOSITORY` during build (e.g. `/repo-name/`)
- fallback to `/` for local/dev use

### Included workflow (subfolder repo setup)

This workspace includes a ready workflow at:

- `.github/workflows/deploy-different-enough-pages.yml`

It builds from the `DifferentEnough` subfolder and deploys `DifferentEnough/dist` to Pages.

### One-time GitHub setup

1. Push this repository (including `.github/workflows/deploy-different-enough-pages.yml`) to GitHub.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Ensure your default deployment branch is `main` (or update the workflow trigger branch).
5. Push a commit touching `DifferentEnough/**` or run the workflow manually from `Actions`.

### What the workflow does

1. Checks out code
2. Installs Node 20
3. Runs `npm ci` in `DifferentEnough`
4. Runs tests (`npm run test`)
5. Builds (`npm run build`)
6. Uploads `DifferentEnough/dist`
7. Deploys using `actions/deploy-pages`

If your repo name changes or you move this app out of `DifferentEnough`, update workflow paths accordingly.

## Interpretation Notes

The app is intentionally opinionated:
- It warns when test choice appears risky.
- It reminds users that significance is not practical importance.
- It highlights sample size and assumption concerns.
- It reports missing-data exclusions instead of silently dropping rows.

## Disclaimer

This app is a practical helper, not a substitute for full statistical consultation.  
Significance does not equal importance.  
Poor study design cannot be fixed by a test.  
Results from inappropriate or low-quality data should not be overinterpreted.
