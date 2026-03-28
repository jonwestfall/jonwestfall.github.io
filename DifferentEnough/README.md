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

### Typical GitHub Actions flow

1. Push code to your repository.
2. Use a workflow that runs:
   - `npm ci`
   - `npm run build`
3. Deploy `dist/` to GitHub Pages (Pages artifact or `gh-pages` branch flow).

If your repo or deployment setup is unusual, you can explicitly set `base` in `vite.config.ts`.

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
