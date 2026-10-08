# Running Tracker — Project Context

> Handoff brief for an AI assistant (Claude / Codex) taking over development.
> Written 2026-10-08. Read this first, then the source.

## What this is

A playful, kid-exciting running dashboard for AJ (the user). He logs **date + miles run**;
the app keeps a persistent log, totals, a progress chart, and a milestone adventure map.
The big goal: **1,000 miles in one year** — challenge period **2026-09-30 → 2027-09-29**
(progress is computed from runs inside that window; the full log stays visible).

The owner's hard requirement: **Google Sheets is the ONLY database.** No run data may
live permanently anywhere else. "Data should never be lost."

## Tech stack

- **Client:** React 19 + TypeScript, Vite-style build via `client/build.mjs`, Tailwind CSS v4,
  `@tanstack/react-query`, `recharts` (14-day chart). Entry: `client/src/main.tsx` → `App.tsx`.
- **Server:** Bun, `server/src/actions.ts` — typed RPC actions (`defineAction` from
  `@hatch/space-sdk`), proxied to the client via `client/src/api.ts`
  (`createActionClient`). Server actions are the ONLY place that touches the network
  for Sheets (browser never calls Google directly).
- **DB:** `drizzle` + SQLite `app.db` exists in the scaffold but **stores no run rows**
  (per the Sheets-only rule). Do not start persisting runs there.
- **Runtime:** This was built as a Hatch "TS space" web artifact (private, no public link;
  static/public pages on that platform cannot call external services).
  `space.json` → entry `client/dist/index.html`, slug `running-tracker-4`.
- **Package manager:** bun 1.3.10. Scripts: `bun run build` (server then client),
  `bun x tsc --noEmit -p client/tsconfig.json` for typecheck.

### How to run locally

```bash
bun install
bun run build        # builds server/dist + client/dist
# serve client/dist/index.html and expose server actions at ./actions
# (In the Hatch runtime this wiring is automatic; standalone you'll need to
#  replicate: static file server + POST ./actions {action, args} → actions.js)
```

## Google Sheets backend (the database)

Apps Script web app, deployed by the user, "Execute as: Me", "Who has access: Anyone":

```
https://script.google.com/macros/s/AKfycbysfJ6a4tfJOeWAWlIXIu8sWrPuT7Td_0D0rYeR4aXIG5r8CwZIryT63051IlWfU2EZ/exec
```

**API contract** (implemented in the user's current Apps Script — verified live 2026-10-07):

- `GET` → JSON array of `{ id: <sheet row number>, date: <ISO string>, miles: <number> }`.
  Dates arrive like `"2026-10-07T07:00:00.000Z"` — the server takes the leading
  `YYYY-MM-DD` segment so it stays Oct 7 in America/Los_Angeles (no TZ rollover).
- `POST {"action":"add","date":"YYYY-MM-DD","miles":n}` → appends a row.
- `POST {"action":"update","id":row,"date":"YYYY-MM-DD","miles":n}` → updates a row.
- `POST {"action":"delete","id":row}` → deletes a row.

Server actions in `server/src/actions.ts`: `listRuns`, `addRun`, `updateRun`,
`deleteRun` (+ `deleteRun` uses row id; after deletes the client re-fetches because
row numbers shift). Zero-mile rows are ignored in totals. Follow redirects
(Google issues a 302 to `script.googleusercontent.com`).

The user's Apps Script source (for reference — lives in THEIR Google account,
Extensions → Apps Script on the "Running Log" sheet):

```javascript
function json(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){
  const s=SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows=s.getDataRange().getValues();
  return json(rows.slice(1).map((r,i)=>({id:i+2,date:r[0],miles:Number(r[1])||0})));
}
function doPost(e){
  const s=SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const b=JSON.parse(e.postData.contents);
  if(b.action==='delete'){s.deleteRow(b.id);}
  else if(b.action==='update'){s.getRange(b.id,1,1,2).setValues([[b.date,Number(b.miles)||0]]);}
  else{s.appendRow([b.date,Number(b.miles)||0]);}
  return json({ok:true});
}
```

## Features (as of 2026-10-08)

- Add / edit / delete run entries (date + miles), with confirmation on delete.
- Big 1,000-mile odometer, challenge dates + days remaining, "miles to goal".
- 14-day mileage chart (recharts), streak/highlight stats, confetti celebrations.
- Milestone adventure map (see below) — compact widget + fullscreen explore mode,
  zoom (wheel / pinch / double-click / +/- buttons), drag-pan, "Route" reset button,
  tappable landmark pins with details.

## Milestone system design

