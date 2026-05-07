# Strength Timer Maintainer Notes

This document explains the standalone `strength-timer.html` page so it can be modified safely later. The page is a static GitHub Pages-compatible HTML file with inline CSS and JavaScript. There is no build step, framework, backend, or external service dependency beyond the existing Google Fonts load.

## File Overview

- `strength-timer.html` contains the entire app:
  - `<style>`: visual layout, timer cards, workout list, import/export controls, report table, responsive rules.
  - `<body>`: the timer display, exercise tabs, sliders/config controls, JSON tools, workout report, and guidance text.
  - `<script>`: presets, state, localStorage persistence, timer state machines, Full Workout JSON loading/sequencing, import/export, report logging, tones, and event listeners.
- `strength-timer-default-workout.json` contains the default Full Workout recipe. GitHub Pages serves this as a static local file, and `strength-timer.html` loads it with `fetch()` during startup.
- The page has three exercise tabs:
  - `Bicep Curls`
  - `Tricep Extensions`
  - `Full Workout`

## Persistent Storage

Settings are saved under:

```js
strength-tempo-timer-settings-v2
```

The stored object contains:

```js
{
  exerciseSettings: {
    biceps: { up, hold, down, reset, setRest, sets, startReps, startCountdown, repDirection },
    triceps: { up, hold, down, reset, setRest, sets, startReps, startCountdown, repDirection }
  },
  fullSettings: {
    standardRest,
    armSwitchRest,
    sidePlankDuration,
    standardReps,
    includeHipHinges,
    customOrder,
    deletedStepIds
  },
  display: {
    hideNumbers,
    hideTraffic,
    muteTones
  }
}
```

Use `normalizeTempoSettings()` and `normalizeFullSettings()` when adding importable or persisted values. They clamp unsafe values and keep old or malformed localStorage data from breaking the page.

## Bicep/Tricep Timer Model

The original exercise tabs use a phase state machine:

```js
phases = [
  { key: "up", label: "Seconds Up" },
  { key: "hold", label: "Time Under Tension" },
  { key: "down", label: "Seconds Down" },
  { key: "reset", label: "Reset" }
]
```

Important functions:

- `getSettings()`: reads current tab controls, or biceps settings when Full Workout needs defaults.
- `totalWorkoutSeconds(settings)`: planned duration for the standalone Bicep/Tricep tabs.
- `setPhase(idx, settings, announce)`: renders a timed phase or set rest.
- `advancePhase(settings)`: moves through phases, reps, sets, and completion.
- `tick()`: one-second countdown loop for the standalone tabs.
- `completeRep(settings)`: updates rep/set state and completes the standalone workout.

Traffic light semantics matter:

- Yellow: `Seconds Up` and `Seconds Down`
- Red: `Time Under Tension`
- Green: `Reset`, rests, and ready states

## Default Workout JSON

The default workout is intentionally outside the HTML source in:

```text
strength-timer-default-workout.json
```

The JSON file is declarative. It does not store current user slider values. Instead, sections use source fields that the page resolves at runtime:

- `repsSource: "biceps"`: use the Bicep Curls tab's current starting reps.
- `repsSource: "triceps"`: use the Tricep Extensions tab's current starting reps.
- `repsSource: "standard"`: use the Full Workout tab's standard reps control.
- `afterRestSource: "standard"`: use the Full Workout tab's standard rest control.
- `armSwitchRestSource: "triceps"`: use the Full Workout tab's tricep arm-switch rest control.
- `durationSource: "sidePlank"`: use the Full Workout tab's side plank duration control.
- `requiresSetting: "includeHipHinges"`: include that section only when the Hip Hinges toggle is on.

Use `loadDefaultWorkoutDefinition()` for the startup fetch, then `hydrateDefaultWorkoutSection()` to convert recipe sections into runnable step objects. If the JSON file cannot be loaded, the page shows a status message in the workout JSON area. Fetching local JSON generally requires serving the page through GitHub Pages or a local web server; opening the HTML directly with `file://` may block it.

Keep default step ids stable when possible, because saved order, deletions, imports, and reports refer to ids such as:

```text
round-1-bicep-curls
round-1-tricep-extensions
round-1-squats-exercise-band
round-2-side-plank
round-3-crunches
```

## Full Workout Data Model

Full Workout is built from step objects, then expanded into runnable segment objects.

`buildFullWorkoutSteps()` reads the loaded JSON recipe and creates the current default workout:

