import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";

export type IllustratedMilestone = {
  miles: number;
  actualMiles: number;
  destination: string;
  detail: string;
  tone: string;
  lat: number;
  lng: number;
};

type Point = { lat: number; lng: number };
type RoutePoint = Point & { miles: number; destination?: string };
type ProgressPoint = Point & { miles: number };
type ProjectedPoint = readonly [number, number];

type Props = {
  milestones: readonly IllustratedMilestone[];
  routePoints: readonly RoutePoint[];
  progressCheckpoints: readonly ProgressPoint[];
  runner: Point;
  completedMiles: number;
  selected: IllustratedMilestone | null;
  onSelect: (milestone: IllustratedMilestone) => void;
  expanded: boolean;
};

const VIEW_W = 920;
const VIEW_H = 920;
const MIN_LNG = -123.0;
const MAX_LNG = -109.6;
const MIN_LAT = 37.45;
const MAX_LAT = 45.65;
const START: Point = { lat: 37.77712, lng: -122.41966 };

function project(point: Point): ProjectedPoint {
  const x = ((point.lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * VIEW_W;
  const y = ((MAX_LAT - point.lat) / (MAX_LAT - MIN_LAT)) * VIEW_H;
  return [x, y];
}

function polygonPoints(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([lng, lat]) => project({ lng, lat }).join(",")).join(" ");
}

function smoothPath(points: readonly ProjectedPoint[]): string {
  const first = points[0];
  if (!first) return "";
  if (points.length === 1) return `M ${first[0]} ${first[1]}`;
  let path = `M ${first[0]} ${first[1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index] ?? first;
    const next = points[index + 1] ?? current;
    const previous = points[index - 1] ?? current;
    const after = points[index + 2] ?? next;
    const control1X = current[0] + (next[0] - previous[0]) / 7;
    const control1Y = current[1] + (next[1] - previous[1]) / 7;
    const control2X = next[0] - (after[0] - current[0]) / 7;
    const control2Y = next[1] - (after[1] - current[1]) / 7;
    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next[0]} ${next[1]}`;
  }
  return path;
}

const regions: ReadonlyArray<{
  abbr: string;
  name: string;
  points: ReadonlyArray<readonly [number, number]>;
  label: readonly [number, number];
  wash: string;
}> = [
  { abbr: "CA", name: "California", points: [[-123,42],[-120,42],[-120,39],[-118.15,37.45],[-122.52,37.45]], label: [-121.25,39.25], wash: "#d9b99d" },
  { abbr: "NV", name: "Nevada", points: [[-120,42],[-114.04,42],[-114.05,37.45],[-118.15,37.45],[-120,39]], label: [-117.1,39.8], wash: "#d9c9b8" },
  { abbr: "UT", name: "Utah", points: [[-114.05,42],[-111.05,42],[-111.05,41],[-109.6,41],[-109.6,37.45],[-114.05,37.45]], label: [-112.25,39.5], wash: "#e3c7a5" },
  { abbr: "ID", name: "Idaho", points: [[-117,45.65],[-117,42],[-111.05,42],[-111.05,44.5],[-113,45.65]], label: [-114.2,43.8], wash: "#d5dfc4" },
  { abbr: "WY", name: "Wyoming", points: [[-111.05,45],[-109.6,45],[-109.6,41],[-111.05,41]], label: [-110.25,43.15], wash: "#d8c6a9" },
  { abbr: "MT", name: "Montana", points: [[-114,45.65],[-109.6,45.65],[-109.6,45],[-111.05,45],[-111.05,44.5],[-113,45.65]], label: [-111.2,45.35], wash: "#ddd6bc" },
];

function Mountain({ lng, lat, scale = 1 }: { lng: number; lat: number; scale?: number }) {
  const [x, y] = project({ lng, lat });
  return (
    <g className="atlas-mountain" transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden="true">
      <path className="mountain-back" d="M-30 20L-9-17L7 8L20-11L39 20Z" />
      <path className="mountain-front" d="M-17 20L4-24L31 20Z" />
      <path className="mountain-snow" d="M-4-7L4-24L12-8L7-11L2-6Z" />
      <path className="mountain-line" d="M-30 20L-9-17L7 8L20-11L39 20M-17 20L4-24L31 20" />
    </g>
  );
}

