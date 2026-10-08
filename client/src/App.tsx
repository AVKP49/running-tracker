import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import roadData from "./route-data.json";
import { RealAdventureMap, roadPointAtMiles } from "./RealAdventureMap";
import { api, type Run } from "./api";


type Milestone = {
  miles: number;
  actualMiles: number;
  destination: string;
  detail: string;
  tone: string;
  lat: number;
  lng: number;
  source?: string;
};

const GOAL = 1000;
const CHALLENGE_START = "2026-09-30";
const CHALLENGE_END = "2027-09-29";

const routeStops: ReadonlyArray<readonly [string, string, number, number]> = [
  ["Bay Bridge, CA", "The journey leaves San Francisco over the bay", 37.7983, -122.3778],
  ["Treasure Island, CA", "Skyline views rise from the middle of the bay", 37.8235, -122.3706],
  ["Oakland, CA", "Lake Merritt and bright city murals", 37.8044, -122.2712],
  ["Emeryville, CA", "A bayside stop on the East Bay trail", 37.8395, -122.2892],
  ["Berkeley, CA", "The Campanile watches over the hills", 37.8715, -122.2730],
  ["Albany, CA", "A small shoreline town beside the bay", 37.8869, -122.2977],
  ["El Cerrito, CA", "Hillside trails look back toward San Francisco", 37.9158, -122.3117],
  ["Richmond, CA", "Rosie the Riveter history by the water", 37.9358, -122.3477],
  ["Crockett, CA", "The route meets the Carquinez Strait", 38.0524, -122.2130],
  ["Vallejo, CA", "Historic ships and a lively waterfront", 38.1041, -122.2566],
  ["Cordelia, CA", "Rolling hills open toward the valley", 38.2141, -122.1264],
  ["Fairfield, CA", "The Jelly Belly factory brings a sweet detour", 38.2494, -122.0400],
  ["Vacaville, CA", "Orchards and low hills line the road", 38.3566, -121.9877],
  ["Dixon, CA", "Sunflower country stretches beside the highway", 38.4455, -121.8233],
  ["Davis, CA", "Bikes and oak-lined paths fill this college town", 38.5449, -121.7405],
  ["Yolo Bypass, CA", "A vast seasonal wetland welcomes migrating birds", 38.5752, -121.6451],
  ["West Sacramento, CA", "The Sacramento River comes into view", 38.5805, -121.5302],
  ["Tower Bridge, CA", "A golden bridge spans the river", 38.5816, -121.5075],
  ["Old Sacramento, CA", "Wooden sidewalks recall the Gold Rush", 38.5848, -121.5043],
  ["California State Capitol, CA", "A white dome rises among the gardens", 38.5767, -121.4934],
  ["Roseville, CA", "Railroad history marks the climb east", 38.7521, -121.2880],
  ["Rocklin, CA", "Granite quarries signal the Sierra foothills", 38.7907, -121.2358],
  ["Loomis, CA", "Fruit sheds and small-town streets", 38.8213, -121.1930],
  ["Newcastle, CA", "Citrus groves cling to the foothills", 38.8741, -121.1333],
  ["Auburn, CA", "Gold Country streets perch above the canyon", 38.8966, -121.0769],
  ["Meadow Vista, CA", "Pines thicken as the road climbs", 39.0013, -121.0219],
  ["Colfax, CA", "A mountain railroad town above the American River", 39.1007, -120.9533],
  ["Gold Run, CA", "Hydraulic-mining cliffs tell a Gold Rush story", 39.1757, -120.8588],
  ["Dutch Flat, CA", "A tiny historic village among tall pines", 39.2068, -120.8383],
  ["Alta, CA", "The trail climbs deeper into the Sierra", 39.2277, -120.7638],
  ["Blue Canyon, CA", "Granite ridges and snowy forests appear", 39.2577, -120.7110],
  ["Emigrant Gap, CA", "A dramatic pass recalls wagon-train crossings", 39.2968, -120.6708],
  ["Cisco Grove, CA", "The South Yuba tumbles beside the road", 39.3114, -120.5446],
  ["Donner Summit, CA", "The route crests the Sierra Nevada", 39.3258, -120.3858],
  ["Truckee, CA", "A lively mountain town beside the river", 39.3279, -120.1833],
  ["Verdi, NV", "The Truckee River crosses into Nevada", 39.5182, -119.9888],
  ["Reno Arch, NV", "The Biggest Little City glows ahead", 39.5276, -119.8138],
  ["Sparks, NV", "Victorian Square celebrates railroad roots", 39.5349, -119.7527],
  ["Lockwood, NV", "The river threads through a high-desert canyon", 39.5069, -119.6444],
  ["Wadsworth, NV", "Desert sky opens near Pyramid Lake country", 39.6332, -119.2852],
  ["Fernley, NV", "Irrigated fields meet the wide Nevada desert", 39.6070, -119.2518],
  ["Lovelock, NV", "A round courthouse anchors this historic town", 40.1794, -118.4735],
  ["Rye Patch Reservoir, NV", "Blue water flashes against tawny hills", 40.4713, -118.3077],
  ["Imlay, NV", "Thunder Mountain folk art rises from the desert", 40.6574, -118.1535],
  ["Winnemucca, NV", "Basque food and buckaroo history", 40.9730, -117.7357],
  ["Golconda, NV", "Hot springs steam near an old mining town", 40.9608, -117.4918],
  ["Battle Mountain, NV", "A broad basin sits beneath rugged ranges", 40.6421, -116.9343],
  ["Carlin, NV", "The Humboldt River squeezes through a canyon", 40.7138, -116.1037],
  ["Elko, NV", "Cowboy culture thrives in the high desert", 40.8324, -115.7631],
  ["Halleck, NV", "Ruby Mountain views widen to the south", 40.9488, -115.4512],
  ["Deeth, NV", "Cottonwoods gather around a tiny ranching stop", 41.0669, -115.2753],
  ["Wells, NV", "The East Humboldt Range fills the horizon", 41.1116, -114.9645],
  ["Pequop Summit, NV", "The road climbs one last Great Basin pass", 41.1354, -114.6088],
  ["West Wendover, NV", "Neon marks the Nevada–Utah line", 40.7391, -114.0733],
  ["Wendover Airfield, UT", "Historic hangars stand at the desert edge", 40.7197, -114.0358],
  ["Bonneville Salt Flats, UT", "A brilliant white plain stretches for miles", 40.7625, -113.8960],
  ["Knolls, UT", "Dunes and salt desert roll toward the lake", 40.7319, -113.2921],
  ["Delle, UT", "A lone desert outpost beneath the Stansbury Mountains", 40.7716, -112.7880],
  ["Great Salt Lake Marina, UT", "Sailboats float beneath island mountains", 40.7334, -112.2136],
  ["Salt Lake City, UT", "Temple Square and the Wasatch skyline", 40.7608, -111.8910],
  ["Bountiful, UT", "Foothill views look across the Great Salt Lake", 40.8894, -111.8808],
  ["Farmington, UT", "Lagoon’s roller coasters rise beside the route", 40.9805, -111.8874],
  ["Lagoon, UT", "A century-old amusement park adds some thrills", 40.9857, -111.8952],
  ["Layton, UT", "The Wasatch peaks tower over the valley", 41.0602, -111.9711],
  ["Hill Aerospace Museum, UT", "Historic aircraft fill two enormous hangars", 41.1636, -112.0190],
  ["Ogden, UT", "Union Station recalls the golden age of rail", 41.2230, -111.9738],
  ["Willard Bay, UT", "Fresh water glitters beside the highway", 41.4142, -112.0641],
  ["Brigham City, UT", "A grand tabernacle stands among peach orchards", 41.5102, -112.0155],
  ["Tremonton, UT", "Farmland spreads across the Bear River Valley", 41.7119, -112.1655],
  ["Malad City, ID", "The journey crosses into Idaho", 42.1916, -112.2508],
  ["Downata Hot Springs, ID", "Warm pools bubble beneath open hills", 42.3891, -112.0871],
  ["Lava Hot Springs, ID", "Mineral pools steam beside the Portneuf River", 42.6194, -112.0124],
  ["McCammon, ID", "Mountain valleys meet at a historic junction", 42.6505, -112.1933],
  ["Pocatello, ID", "Old Town arches welcome the northern trail", 42.8713, -112.4455],
  ["Fort Hall, ID", "Shoshone-Bannock country opens across the plain", 43.0330, -112.4383],
  ["Blackfoot, ID", "The Potato Museum celebrates Idaho’s famous crop", 43.1905, -112.3440],
  ["Idaho Falls, ID", "A broad waterfall spills through downtown", 43.4927, -112.0408],
  ["Rexburg, ID", "The Teton Range begins to peek over farmland", 43.8260, -111.7897],
  ["St. Anthony, ID", "Sand dunes rise beyond the Snake River", 43.9663, -111.6840],
  ["Ashton, ID", "The route enters waterfall and timber country", 44.0716, -111.4483],
  ["Mesa Falls, ID", "A powerful waterfall plunges through volcanic cliffs", 44.1871, -111.3280],
  ["Island Park, ID", "A forest town sits inside a giant caldera", 44.4205, -111.3711],
  ["Henrys Lake, ID", "A mountain lake mirrors the Continental Divide", 44.6438, -111.4152],
  ["West Yellowstone, MT", "The gateway town reaches Yellowstone’s edge", 44.6621, -111.1041],
  ["Yellowstone West Entrance, MT", "The trail enters America’s first national park", 44.6569, -111.0896],
  ["Madison River, WY", "Bison graze beside a clear mountain river", 44.6457, -110.9975],
  ["Seven Mile Bridge, WY", "The road follows lodgepole forest and water", 44.6518, -110.9215],
  ["Madison Junction, WY", "Two Yellowstone rivers meet in a broad valley", 44.6424, -110.8611],
  ["Gibbon Falls, WY", "White water tumbles down an ancient caldera rim", 44.6549, -110.7707],
  ["Artists Paintpots, WY", "Colorful mud pots burble beside the trail", 44.6920, -110.7427],
  ["Norris Geyser Basin, WY", "Yellowstone’s hottest geyser basin steams", 44.7269, -110.7047],
  ["Roaring Mountain, WY", "Fumaroles hiss from a pale mountainside", 44.7795, -110.7383],
  ["Obsidian Cliff, WY", "A black wall of volcanic glass catches the light", 44.8219, -110.7316],
  ["Sheepeater Cliff, WY", "Basalt columns stand like giant organ pipes", 44.8887, -110.7367],
  ["Swan Lake Flats, WY", "Wetlands open beneath the Gallatin Range", 44.9461, -110.7332],
  ["Golden Gate Canyon, WY", "A cliff-hugging road enters Mammoth country", 44.9508, -110.7133],
  ["Mammoth Hot Springs, WY", "Travertine terraces spill down the hillside", 44.9766, -110.7016],
  ["Boiling River, MT", "Hot springs meet the cold Gardner River", 45.0042, -110.6911],
  ["Roosevelt Arch, MT", "The stone arch frames the park’s north gate", 45.0292, -110.7083],
  ["Yellowstone North Entrance, MT", "The 1,000-mile journey reaches Gardiner", 45.0303, -110.7088],
];

