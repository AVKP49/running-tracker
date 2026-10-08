# Data Plan

## Context provenance
- “Google Sheets is used ONLY as the database, via this Apps Script web app endpoint” (verbatim build request; the artifact will not persist running rows in `app.db`).
- “The goal is 1,000 miles in one year.” (verbatim build request; sets the single primary progress target.)
- “fun, interactive, exciting … a child should get excited” (verbatim build request; drives the kinetic storybook trail, confetti, character movement, bouncy numbers, and playful copy.)
- The endpoint’s current GET response is `[{"date":"2026-10-07T07:00:00.000Z","miles":0}]`; this confirms public read access and the current sheet contents, while also showing the user’s announced script update with row `id` values has not reached this sample yet.
- The milestone trail now uses San Francisco as the fixed origin for 100 flags at 10-mile challenge intervals. Each row stores the destination’s separately verified driving distance from San Francisco; the threshold and road distance are intentionally shown as two distinct values.
- Research basis: `~/workspace/research_notes/sf-100-running-milestones-20261008-0333/report.md` (web search, 2026-10-08), supplemented by targeted searches for missing ranges.
- Principal route sources used in the UI include Travelmath, Rome2Rio, Trippy, DistanceCalculator, USA City Map, Check Distance, MoveSmart, and the exact result URLs recorded in the research report.
- Additional exact URLs resolved during this edit: https://www.trippy.com/distance/Yuma-to-San-Francisco ; https://roadtripfrom.com/san-francisco-to-zion-national-park-road-trip/ ; https://www.distance-cities.com/distance-san-francisco-ca-to-brule-ne ; https://www.usacitymap.com/distance-from-san-francisco-city-california-ca-to-kent-city-washington-wa.html ; https://www.distancecalculator.net/from-san-francisco-to-nogales ; https://1map.com/routes/us-ca-san-francisco_to_us-mt-gardiner-3846
- Some catalog rows lack a public link because the research session verified the distance but did not preserve the result URL; those rows show the distance without rendering a source control rather than inventing a URL.

## Tested sources
### User-provided Google Apps Script web app
**Used by**: `listRuns`, `addRun`, `updateRun`, `deleteRun`
**Test command**: `curl -sS -L --max-time 20 'https://script.google.com/macros/s/AKfycbysfJ6a4tfJOeWAWlIXIu8sWrPuT7Td_0D0rYeR4aXIG5r8CwZIryT63051IlWfU2EZ/exec' | head -c 4000`
**Sample output**: `[{"date":"2026-10-07T07:00:00.000Z","miles":0}]`
**Processing**: Server actions proxy all reads and writes to this endpoint. GET rows are validated; the calendar day is extracted from the leading ISO `YYYY-MM-DD` portion so `2026-10-07T07:00:00.000Z` stays October 7 in America/Los_Angeles instead of shifting through viewer-local parsing. Positive miles contribute to totals; zero-mile rows remain harmless and are omitted from totals/charts. Mutations use the exact user-supplied `add`/`update`/`delete` JSON contract, then the client immediately re-runs `listRuns`. Rows without an `id` remain readable but cannot be edited/deleted until the announced Apps Script update supplies row numbers.

### Apps Script redirect host
**Used by**: redirected completion of all endpoint fetches
**Test command**: `curl -sS -L -o /dev/null -w 'final_url=%{url_effective}\nhttp_code=%{http_code}\ncontent_type=%{content_type}\n' 'https://script.google.com/macros/s/AKfycbysfJ6a4tfJOeWAWlIXIu8sWrPuT7Td_0D0rYeR4aXIG5r8CwZIryT63051IlWfU2EZ/exec'`
**Sample output**: final host `script.googleusercontent.com`, HTTP 200, `application/json; charset=utf-8`.
**Processing**: Follow normal fetch redirects; no redirect URL is stored because its signed query is ephemeral.

## Web-search sources
### San Francisco outward-journey milestones
**Delivered by**: build-time milestone catalog rendered in the progress journey, four range tabs, and milestone celebrations.
**Checked with**: deep-research report plus targeted browser searches. The UI creates one progress flag every 10 challenge miles from 10 through 1,000, while separately displaying the destination’s real driving distance from San Francisco. Source links appear only where an exact URL was preserved.

## Agent-task sources
- None. Search snippets and the user-provided API contract are sufficient; no multi-step browsing is needed.

## Map coordinates and rendering
- The default journey view now uses the bundled Meta interactive vector-map control and its built-in basemap styles. The runtime resolves the map resources for the viewer and preserves required OpenStreetMap/legal attribution in the map control.
- San Francisco and all 100 milestone places keep the previously resolved geographic coordinates. The route, progress segment, decluttering milestone layers, runner position, and ten tappable 100-mile landmarks are rendered as local GeoJSON overlays on the interactive map.
- Milestone visibility is zoom-dependent: the wide journey view shows 100-mile flags, 50-mile flags appear at medium zoom, and every 10-mile flag appears at close zoom. Labels use map collision handling so dense city clusters do not pile up.
- The client probes the bundled control at mount time and listens for its fatal load/error path. If the vector map is unsupported or cannot mount, the existing self-contained illustrated atlas becomes the guaranteed interactive fallback; it retains local zoom, drag, route, flags, and selection.

## Image slots
- Separate imagery is not needed: the map’s terrain, Golden Gate Bridge, Space Needle, geyser, cactus, Grand Canyon, runner, route, and markers are original SVG/CSS illustration elements.

## Long-term data behavior
- **Refresh policy**: Fetch on first open and after every add/update/delete; no cron or background refresh.
- **Growth**: Google Sheets remains the only durable running-log store; the artifact database receives no running rows. The client derives aggregates from the fetched list.
- **Ordering**: Log newest calendar date first, then row id descending when available; chart chronological ascending.
- **Time semantics**: User-entered dates are date-only values. Incoming ISO strings are normalized by their leading date segment, matching the stated America/Los_Angeles contract and avoiding timezone rollover.

## Rejected approaches
- **Tried**: Using the endpoint’s current GET rows as proof that edit/delete ids are already live.
  **Why rejected**: The real response currently lacks `id`; the UI will degrade honestly for such legacy rows and automatically enable editing/deletion when the user’s announced script revision returns row numbers.
- **Tried**: External map tiles for the geographic map.
  **Why rejected**: The tile service failed inside the artifact and produced “map unavailable.” The replacement is an always-available, self-drawn SVG map whose route and milestones still use geographic coordinates.