function Redwood({ lng, lat }: { lng: number; lat: number }) {
  const [x, y] = project({ lng, lat });
  return (
    <g className="atlas-redwood" transform={`translate(${x} ${y})`} aria-hidden="true">
      <path d="M-3 25L0-24L4 25" />
      <path d="M0-22C-24-10-23 7-7 8C-19 19-7 27 1 17C10 27 23 17 13 8C30 0 20-14 4-14C4-25 0-30 0-22Z" />
    </g>
  );
}

function LandmarkArt({ type, lng, lat, scale = 1 }: { type: "bridge" | "needle" | "canyon" | "arch" | "geyser" | "rainier" | "salt"; lng: number; lat: number; scale?: number }) {
  const [x, y] = project({ lng, lat });
  const content = {
    bridge: <><path d="M-25 15H25M-17 15V-17M17 15V-17M-17-8Q0-27 17-8M-25 15Q-21-1-17-8M25 15Q21-1 17-8" /><path className="landmark-fill" d="M-18-7Q0-24 18-7Q0-15-18-7Z" /></>,
    needle: <><path d="M0 23L-3-9M0 23L3-9M-16-8Q0 3 16-8M-12-14H12M0-14V-27" /><path className="landmark-fill" d="M-13-14Q0-20 13-14L8-7H-8Z" /></>,
    canyon: <><path d="M-31-12Q-20 5-8-8Q4-23 14-6Q21 5 32-10M-30 2Q-17 18-4 3Q6-9 16 4Q23 14 33 1M-25 15Q-12 25 0 13Q13 3 27 16" /></>,
    arch: <><path d="M-29 20Q-24-24 0-24Q24-24 29 20H13Q10-7 0-7Q-10-7-13 20Z" /><path className="landmark-fill" d="M-8 20Q-6 2 0 2Q6 2 8 20Z" /></>,
    geyser: <><path d="M-22 22H22M-12 15Q0-2 12 15M0 3Q-16-13-8-31M3 2Q20-12 12-34M-1-3Q-2-22 2-38" /><circle className="landmark-fill" cx="-8" cy="-30" r="3" /><circle className="landmark-fill" cx="12" cy="-34" r="3" /></>,
    rainier: <><path d="M-35 21L-5-27L4-10L12-19L36 21Z" /><path className="landmark-fill" d="M-15-10L-5-27L5-9L-2-13L-8-7Z" /></>,
    salt: <><path d="M-31 15Q-12 5 1 14Q17 3 32 13M-30 7Q-8-3 9 7Q21 0 31 5M-21-2Q-5-10 12-3" /></>,
  }[type];
  return <g className={`atlas-landmark landmark-${type}`} transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden="true">{content}</g>;
}