const milestoneTones = ["cyan", "yellow", "orange", "mint"] as const;

const routeTrack = routeStops.map(([destination, detail, lat, lng], index) => ({
  destination,
  detail,
  lat,
  lng,
  actualMiles: roadData.stopRoadMiles[index] ?? 0,
  miles: Math.round(((roadData.stopRoadMiles[index] ?? 0) / roadData.totalRoadMiles) * GOAL * 10) / 10,
}));

// Named celebrations are genuine places along the journey. The quieter ten-mile
// checkpoints remain visible on the map as the underlying progress ruler.
const highlightedStopIndexes = new Set([
  0, 2, 4, 7, 8, 9, 11, 12, 14, 15, 19, 20, 24, 26, 31, 33, 34, 36, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 52, 53, 55, 56, 57, 58, 59, 62, 64, 65,
  66, 67, 68, 69, 70, 71, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 87,
  88, 90, 93, 96, 98, 99,
]);

const milestones: Milestone[] = routeTrack
  .filter((_, index) => highlightedStopIndexes.has(index))
  .map((stop, index) => ({
    miles: stop.miles,
    actualMiles: stop.actualMiles,
    destination: stop.destination,
    detail: stop.detail,
    tone: milestoneTones[index % milestoneTones.length] ?? "cyan",
    lat: stop.lat,
    lng: stop.lng,
  }));