- 3 rounds.
- Bicep Curls use the current Bicep Curls settings.
- Tricep Extensions use the current Tricep Extensions settings.
- Squats, Hip Hinges, Shoulder Shrugs, Upright Band Rows, Crunches, and Side Plank are manual-advance sections.
- Rounds 1 and 3 use Crunches.
- Round 2 uses Side Plank.
- Hip Hinges can be included/excluded with `includeHipHinges`.

`applyFullWorkoutEdits(defaultSteps)` then applies:

- `customOrder`: user-defined order of step ids.
- `deletedStepIds`: sections the user deleted.

`buildFullWorkout()` expands steps into `fullSegments`:

- Timed Bicep/Tricep reps become phase segments via `appendRepSegments()`.
- Tricep arm switching becomes a timed `switch` segment.
- Manual exercises become a single `manual` segment.
- Rests become timed `rest` segments via `appendTimedSegment()`.

## Full Workout Runtime State

Core variables:

- `fullSteps`: current edited list of workout steps.
- `fullSegments`: runnable sequence expanded from `fullSteps`.
- `fullSegmentIndex`: current segment index.
- `workoutRemaining`: estimated remaining time for timed portions and planned rests.
- `hasWorkoutStarted`: controls `Start` vs `Resume`.
- `finished`: completion state.
- `timer`: active interval id.

Important functions:

- `renderFullSegment()`: paints current exercise/phase/rep/rest state and toggles buttons.
- `setFullSegment(index, announce, logSegment)`: moves to a Full Workout segment.
- `tickFullWorkout()`: one-second countdown loop for timed Full Workout segments.
- `advanceFullSegment()`: moves to the next segment and resumes timed segments when appropriate.
- `handleNextSection()`: routes the `Next Section` button.
- `skipCurrentTimedBlock()`: skips remaining timed Bicep/Tricep work and logs completed reps.
- `endCurrentRest()`: skips a rest and records that it ended early.
- `renderCompletion(label, announce)`: shows completion. For Full Workout it leaves `End Workout` visible so the user can officially generate the report.

## Button Behavior

The main timer controls are:

- `Start` / `Pause` / `Resume`: `toggleStartPause()`
- `Next Section`: `handleNextSection()`
- `End Rest`: `endCurrentRest()`
- `End Workout`: `endWorkoutEarly()`
- `Reset`: `resetDisplay()`

Visibility rules:

- `Next Section` appears during:
  - Manual Full Workout exercises.
  - Timed Bicep/Tricep Full Workout phases after the workout has started.
- `End Rest` appears during timed rests.
- `End Workout` appears during an active or completed Full Workout session.
- On natural Full Workout completion, the report is not generated immediately. The page shows `Workout Complete` and leaves `End Workout` visible. The report is generated only after the user taps `End Workout`.
- Loading default workout or importing JSON calls `resetDisplay()` and should return the main button to `Start`.

## Manual Exercises

These Full Workout sections are intentionally not timed:

- Squats: Exercise Band
- Hip Hinges: Exercise Band
- Shoulder Shrugs: Dumbbell
- Upright Band Rows
- Crunches
- Side Plank

The screen shows `Manual Reps` or `Manual Hold`, the clock says `Done?`, and the user taps `Next Section` when finished. Manual elapsed time is recorded from when the segment becomes active until `Next Section` or `End Workout`.

## Workout List Editing

The `Workout Sections` list is rendered by `renderFullWorkoutList()`.

Each row supports:

- Tap row: `jumpToFullStep(stepId)`
- Up arrow: `moveFullStep(stepId, -1)`
- Down arrow: `moveFullStep(stepId, 1)`
- Delete: `deleteFullStep(stepId)`

`Reset to Default Workout` calls `resetDefaultWorkout()`, which:

- Restores Hip Hinges.
- Clears `customOrder`.
- Clears `deletedStepIds`.
- Saves to localStorage.
- Resets the display to a fresh `Start` state.

## JSON Export/Import

The JSON tools use a textarea rather than file APIs so they work on static GitHub Pages and mobile browsers.

`exportWorkoutJson()` writes formatted JSON from `workoutExportData()` into `#workout-json-text`.

Export shape:

```js
{
  version: 1,
  exportedAt: "ISO timestamp",
  exerciseSettings: {
    biceps: { ... },
    triceps: { ... }
  },
  fullWorkout: {
    settings: {
      standardRest,
      armSwitchRest,
      sidePlankDuration,
      standardReps,
      includeHipHinges
    },
    sectionOrder: ["round-1-bicep-curls", "..."],
    deletedStepIds: [],
    sections: [
      {
        id,
        round,
        name,
        type,
        details,
        estimatedSeconds
      }
    ]
  }
}
```