function shortName(destination: string): string {
  return destination
    .replace(/, (CA|OR|WA|NV|AZ|UT|ID|MT|WY|BC)$/u, "")
    .replace(" National Park", "")
    .replace("Yellowstone North Entrance", "Yellowstone");
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 1024;
const BUTTON_ZOOM_FACTOR = 2;

type ActivePointer = { x: number; y: number };
type Gesture =
  | { kind: "drag"; pointerId: number; startX: number; startY: number; panX: number; panY: number }
  | {
      kind: "pinch";
      startDistance: number;
      startZoom: number;
      anchorWorldX: number;
      anchorWorldY: number;
    };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function IllustratedAdventureMap({ milestones, routePoints: routeStops, progressCheckpoints, runner, completedMiles, selected, onSelect }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const pointers = useRef(new Map<number, ActivePointer>());
  const gesture = useRef<Gesture | null>(null);
  const movedDuringGesture = useRef(false);
  const runnerXY = project(runner);
  const routePoints = useMemo(() => [project(START), ...routeStops.map(project)], [routeStops]);
  const completedPoints = useMemo(
    () => [project(START), ...routeStops.filter((point) => point.miles < completedMiles).map(project), runnerXY],
    [completedMiles, routeStops, runnerXY],
  );
  const routePath = useMemo(() => smoothPath(routePoints), [routePoints]);
  const completedPath = useMemo(() => smoothPath(completedPoints), [completedPoints]);
  const viewWidth = VIEW_W / zoom;
  const viewHeight = VIEW_H / zoom;

  function clampPan(next: { x: number; y: number }, atZoom = zoom): { x: number; y: number } {
    const maxX = Math.max(0, (VIEW_W - VIEW_W / atZoom) / 2);
    const maxY = Math.max(0, (VIEW_H - VIEW_H / atZoom) / 2);
    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }

  const clampedPan = clampPan(pan);
  const centerX = VIEW_W / 2 + clampedPan.x;
  const centerY = VIEW_H / 2 + clampedPan.y;
  const viewBox = `${centerX - viewWidth / 2} ${centerY - viewHeight / 2} ${viewWidth} ${viewHeight}`;
  const mapLevel = Math.round(Math.log2(zoom)) + 1;
  const markerScale = 1 / Math.max(1, zoom / 4);
  const visibleMilestoneIndexes = useMemo(() => {
    const minimumSeparation = zoom >= 128 ? 18 : zoom >= 32 ? 27 : zoom >= 8 ? 34 : 43;
    const prioritized = milestones.map((milestone, index) => ({
      index,
      point: project(milestone),
      score:
        (selected?.miles === milestone.miles ? 1_000_000 : 0) +
        (index === milestones.length - 1 ? 500_000 : 0) +
        (completedMiles >= milestone.miles ? 100_000 : 0) +
        (index % 8 === 0 ? 20_000 : 0) +
        milestone.miles,
    })).sort((a, b) => b.score - a.score);
    const accepted: typeof prioritized = [];
    for (const candidate of prioritized) {
      const hasRoom = accepted.every((item) => Math.hypot(
        candidate.point[0] - item.point[0],
        candidate.point[1] - item.point[1],
      ) * zoom >= minimumSeparation);
      if (hasRoom) accepted.push(candidate);
    }
    return new Set(accepted.map((item) => item.index));
  }, [completedMiles, milestones, selected, zoom]);

  function focusPoint(point: Point, next: number) {
    const nextZoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
    const [x, y] = project(point);
    setZoom(nextZoom);
    setPan(clampPan({ x: x - VIEW_W / 2, y: y - VIEW_H / 2 }, nextZoom));
  }

  function selectMilestone(milestone: IllustratedMilestone) {
    onSelect(milestone);
    if (zoom < 64) focusPoint(milestone, 64);
  }

  function zoomAt(next: number, clientX?: number, clientY?: number, target?: SVGSVGElement) {
    const nextZoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
    if (nextZoom === zoom) return;
    if (nextZoom === MIN_ZOOM) {
      setZoom(nextZoom);
      setPan({ x: 0, y: 0 });
      return;
    }

    let nextPan = clampedPan;
    if (clientX !== undefined && clientY !== undefined && target) {
      const rect = target.getBoundingClientRect();
      const fractionX = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const fractionY = clamp((clientY - rect.top) / Math.max(1, rect.height), 0, 1);
      const worldX = centerX + (fractionX - .5) * viewWidth;
      const worldY = centerY + (fractionY - .5) * viewHeight;
      nextPan = {
        x: worldX - (fractionX - .5) * (VIEW_W / nextZoom) - VIEW_W / 2,
        y: worldY - (fractionY - .5) * (VIEW_H / nextZoom) - VIEW_H / 2,
      };
    }

    setZoom(nextZoom);
    setPan(clampPan(nextPan, nextZoom));
  }

  function beginGesture(event: PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    movedDuringGesture.current = false;

    const active = [...pointers.current.entries()];
    if (active.length >= 2) {
      const first = active[0];
      const second = active[1];
      if (!first || !second) return;
      const dx = second[1].x - first[1].x;
      const dy = second[1].y - first[1].y;
      const midpointX = (first[1].x + second[1].x) / 2;
      const midpointY = (first[1].y + second[1].y) / 2;
      const rect = event.currentTarget.getBoundingClientRect();
      const fractionX = clamp((midpointX - rect.left) / Math.max(1, rect.width), 0, 1);
      const fractionY = clamp((midpointY - rect.top) / Math.max(1, rect.height), 0, 1);
      gesture.current = {
        kind: "pinch",
        startDistance: Math.max(1, Math.hypot(dx, dy)),
        startZoom: zoom,
        anchorWorldX: centerX + (fractionX - .5) * viewWidth,
        anchorWorldY: centerY + (fractionY - .5) * viewHeight,
      };
      setIsMoving(true);
    } else if (zoom > MIN_ZOOM) {
      gesture.current = { kind: "drag", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: clampedPan.x, panY: clampedPan.y };
      setIsMoving(true);
    }
  }

  function moveGesture(event: PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const currentGesture = gesture.current;
    if (!currentGesture) return;

    if (currentGesture.kind === "pinch") {
      const active = [...pointers.current.values()];
      const first = active[0];
      const second = active[1];
      if (!first || !second) return;
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const midpointX = (first.x + second.x) / 2;
      const midpointY = (first.y + second.y) / 2;
      const nextZoom = clamp(currentGesture.startZoom * distance / currentGesture.startDistance, MIN_ZOOM, MAX_ZOOM);
      const rect = event.currentTarget.getBoundingClientRect();
      const fractionX = clamp((midpointX - rect.left) / Math.max(1, rect.width), 0, 1);
      const fractionY = clamp((midpointY - rect.top) / Math.max(1, rect.height), 0, 1);
      const nextPan = {
        x: currentGesture.anchorWorldX - (fractionX - .5) * (VIEW_W / nextZoom) - VIEW_W / 2,
        y: currentGesture.anchorWorldY - (fractionY - .5) * (VIEW_H / nextZoom) - VIEW_H / 2,
      };
      movedDuringGesture.current = true;
      setZoom(nextZoom);
      setPan(clampPan(nextPan, nextZoom));
      return;
    }

    if (event.pointerId !== currentGesture.pointerId || zoom <= MIN_ZOOM) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = event.clientX - currentGesture.startX;
    const deltaY = event.clientY - currentGesture.startY;
    if (Math.hypot(deltaX, deltaY) > 4) movedDuringGesture.current = true;
    setPan(clampPan({
      x: currentGesture.panX - deltaX * viewWidth / Math.max(1, rect.width),
      y: currentGesture.panY - deltaY * viewHeight / Math.max(1, rect.height),
    }));
  }

  function endGesture(event: PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId);
    const remaining = [...pointers.current.entries()];
    const first = remaining[0];
    if (first && zoom > MIN_ZOOM) {
      gesture.current = { kind: "drag", pointerId: first[0], startX: first[1].x, startY: first[1].y, panX: clampedPan.x, panY: clampedPan.y };
      return;
    }
    gesture.current = null;
    setIsMoving(false);
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const multiplier = Math.exp(-event.deltaY * .0025);
    zoomAt(zoom * multiplier, event.clientX, event.clientY, event.currentTarget);
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomAt(zoom * BUTTON_ZOOM_FACTOR);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomAt(zoom / BUTTON_ZOOM_FACTOR);
      return;
    }
    const step = 54 / zoom;
    const offsets: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const offset = offsets[event.key];
    if (!offset || zoom <= MIN_ZOOM) return;
    event.preventDefault();
    setPan(clampPan({ x: clampedPan.x + offset.x, y: clampedPan.y + offset.y }));
  }

  return (
    <div className={`illustrated-map-wrap${isMoving ? " is-moving" : ""}`}>
      <svg
        className={`illustrated-map-svg${zoom > 1 ? " is-zoomed" : ""}${zoom >= 8 ? " is-deep" : ""}`}
        viewBox={viewBox}
        role="img"
        tabIndex={0}
        aria-label={`Interactive illustrated atlas from San Francisco to Yellowstone, map level ${mapLevel} of 11, ${visibleMilestoneIndexes.size} non-overlapping milestone markers visible. Pinch or scroll to zoom, then drag to move.`}
        onPointerDown={beginGesture}
        onPointerMove={moveGesture}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onWheel={handleWheel}
        onDoubleClick={(event) => zoomAt(zoom * 2, event.clientX, event.clientY, event.currentTarget)}
        onKeyDown={handleKeyDown}
      >
        <defs>
          <filter id="watercolor-paper" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="3" seed="12" result="grain" />
            <feColorMatrix in="grain" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .17 0" />
            <feBlend in="SourceGraphic" mode="multiply" />
          </filter>
          <filter id="soft-wash" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence baseFrequency=".012 .035" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" />
          </filter>
          <filter id="route-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <pattern id="paper-fibers" width="38" height="38" patternUnits="userSpaceOnUse">
            <path d="M2 8Q12 5 21 9M18 28Q29 24 37 28M6 35Q10 31 15 34" fill="none" stroke="#7c8b76" strokeWidth=".7" opacity=".18" />
            <circle cx="31" cy="12" r="1" fill="#8b7f69" opacity=".12" />
          </pattern>
          <radialGradient id="ocean-wash" cx="50%" cy="42%" r="72%">
            <stop offset="0" stopColor="#dceceb" />
            <stop offset="1" stopColor="#b9d7dc" />
          </radialGradient>
        </defs>

        <rect width={VIEW_W} height={VIEW_H} rx="24" fill="#e8e0cf" />
        <rect width={VIEW_W} height={VIEW_H} rx="24" fill="url(#ocean-wash)" filter="url(#watercolor-paper)" />
        <text x="720" y="48" className="atlas-region-label">SAN FRANCISCO → YELLOWSTONE</text>

        <g className="atlas-region-layer" filter="url(#soft-wash)">
          {regions.map((region) => <polygon key={region.abbr} points={polygonPoints(region.points)} fill={region.wash} />)}
        </g>
        <g className="atlas-paper-layer"><rect width={VIEW_W} height={VIEW_H} rx="24" fill="url(#paper-fibers)" /></g>

        <g className="atlas-water" aria-hidden="true">
          <path className="lake tahoe" d={`M${project({ lng: -120.04, lat: 39.25 }).join(" ")}q12-20 23-2q-2 25-16 35q-13-13-7-33Z`} />
          <path className="lake salt-lake" d={`M${project({ lng: -112.45, lat: 41.35 }).join(" ")}q28-25 44 8q-4 35-29 44q-24-22-15-52Z`} />
          <path className="river" d="M731 146Q653 216 675 310Q700 390 656 476Q620 558 643 681" />
          <path className="river" d="M344 455Q388 533 405 623Q428 716 488 797" />
        </g>

        {regions.map((region) => {
          const [x, y] = project({ lng: region.label[0], lat: region.label[1] });
          return <g key={`${region.abbr}-label`} className="atlas-state-label" transform={`translate(${x} ${y})`}><text>{region.abbr}</text><title>{region.name}</title></g>;
        })}

        <g className="atlas-terrain">
          <Mountain lng={-120.7} lat={39.15} scale={.82} />
          <Mountain lng={-116.0} lat={40.55} scale={.72} />
          <Mountain lng={-112.0} lat={41.35} scale={.78} />
          <Mountain lng={-111.0} lat={44.4} scale={.88} />
          <Redwood lng={-122.45} lat={38.25} />
        </g>

        <g className="atlas-landmarks">
          <LandmarkArt type="bridge" lng={-122.38} lat={37.93} scale={.82} />
          <LandmarkArt type="salt" lng={-113.72} lat={40.55} scale={.72} />
          <LandmarkArt type="geyser" lng={-110.6} lat={44.95} scale={.72} />
        </g>

        <path className="atlas-route-halo" d={routePath} filter="url(#route-shadow)" />
        <path className="atlas-route-left" d={routePath} />
        <path className="atlas-route-done-halo" d={completedPath} />
        <path className="atlas-route-done" d={completedPath} />

        <g className="atlas-start" transform={`translate(${project(START)[0]} ${project(START)[1]})`} aria-hidden="true">
          <circle r="13" />
          <path d="M-5-1L-1 4L7-6" />
          <text x="21" y="5">SAN FRANCISCO</text>
        </g>

        <g className="ten-mile-checkpoints" aria-hidden="true">
          {progressCheckpoints.map((checkpoint) => {
            const [x, y] = project(checkpoint);
            return <circle key={checkpoint.miles} cx={x} cy={y} r={checkpoint.miles % 100 === 0 ? 3.2 : 2} className={completedMiles >= checkpoint.miles ? "reached" : ""} />;
          })}
        </g>

        <g className="milestone-pins">
          {milestones.map((milestone, index) => {
            if (!visibleMilestoneIndexes.has(index)) return null;
            const [x, y] = project(milestone);
            const reached = completedMiles >= milestone.miles;
            const isSelected = selected?.miles === milestone.miles;
            const major = index % 8 === 0;
            const last = index === milestones.length - 1;
            const showLabel = isSelected || last || zoom >= 64 || (major && zoom >= 4);
            return (
              <g key={`${milestone.miles}-${milestone.destination}`} transform={`translate(${x} ${y})`} className={`${reached ? " reached" : ""}${isSelected ? " selected" : ""}${major ? " major" : ""}${last ? " final" : ""}`}>
                <g transform={`scale(${markerScale})`}>
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`${milestone.destination}, landmark at ${milestone.miles} miles${reached ? ", reached" : ""}. Activate to zoom in and show its fun fact.`}
                    onClick={() => { if (!movedDuringGesture.current) selectMilestone(milestone); }}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectMilestone(milestone); }}
                  >
                    <circle className="pin-hit" r="16" />
                    <circle className="pin-mark" r={last ? 9 : major ? 7 : 4.6} />
                    {showLabel ? <text className="pin-label" x={last ? -14 : 11} y={last ? -12 : -9}>{last ? "1,000 · YELLOWSTONE" : `${milestone.miles} · ${shortName(milestone.destination)}`}</text> : null}
                  </g>
                </g>
              </g>
            );
          })}
        </g>

        <g className="map-runner" transform={`translate(${runnerXY[0]} ${runnerXY[1]})`} aria-label={`Runner at ${Math.round(completedMiles)} miles`}>
          <g transform={`scale(${markerScale})`}>
            <circle className="runner-aura" cy="-9" r="18" />
            <circle className="runner-head" cy="-16" r="8" />
            <path className="runner-body" d="M0-7L-7 5M0-7L10-1M-7 5L-17 15M-7 5L5 15M-3-9L-13-5" />
            <path className="runner-smile" d="M-3-15Q0-12 3-15" />
          </g>
        </g>
      </svg>

      <div className="map-zoom-controls" aria-label="Map zoom controls">
        <button type="button" onClick={() => { if (zoom === MIN_ZOOM) focusPoint(selected ?? runner, 16); else zoomAt(zoom * BUTTON_ZOOM_FACTOR); }} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in on adventure map">+</button>
        <button type="button" onClick={() => zoomAt(zoom / BUTTON_ZOOM_FACTOR)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out on adventure map">−</button>
        <button type="button" onClick={() => focusPoint(runner, Math.max(32, zoom))} aria-label="Center map on current running progress">Run</button>
        {zoom > MIN_ZOOM ? <button type="button" onClick={() => zoomAt(MIN_ZOOM)} aria-label="Reset adventure map to show the full route">Route</button> : null}
      </div>
      <span className="map-nudge" aria-hidden="true">Level {mapLevel}/11 · {visibleMilestoneIndexes.size} stops shown{zoom > MIN_ZOOM ? " · drag, pinch or scroll" : " · zoom to reveal every stop"}</span>
      <span className="map-compass" aria-hidden="true"><i />N</span>
    </div>
  );
}
