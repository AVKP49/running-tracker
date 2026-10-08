# Running Tracker

A playful 1,000-mile running challenge, with an interactive street map from San Francisco to Yellowstone.

## Open the app

**https://avkp49.github.io/running-tracker/**

Works in a browser on a phone, tablet, or computer. Google Sheets is the shared database; no run data is saved to browser storage or GitHub. You need an internet connection to sync runs. The current Apps Script endpoint is configured for public access, so this app and its log are not private or password protected.

## Features

- Log, edit, and delete dated runs; full history and a chart of the last 14 run days.
- Challenge totals for September 30, 2026 through September 29, 2027.
- Public Leaflet street map with CARTO / OpenStreetMap tiles, actual road geometry, pinch/scroll zoom, drag, fullscreen exploration, tappable landmarks, route reset, and a runner locator.
- A next-adventure panel with daily pace and the next checkpoint; confetti at every 10-mile crossing.
- An illustrated atlas with a reconnect button when street tiles cannot load.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview
npm test
```

Publish updates with `npm run deploy`; it builds the app and updates the generated `gh-pages` branch. Commit source changes to `main` separately. GitHub Pages publishes that branch with its built-in workflow.

An optional Actions workflow is supplied in `scripts/github-actions-deploy.yml.example`. Enabling it requires a GitHub credential with the `workflow` scope, moving it to `.github/workflows/deploy.yml`, and configuring Pages to use GitHub Actions.

## Google Sheets

The app calls the existing Apps Script web app directly. Reads follow Google's CORS-enabled redirects. Writes send JSON with `Content-Type: text/plain` to avoid an unsupported OPTIONS preflight, and require an explicit `{ "ok": true }` confirmation. Writes are never automatically retried. If confirmation fails, refresh and inspect the log before submitting again.

To use a different sheet, set `VITE_SHEETS_ENDPOINT` in `.env.local` before building. That endpoint is included in the public client bundle. The Apps Script must be deployed for public access and return:

- GET: `[{ "id": 2, "date": "2026-10-07T07:00:00.000Z", "miles": 3 }]`
- POST: `{ "action": "add", "date": "2026-10-07", "miles": 3 }`
- POST: `{ "action": "update", "id": 2, "date": "2026-10-07", "miles": 4 }`
- POST: `{ "action": "delete", "id": 2 }`

IDs in the existing script are sheet row numbers. Avoid simultaneous edits/deletes on multiple devices, since removing a row shifts subsequent IDs. Refresh before editing after another device changes the sheet.

## Route distances

This is a **virtual challenge**, scaled so 1,000 logged miles completes the journey. The estimated driving route via the named landmarks is approximately 1,373 road miles. Landmark popups distinguish road distances from challenge thresholds. Road geometry and distances were generated from OSRM / OpenStreetMap on October 8, 2026 and bundled with the app, so no live routing API is required. Estimates are not turn-by-turn navigation instructions.

`context.md` and `DATA-PLAN.md` are the original handoff notes and describe the previous hosting platform. The original ZIP remains in Downloads.