function pointAtMiles(targetMiles: number) {
  return { ...roadPointAtMiles(targetMiles), miles: targetMiles, label: `${targetMiles} miles` };
}

const progressCheckpoints = Array.from({ length: GOAL / 10 }, (_, index) => pointAtMiles((index + 1) * 10));

function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function displayTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function isChallengeRun(run: Run): boolean {
  return run.date >= CHALLENGE_START && run.date <= CHALLENGE_END;
}

function dayNumber(value: string): number {
  const [year = 1970, month = 1, day = 1] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function challengeDaysLeft(today: string): number {
  if (today > CHALLENGE_END) return 0;
  const effectiveDate = today < CHALLENGE_START ? CHALLENGE_START : today;
  return Math.max(0, dayNumber(CHALLENGE_END) - dayNumber(effectiveDate) + 1);
}

function totalOf(runs: Run[]): number {
  return runs.reduce((sum, run) => sum + (run.miles > 0 ? run.miles : 0), 0);
}

function streakOf(runs: Run[]): number {
  const dates = [...new Set(runs.filter((run) => run.miles > 0).map((run) => run.date))].sort().reverse();
  const first = dates[0];
  if (!first || dayNumber(localToday()) - dayNumber(first) > 1 || dayNumber(first) > dayNumber(localToday())) return 0;
  let streak = 1;
  let cursor = new Date(`${first}T12:00:00`);
  for (let i = 1; i < dates.length; i += 1) {
    cursor.setDate(cursor.getDate() - 1);
    const expected = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (dates[i] !== expected) break;
    streak += 1;
  }
  return streak;
}

function formatMiles(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: value >= 100 ? 0 : 2 });
}