- **San Francisco is the fixed start** for every milestone (user's decision).
- **100 progress flags, one every 10 miles**, 10 → 1,000.
- **Dozens of NAMED places** layered on top at their natural distances (user: "every
  100 miles feels too distant — add interesting places at 15, 20, 30 miles…").
  Each has a real name, lat/lng, and a fun one-line description.
- Route corridor (geographically ordered, no zigzag): San Francisco → Sacramento →
  Reno → Salt Lake City → Idaho → **Yellowstone north entrance** (the 1,000-mile finish).
- Milestone catalog lives in `client/src/App.tsx` (`routeStops` + derived `Milestone[]`
  with `miles` = unlock threshold, `actualMiles` = road distance, `destination`,
  `detail`, `lat`, `lng`, optional `source` link).
- A deep-research report with verified driving distances from SF exists at
  `~/workspace/research_notes/sf-100-running-milestones-20261008-0333/report.md`
  (NOT included in this zip — on the original machine).

## Map history — READ THIS, it explains the current mess

1. **Meta HatchMaps SDK** (`client/src/assets/hatch-maps.js`, `map_helpers.mjs`):
   the first "real" map. Its tile pipeline (Meta `fbcdn.net` endpoints) could not
   connect from the artifact runtime → "Map unavailable" / "The map couldn't connect".
   **Dead code now** — `hatch-maps.js`/`map_helpers.mjs` are unreferenced by `App.tsx`.
   Safe to delete, but they were left in place.
2. **Hand-drawn SVG atlas** (`client/src/IllustratedAdventureMap.tsx`, 487 lines):
   fully self-contained, zero network deps, always renders. Became the fallback.
   User called early versions "ugly"; later a watercolor restyle landed and he liked it.
3. **Vector street map** (`client/src/RealAdventureMap.tsx`, 309 lines): mounts the
   runtime's bundled vector-map control via `mountMap()` from `map_helpers.mjs`,
   overlays the route line (GeoJSON), progress checkpoints, runner marker, and
   milestone pins. **User confirmed: "works beautifully. Great job." (2026-10-08).**
4. After the "dozens of named places" build, the street map disappeared for the user
   (fallback misfiring). Two repair rounds followed. Current state per last builder
   report: vector street map is primary again; the illustrated atlas can no longer
   silently replace it; transient failures trigger bounded auto-retries + a manual
   reconnect control.

## Known open issues (do these first)

1. **[P0] Tile-load detection is fake.** `RealAdventureMap.tsx` treats the presence of
   any `<canvas>` as proof tiles loaded (a ~180ms timer), with no real
   `Image.onload`/`Image.onerror` probe of a tile URL. A blank canvas can be accepted
   as "ready", or stuck in loading forever. Fix: probe a production tile URL with
   onload/onerror + timeout before declaring ready; fall back to the illustrated
   atlas only on genuine failure.
2. **[P0] Milestone distances are normalized, not real.** `App.tsx` rescales cumulative
   distances with `(rawDistance / rawRouteTotal) * 1000` so Yellowstone = exactly 1,000.
   Labels like "2.5 miles to Bay Bridge" are illustrative, not measured. User was
   promised real distances. Fix: use cumulative measured route distances; if the
   journey must end at 1,000, extend/trim the route at its true 1,000-mile point
   (or label honestly).
3. The audit/test sandbox for this runtime blocks external egress, so automated
   screenshots may show a blank map canvas even when tiles work on a real device.
   Verify map changes on a real device/network, not just in the sandbox.
4. `map_helpers.mjs` / `hatch-maps.js` / `hatch-maps.css` are dead weight (Meta SDK
   era). Remove once the vector map path is stable, or keep as reference.

## User preferences (do not regress these)

- Map shows **only the journey territory** (SF→Yellowstone corridor), never a full USA map.
- **One clear route line** from start to destination with milestone markers along it.
- **Google-Maps-level zoom + drag/pan** on laptop AND phone; deep zoom into landmark
  detail; markers must declutter on zoom (no clustered overlapping circles).
- Every milestone = a **real place** with its real name/distance — never generic
  multipliers like "Marathon ×10" (he hated that).
- Tone: playful, kid-exciting, confetti, fun copy. Beautiful illustration bar is high —
  he called an early map "ugly" and will say so again.
- He values speed and honesty: concede mistakes fast, never defend broken work,
  verify on a real device before claiming "fixed".

## File map

```
running-tracker/
├── PROJECT-CONTEXT.md      ← this file
├── package.json / bun.lock / bunfig.toml / tsconfig.base.json
├── space.json              ← Hatch artifact manifest (runtime, entry, slug)
├── DATA-PLAN.md            ← data-layer notes from the original build
├── AGENTS.md               ← Hatch builder instructions (only relevant in Hatch)
├── client/
│   ├── index.html / build.mjs / tsconfig.json
│   └── src/
│       ├── App.tsx                   ← main UI, milestone catalog, challenge logic
│       ├── RealAdventureMap.tsx      ← vector street map (primary)
│       ├── IllustratedAdventureMap.tsx ← hand-drawn SVG fallback map
│       ├── map_helpers.mjs/.d.ts     ← Meta SDK helpers (DEAD CODE, unreferenced)
│       ├── assets/hatch-maps.js/.css ← Meta SDK bundle (DEAD CODE, 1.3MB)
│       ├── api.ts / main.tsx / theme.css / globals.d.ts
├── server/src/
│   ├── actions.ts            ← listRuns/addRun/updateRun/deleteRun → Sheets
│   └── schema.ts
└── drizzle/                  ← unused migrations (no run data in SQLite, by design)
```

## Suggested first tasks for the new assistant

1. Fix the tile-load probe (issue #1) — this is why the user kept seeing wrong maps.
2. Fix distance normalization (issue #2) — use real measured distances.
3. Verify on a real device that the vector street map renders with route + pins.
4. Delete the dead Meta SDK files once #1–#3 are green.
5. Then: whatever the user asks next. He runs ~3 miles/day and will start logging
   for real once the map is trustworthy.