`importWorkoutJson()` accepts the exported shape and a simpler object containing compatible Full Workout fields. It normalizes settings, applies order/deletion state, saves to localStorage, and resets the display.

## Workout Report and CSV

Workout logging is aggregate by meaningful block, not every phase. Timed Bicep/Tricep phases with the same `logKey` roll up into one report row.

Core variables:

- `workoutLog`: raw log entries.
- `activeLogKey`: current aggregate log key.
- `activeLogStartedAt`: timestamp for the current active log segment.
- `workoutSessionStartedAt`: timestamp marking that a Full Workout session has actually started.
- `workoutReportRows`: rows rendered/exported after report generation.

Important functions:

- `startLogForSegment(segment)`: starts or resumes logging for a segment.
- `accrueActiveLog()`: adds wall-clock elapsed time to the active log row.
- `pauseActiveLog()` / `stopActiveLog()`: used by pause, completion, and report generation.
- `markActiveRestSkipped()`: records that `End Rest` ended a rest early.
- `markActiveExerciseSkipped()`: records that `Next Section` advanced out of timed Bicep/Tricep work early.
- `completedRepsForSegment(segment)`: calculates completed reps for timed Bicep/Tricep work.
- `renderWorkoutReport(status)`: renders the HTML report table.
- `reportCsv()`: builds CSV text.
- `downloadReportCsv()`: downloads CSV when browser APIs are available; otherwise places CSV in the JSON textarea as a fallback.

CSV columns:

```text
order,round,section,activity,type,completed_reps,planned_reps,target_reps,target,planned_seconds,actual_seconds,skipped,notes
```

Examples:

- If Bicep Curls is advanced early after 3 of 15 reps, the report records `completed_reps=3`, `planned_reps=15`, `target_reps=15`, and a note like `Advanced early after 3 of 15 reps.`
- If a rest is skipped, the report records the actual rest time and `skipped=true`.
- Manual rep sections record wall-clock time and set rep fields from the planned manual reps.

## Audio Tones

`playTone(kind)` uses the Web Audio API. It is intentionally tiny and optional:

- `muteTonesToggle` disables tones.
- `createAudioContext()` is called from user-initiated flows so browsers allow sound.
- Tone kinds include `up`, `hold`, `down`, `reset`, `rest`, `switch`, `manual`, `countdown`, and `complete`.

## Mobile and Accessibility Notes

- Controls are large and use `touch-action: manipulation`.
- Tabs collapse to a single-column grid on small screens.
- The workout report table uses horizontal overflow so it remains usable on narrow screens.
- Buttons have accessible labels where the visible text is not enough.

## Safe Change Checklist

After editing `strength-timer.html` or `strength-timer-default-workout.json`, run:

```sh
node -e 'JSON.parse(require("fs").readFileSync("strength-timer-default-workout.json","utf8")); console.log("default-workout-json-ok");'
node -e 'const fs=require("fs"); const html=fs.readFileSync("strength-timer.html","utf8"); const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]); scripts.forEach((script,i)=>{ new Function(script); console.log(`script-${i+1}-ok`); });'
git diff --check
```

For behavior changes, add or run a small DOM smoke script that exercises the exact flow. Useful flows to test:

- Start Full Workout and confirm `Next Section` appears during Bicep Curls.
- Press `Next Section` during timed Bicep/Tricep and confirm completed reps appear in the CSV.
- Use a manual exercise, wait, press `Next Section`, and confirm manual elapsed time appears in the report.
- Press `End Rest` and confirm actual rest time plus skipped status are recorded.
- Complete the final workout section and confirm `End Workout` appears before the report.
- Import JSON or reset to default and confirm the main button says `Start`.

## Common Pitfalls

- Do not rebuild `fullSegments` in the middle of an active session unless you intentionally want to reset/logically restart the workout. Rebuilding changes segment object identity and can invalidate the current index.
- `renderFullSegment()` controls important button visibility. If a control does not appear, check whether the segment was re-rendered after state changed.
- The first Full Workout segment is rendered as a preview during reset. Preview rendering must not set `hasWorkoutStarted` or start logging.
- Natural completion should show `End Workout` and wait for the user before generating the report.
- Keep `workoutSessionStartedAt` as the source of truth for whether a reportable session has begun.
- Preserve traffic-light color semantics unless the user explicitly changes them.