export function App() {
  const queryClient = useQueryClient();
  const runsQuery = useQuery({
    queryKey: ["runs"],
    queryFn: () => api.listRuns({}),
  });

  const [date, setDate] = useState(localToday());
  const [miles, setMiles] = useState("3");
  const [editing, setEditing] = useState<Run | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Run | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [checkpointCelebration, setCheckpointCelebration] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<Milestone | null>(null);
  const [formMessage, setFormMessage] = useState("");

  const runs = runsQuery.data?.runs ?? [];
  const positiveRuns = useMemo(() => runs.filter((run) => run.miles > 0), [runs]);
  const challengeRuns = useMemo(() => positiveRuns.filter(isChallengeRun), [positiveRuns]);
  const challengeMiles = useMemo(() => totalOf(challengeRuns), [challengeRuns]);
  const progress = Math.min(100, (challengeMiles / GOAL) * 100);
  const daysLeft = challengeDaysLeft(localToday());
  const paceNeeded = daysLeft > 0 ? Math.max(0, GOAL - challengeMiles) / daysLeft : 0;
  const nextCheckpoint = Math.min(GOAL, (Math.floor(challengeMiles / 10) + 1) * 10);
  const streak = useMemo(() => streakOf(runs), [runs]);
  const bestRun = positiveRuns.reduce((best, run) => Math.max(best, run.miles), 0);
  const nextMilestone = milestones.find((item) => challengeMiles < item.miles);
  const latestUnlocked = [...milestones].reverse().find((item) => challengeMiles >= item.miles);
  const nextRemaining = nextMilestone ? Math.max(0, nextMilestone.miles - challengeMiles) : 0;
  const runnerPlace = useMemo(() => {
    const point = pointAtMiles(Math.max(0, Math.min(GOAL, challengeMiles)));
    return { label: "Your runner", lat: point.lat, lng: point.lng };
  }, [challengeMiles]);
  function openMilestoneTrail() {
    setSelectedMilestone(nextMilestone ?? milestones[milestones.length - 1] ?? null);
    setMapExpanded(true);
  }

  const chartData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const run of positiveRuns) byDate.set(run.date, (byDate.get(run.date) ?? 0) + run.miles);
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([chartDate, value]) => ({ date: chartDate, miles: value }));
  }, [positiveRuns]);
  const chartMax = Math.max(1, ...chartData.map((item) => item.miles));

  useEffect(() => {
    document.body.classList.toggle("map-is-expanded", mapExpanded);
    return () => document.body.classList.remove("map-is-expanded");
  }, [mapExpanded]);

  async function refreshRuns() {
    await queryClient.invalidateQueries({ queryKey: ["runs"] });
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: { date: string; miles: number; id?: number }) => {
      if (payload.id !== undefined) return api.updateRun({ id: payload.id, date: payload.date, miles: payload.miles });
      return api.addRun({ date: payload.date, miles: payload.miles });
    },
    onSuccess: async () => {
      setFormMessage(editing ? "Run updated—freshly laced." : "Run logged—nice work!");
      setEditing(null);
      setDate(localToday());
      setMiles("3");
      await refreshRuns();
      const refreshed = queryClient.getQueryData<{ runs: Run[] }>(["runs"]);
      const after = totalOf((refreshed?.runs ?? []).filter(isChallengeRun));
      const checkpoint = Math.min(GOAL, Math.floor(after / 10) * 10);
      if (checkpoint > Math.floor(challengeMiles / 10) * 10) {
        setCheckpointCelebration(checkpoint);
      } else {
        const crossed = [...milestones].reverse().find((item) => challengeMiles < item.miles && after >= item.miles);
        if (crossed) setCelebration(crossed);
      }
    },
    onError: (error) => {
      setFormMessage(error instanceof Error ? error.message : "That run could not be saved.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteRun({ id }),
    onSuccess: async () => {
      setDeleteTarget(null);
      setFormMessage("Run removed from the trail.");
      await refreshRuns();
    },
  });

  function submitRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedMiles = Number(miles);
    if (!date || !Number.isFinite(parsedMiles) || parsedMiles <= 0) {
      setFormMessage("Pick a date and enter miles greater than zero.");
      return;
    }
    setFormMessage("");
    const id = editing?.id ?? undefined;
    saveMutation.mutate({ date, miles: parsedMiles, ...(id !== undefined ? { id } : {}) });
  }

  function beginEdit(run: Run) {
    if (run.id === null) return;
    setEditing(run);
    setDate(run.date);
    setMiles(String(run.miles));
    setFormMessage("");
    document.getElementById("run-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function cancelEdit() {
    setEditing(null);
    setDate(localToday());
    setMiles("3");
    setFormMessage("");
  }

  return (
    <div className="app-shell">
      <main>
        <section className="hero" aria-labelledby="mission-title">
          <div className="hero-copy">
            <p className="hero-tag">THE ONE-YEAR 1,000-MILE CHALLENGE</p>
            <h1 id="mission-title">One year. One thousand miles.</h1>
          </div>

          <div className="challenge-clock" aria-label={`Challenge runs from ${displayDate(CHALLENGE_START)} through ${displayDate(CHALLENGE_END)}. ${daysLeft} days left.`}>
            <div><small>Starts</small><strong>{displayDate(CHALLENGE_START)}</strong></div>
            <span aria-hidden="true">→</span>
            <div><small>Ends</small><strong>{displayDate(CHALLENGE_END)}</strong></div>
            <div className="days-left"><strong>{daysLeft}</strong><small>days left</small></div>
          </div>

          <div className="odometer-wrap" aria-label={`${formatMiles(challengeMiles)} of ${GOAL} challenge miles completed`}>
            <span className="odometer-number">{formatMiles(challengeMiles)}</span>
            <span className="odometer-unit">challenge miles</span>
          </div>

          <div className="trail-wrap">
            <div className="trail-labels"><span>Sep 30</span><strong>{Math.round(progress)}%</strong><span>1,000 mi</span></div>
            <div className="trail" aria-hidden="true">
              <div className="trail-fill" style={{ width: `${progress}%` }} />
              <div className="runner" style={{ left: `clamp(14px, ${progress}%, calc(100% - 14px))` }}>
                <span className="runner-face"><i /><i /></span>
                <span className="runner-legs" />
              </div>
            </div>
          </div>

          <button className="next-stop" type="button" onClick={openMilestoneTrail}>
            <span className={`milestone-dot ${nextMilestone?.tone ?? "mint"}`} aria-hidden="true" />
            <span>
              <small>{latestUnlocked ? `Last landmark: ${latestUnlocked.destination}` : "San Francisco is the starting line"}</small>
              <strong>{nextMilestone ? `${formatMiles(nextRemaining)} challenge miles to ${nextMilestone.destination}` : "Yellowstone reached!"}</strong>
            </span>
            <span className="chevron" aria-hidden="true">›</span>
          </button>

          <section className="adventure-brief" aria-label="Your next adventure">
            <div><p className="section-kicker">YOUR NEXT ADVENTURE</p>
              <h2>{nextMilestone?.destination ?? "You made it to Yellowstone!"}</h2>
              <p>{nextMilestone?.detail ?? "A thousand miles of determination. Take a bow."}</p>
            </div>
            <div className="adventure-brief-stats">
              <span><strong>{formatMiles(Math.max(0, nextCheckpoint - challengeMiles))}</strong>mi to your next 10-mile flag</span>
              <span><strong>{formatMiles(paceNeeded)}</strong>{challengeMiles >= GOAL ? "goal complete!" : daysLeft > 0 ? "mi/day to finish on time" : "challenge has ended"}</span>
            </div>
          </section>

          <section className={`journey-map-card${mapExpanded ? " expanded" : ""}`} aria-labelledby="journey-map-title">
            <div className="journey-map-heading">
              <div>
                <p className="section-kicker">YOUR 1,000-MILE WESTERN JOURNEY</p>
                <h2 id="journey-map-title">The adventure atlas</h2>
              </div>
              <button className="map-expand-button" type="button" onClick={() => setMapExpanded((value) => !value)} aria-label={mapExpanded ? "Close fullscreen adventure map" : "Expand adventure map fullscreen"}>
                <span aria-hidden="true">{mapExpanded ? "×" : "↗"}</span>
                {mapExpanded ? "Close" : "Explore"}
              </button>
            </div>
            <div className="map-progress-key" aria-label={`${formatMiles(challengeMiles)} miles completed and ${formatMiles(Math.max(0, GOAL - challengeMiles))} miles left`}>
              <span><i className="done-key" /> {formatMiles(challengeMiles)} done</span>
              <span><i className="left-key" /> {formatMiles(Math.max(0, GOAL - challengeMiles))} left</span>
            </div>
            <p className="map-game-note">A virtual road trip from San Francisco to Yellowstone. Your 1,000 challenge miles move you along this ≈ 1373-mile driving route. Ticks mark 10 challenge miles; tap real places to explore.</p>
            <div className="adventure-map-frame">
              <RealAdventureMap
                milestones={milestones}
                routePoints={routeTrack}
                progressCheckpoints={progressCheckpoints}
                runner={runnerPlace}
                completedMiles={challengeMiles}
                selected={selectedMilestone}
                onSelect={setSelectedMilestone}
                expanded={mapExpanded}
              />
            </div>
            <div className="map-detail-panel" aria-live="polite">
              {selectedMilestone ? (
                <>
                  <span className={`badge-orb ${selectedMilestone.tone}`} aria-hidden="true">{challengeMiles >= selectedMilestone.miles ? "✓" : "★"}</span>
                  <div>
                    <small>{formatMiles(selectedMilestone.miles)}-MILE LANDMARK · {challengeMiles >= selectedMilestone.miles ? "REACHED" : `${formatMiles(Math.max(0, selectedMilestone.miles - challengeMiles))} TO GO`}</small>
                    <strong>{selectedMilestone.destination}</strong>
                    <p>{selectedMilestone.detail}</p>
                    <p>≈ {formatMiles(selectedMilestone.actualMiles)} road miles from San Francisco on this route.</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="start-pin" aria-hidden="true">SF</span>
                  <div><small>STARTING LINE</small><strong>San Francisco</strong><p>Tap any named flag to discover its fun fact. The small dots underneath mark each 10 miles.</p></div>
                </>
              )}
            </div>
          </section>
        </section>

        <section className="log-zone" aria-labelledby="log-run-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">ADD TO THE ADVENTURE</p>
              <h2 id="log-run-title">{editing ? "Tune this run" : "Log today’s miles"}</h2>
            </div>
            <div className="streak-badge" aria-label={`${streak} day run streak`}>
              <span className="flame" aria-hidden="true" />
              <strong>{streak}</strong><small>day streak</small>
            </div>
          </div>

          <form id="run-form" className="run-form" onSubmit={submitRun}>
            <label>
              <span>Date</span>
              <input aria-label="Run date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </label>
            <label>
              <span>Miles</span>
              <div className="miles-input-wrap">
                <input aria-label="Miles run" type="number" inputMode="decimal" min="0.01" max="500" step="0.01" value={miles} onChange={(event) => setMiles(event.target.value)} required />
                <b>MI</b>
              </div>
            </label>
            <button className="primary-button" type="submit" disabled={saveMutation.isPending || deleteMutation.isPending || runsQuery.isFetching}>
              {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Launch run"}
            </button>
            {editing ? <button className="text-button" type="button" onClick={cancelEdit}>Cancel edit</button> : null}
          </form>
          {formMessage ? <p className="form-message" role="status">{formMessage}</p> : null}
        </section>

        <section className="stats-strip" aria-label="Running highlights">
          <div><strong>{positiveRuns.length}</strong><span>all runs logged</span></div>
          <div><strong>{formatMiles(bestRun)}</strong><span>best run</span></div>
          <div><strong>{formatMiles(Math.max(0, GOAL - challengeMiles))}</strong><span>miles to goal</span></div>
        </section>

        <section className="chart-zone" aria-labelledby="chart-title">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">TRAIL PULSE</p>
              <h2 id="chart-title">Miles over time</h2>
            </div>
            <span className="chart-note">Last 14 run days</span>
          </div>
          {runsQuery.isPending ? (
            <div className="empty-chart" role="status">Fetching your trail…</div>
          ) : runsQuery.isError ? (
            <div className="error-state" role="alert">
              <strong>The trail went quiet.</strong>
              <span>{runsQuery.error instanceof Error ? runsQuery.error.message : "The running log could not be loaded."}</span>
              <button type="button" onClick={() => runsQuery.refetch()}>Try again</button>
            </div>
          ) : chartData.length === 0 ? (
            <div className="empty-chart"><span className="start-mark" aria-hidden="true">0</span><strong>Your first bar starts with your first run.</strong><small>Log miles above and the trail wakes up.</small></div>
          ) : (
            <div className="bar-chart" role="img" aria-label={`Bar chart of miles across ${chartData.length} run days`}>
              {chartData.map((item) => (
                <div className="bar-column" key={item.date} title={`${displayDate(item.date)}: ${formatMiles(item.miles)} miles`}>
                  <span>{formatMiles(item.miles)}</span>
                  <div className="bar-track"><i style={{ height: `${Math.max(8, (item.miles / chartMax) * 100)}%` }} /></div>
                  <small>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${item.date}T12:00:00`))}</small>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="history-zone" aria-labelledby="history-title">
          <div className="section-heading compact">
            <div><p className="section-kicker">FIELD NOTES · ALL DATES</p><h2 id="history-title">Full run log</h2></div>
            <button className="refresh-button" type="button" aria-label="Refresh run log" onClick={() => runsQuery.refetch()} disabled={runsQuery.isFetching}>
              {runsQuery.isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {positiveRuns.length === 0 && !runsQuery.isPending ? (
            <div className="empty-log"><strong>No miles on the page yet.</strong><span>The zero-mile setup row is safely ignored.</span></div>
          ) : (
            <ol className="run-list">
              {positiveRuns.map((run, index) => (
                <li key={`${run.id ?? "legacy"}-${run.date}-${index}`}>
                  <span className="run-index">{String(positiveRuns.length - index).padStart(2, "0")}</span>
                  <span className="run-date"><strong>{displayDate(run.date)}</strong><small>{run.id === null ? "Legacy row · view only" : `Sheet row ${run.id}`} · {isChallengeRun(run) ? "Counts toward challenge" : "Outside challenge"}</small></span>
                  <span className="run-miles"><strong>{formatMiles(run.miles)}</strong><small>miles</small></span>
                  {run.id !== null ? (
                    <span className="run-actions">
                      <button type="button" aria-label={`Edit ${formatMiles(run.miles)} mile run on ${displayDate(run.date)}`} onClick={() => beginEdit(run)}>Edit</button>
                      <button type="button" aria-label={`Delete ${formatMiles(run.miles)} mile run on ${displayDate(run.date)}`} onClick={() => setDeleteTarget(run)}>Delete</button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          {runsQuery.data ? <p className="sync-note">Google Sheets synced at {displayTime(runsQuery.data.fetchedAt)}</p> : null}
        </section>
      </main>

      {deleteTarget?.id !== null && deleteTarget ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="sheet confirm-sheet">
            <span className="warning-mark" aria-hidden="true">!</span>
            <h2 id="delete-title">Take this run off the trail?</h2>
            <p>{displayDate(deleteTarget.date)} · {formatMiles(deleteTarget.miles)} miles</p>
            <div className="confirm-actions">
              <button type="button" disabled={deleteMutation.isPending} onClick={() => setDeleteTarget(null)}>Keep it</button>
              <button className="danger-button" type="button" disabled={deleteMutation.isPending} onClick={() => deleteTarget.id !== null && deleteMutation.mutate(deleteTarget.id)}>
                {deleteMutation.isPending ? "Deleting…" : "Delete run"}
              </button>
            </div>
            {deleteMutation.isError ? <p className="form-message" role="alert">The run could not be deleted. Try again.</p> : null}
          </div>
        </div>
      ) : null}

      {checkpointCelebration !== null ? (
        <div className="overlay celebration-overlay" role="dialog" aria-modal="true" aria-labelledby="checkpoint-title">
          <div className="confetti" aria-hidden="true">{Array.from({ length: 26 }, (_, index) => <i key={index} style={{ "--x": `${(index * 37) % 100}%`, "--delay": `${(index % 7) * -0.21}s`, "--duration": `${1.8 + (index % 5) * 0.16}s`, "--tilt": `${index * 19}deg` } as React.CSSProperties} />)}</div>
          <div className="sheet celebration-sheet">
            <span className="badge-orb giant orange" aria-hidden="true">★</span>
            <p className="section-kicker">{checkpointCelebration >= GOAL ? "FINISH LINE!" : "ANOTHER FLAG IN THE GROUND"}</p>
            <h2 id="checkpoint-title">{formatMiles(checkpointCelebration)} miles. Look at you go!</h2>
            <p>{checkpointCelebration >= GOAL ? "San Francisco to Yellowstone. One thousand challenge miles. You did it!" : "Every ten miles is a little victory. Your adventure keeps growing, one run at a time."}</p>
            <button className="primary-button" type="button" onClick={() => setCheckpointCelebration(null)}>Keep adventuring</button>
          </div>
        </div>
      ) : null}

      {celebration ? (
        <div className="overlay celebration-overlay" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
          <div className="confetti" aria-hidden="true">{Array.from({ length: 26 }, (_, index) => <i key={index} style={{ "--x": `${(index * 37) % 100}%`, "--delay": `${(index % 7) * -0.21}s`, "--duration": `${1.8 + (index % 5) * 0.16}s`, "--tilt": `${index * 19}deg` } as React.CSSProperties} />)}</div>
          <div className="sheet celebration-sheet">
            <span className={`badge-orb giant ${celebration.tone}`} aria-hidden="true">✓</span>
            <p className="section-kicker">LANDMARK UNLOCKED</p>
            <h2 id="celebration-title">A new place reached!</h2>
            <strong className="celebration-route">{celebration.destination}</strong>
            <p>{formatMiles(celebration.miles)} logged miles unlocked this stop. {celebration.detail}</p>
            <button className="primary-button" type="button" onClick={() => setCelebration(null)}>Keep running</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
