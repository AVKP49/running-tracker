import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { IllustratedAdventureMap, type IllustratedMilestone } from "./IllustratedAdventureMap";
import roadData from "./route-data.json";

type Point = { lat: number; lng: number };
type Props = {
  milestones: readonly IllustratedMilestone[];
  routePoints: readonly (Point & { miles: number; destination?: string })[];
  progressCheckpoints: readonly (Point & { miles: number })[];
  runner: Point;
  completedMiles: number;
  selected: IllustratedMilestone | null;
  onSelect: (milestone: IllustratedMilestone) => void;
  expanded: boolean;
};

const ROAD: L.LatLngTuple[] = roadData.coordinates.map(([lng = 0, lat = 0]) => [lat, lng]);
const BOUNDS = L.latLngBounds(ROAD);
const ROAD_LENGTHS = ROAD.reduce<number[]>((lengths, coordinate, index) => {
  const previous = ROAD[index - 1];
  lengths.push((lengths[index - 1] ?? 0) + (previous ? L.latLng(previous).distanceTo(L.latLng(coordinate)) : 0));
  return lengths;
}, []);
const ROAD_TOTAL = ROAD_LENGTHS[ROAD_LENGTHS.length - 1] ?? 1;

export function roadPointAtMiles(miles: number): Point {
  const target = Math.max(0, Math.min(1, miles / 1000)) * ROAD_TOTAL;
  const index = ROAD_LENGTHS.findIndex((distance) => distance >= target);
  const upper = ROAD[Math.max(0, index)] ?? ROAD[ROAD.length - 1] ?? [37.77712, -122.41966];
  const lower = ROAD[Math.max(0, index - 1)] ?? upper;
  const before = ROAD_LENGTHS[Math.max(0, index - 1)] ?? 0;
  const after = ROAD_LENGTHS[Math.max(0, index)] ?? before;
  const ratio = after > before ? (target - before) / (after - before) : 0;
  return { lat: lower[0] + (upper[0] - lower[0]) * ratio, lng: lower[1] + (upper[1] - lower[1]) * ratio };
}

function completedRoad(miles: number): L.LatLngTuple[] {
  const target = Math.max(0, Math.min(1, miles / 1000)) * ROAD_TOTAL;
  const point = roadPointAtMiles(miles);
  return [...ROAD.filter((_, index) => (ROAD_LENGTHS[index] ?? 0) <= target), [point.lat, point.lng]];
}

function popupFor(milestone: IllustratedMilestone) {
  const node = document.createElement("div");
  node.className = "landmark-popup";
  const kicker = document.createElement("small");
  kicker.textContent = `LANDMARK · ${milestone.miles.toLocaleString()} challenge miles`;
  const title = document.createElement("strong");
  title.textContent = milestone.destination;
  const detail = document.createElement("p");
  detail.textContent = milestone.detail;
  const distance = document.createElement("span");
  distance.textContent = `≈ ${Math.round(milestone.actualMiles).toLocaleString()} road miles from San Francisco on this route`;
  node.append(kicker, title, detail, distance);
  return node;
}

export function RealAdventureMap(props: Props) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const progressLine = useRef<L.Polyline | null>(null);
  const runnerMarker = useRef<L.Marker | null>(null);
  const markers = useRef(new Map<number, L.Marker>());
  const latest = useRef(props);
  latest.current = props;
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    if (!node.current) return;
    let alive = true;
    let tileCount = 0;
    setStatus("loading");
    const instance = L.map(node.current, {
      minZoom: 4, maxZoom: 19, zoomControl: false,
      scrollWheelZoom: true, touchZoom: true, doubleClickZoom: true,
      maxBounds: [[34, -127], [49, -106]], maxBoundsViscosity: 0.6,
    });
    map.current = instance;
    instance.fitBounds(BOUNDS, { padding: [35, 35] });
    const tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxNativeZoom: 19, maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });
    // A real tileload event fires after the tile image has decoded successfully.
    tiles.on("tileload", () => { tileCount += 1; if (alive) setStatus("ready"); });
    tiles.addTo(instance);
    const timeout = window.setTimeout(() => {
      if (alive && tileCount === 0) setStatus("fallback");
    }, 15_000);

    L.polyline(ROAD, { color: "#fffaf0", weight: 8, opacity: 0.95 }).addTo(instance);
    L.polyline(ROAD, { color: "#456b66", weight: 4, opacity: 0.85 }).addTo(instance);
    progressLine.current = L.polyline(completedRoad(latest.current.completedMiles), {
      color: "#e85f36", weight: 5, lineCap: "round",
    }).addTo(instance);

    const checkpoints = L.layerGroup();
    latest.current.progressCheckpoints.forEach((point) => {
      L.circleMarker([point.lat, point.lng], { radius: 3, color: "#fffaf0", weight: 1,
        fillColor: "#456b66", fillOpacity: 0.85 }).bindTooltip(`${point.miles} challenge miles`).addTo(checkpoints);
    });
    const start = L.marker(ROAD[0] ?? [37.77712, -122.41966], {
      icon: L.divIcon({ className: "journey-start", html: '<span>SF</span>', iconSize: [32, 32], iconAnchor: [16, 16] }),
    }).bindTooltip("San Francisco · Starting line").addTo(instance);
    start.setZIndexOffset(500);

    const runner = roadPointAtMiles(latest.current.completedMiles);
    runnerMarker.current = L.marker([runner.lat, runner.lng], {
      icon: L.divIcon({ className: "journey-runner-marker", html: '<span>🏃</span>', iconSize: [40, 40], iconAnchor: [20, 20] }),
      zIndexOffset: 1000,
    }).bindTooltip("You are here", { direction: "top" }).addTo(instance);

    const landmarkMarkers = latest.current.milestones.map((milestone, index, all) => {
      const reached = latest.current.completedMiles >= milestone.miles;
      const marker = L.marker([milestone.lat, milestone.lng], {
        title: milestone.destination,
        icon: L.divIcon({ className: `journey-landmark-marker${reached ? " reached" : ""}`,
          html: `<span>${index === all.length - 1 ? "★" : reached ? "✓" : "●"}</span>`,
          iconSize: [26, 26], iconAnchor: [13, 13] }),
      }).bindPopup(popupFor(milestone), { maxWidth: 280, autoPanPadding: [25, 45] });
      marker.on("click", () => latest.current.onSelect(milestone));
      markers.current.set(milestone.miles, marker);
      return { marker, milestone, index };
    });

    const declutter = () => {
      setZoom(instance.getZoom());
      const used: L.Point[] = [];
      // Prefer the selected landmark, the finish, then landmarks spaced along the journey.
      const ordered = [...landmarkMarkers].sort((a, b) => {
        const priority = (item: typeof a) => item.milestone.miles === latest.current.selected?.miles ? 0 :
          item.index === landmarkMarkers.length - 1 ? 1 : item.index % 7 === 0 ? 2 : 3;
        return priority(a) - priority(b);
      });
      for (const { marker } of ordered) {
        const screen = instance.latLngToContainerPoint(marker.getLatLng());
        const visible = used.every((other) => screen.distanceTo(other) > (instance.getZoom() < 8 ? 48 : 32));
        if (visible) { used.push(screen); if (!instance.hasLayer(marker)) marker.addTo(instance); }
        else if (instance.hasLayer(marker)) instance.removeLayer(marker);
      }
      if (instance.getZoom() >= 8) checkpoints.addTo(instance);
      else instance.removeLayer(checkpoints);
    };
    instance.on("zoomend moveend", declutter);
    declutter();
    return () => {
      alive = false;
      window.clearTimeout(timeout);
      instance.remove();
      map.current = null;
      markers.current.clear();
    };
  }, [attempt]);

  useEffect(() => {
    progressLine.current?.setLatLngs(completedRoad(props.completedMiles));
    const runner = roadPointAtMiles(props.completedMiles);
    runnerMarker.current?.setLatLng([runner.lat, runner.lng]);
    props.milestones.forEach((milestone) => {
      markers.current.get(milestone.miles)?.getElement()?.classList.toggle("reached", props.completedMiles >= milestone.miles);
    });
  }, [props.completedMiles, props.milestones, attempt]);

  useEffect(() => {
    if (!props.selected || !map.current) return;
    const marker = markers.current.get(props.selected.miles);
    if (!marker) return;
    marker.addTo(map.current);
    map.current.flyTo(marker.getLatLng(), Math.max(8, map.current.getZoom()), { duration: 0.65 });
    marker.openPopup();
  }, [props.selected, attempt]);

  useEffect(() => {
    const timer = window.setTimeout(() => map.current?.invalidateSize({ pan: false }), 80);
    return () => window.clearTimeout(timer);
  }, [props.expanded, status]);

  const fitRoute = () => { map.current?.closePopup(); map.current?.flyToBounds(BOUNDS, { padding: [35, 35], duration: 0.65 }); };

  return (
    <div className="real-map-shell" data-map-status={status}>
      <div ref={node} className="real-map-canvas" style={status === "fallback" ? { visibility: "hidden" } : undefined}
        aria-label="Interactive street map from San Francisco to Yellowstone" />
      {status === "fallback" ? <div className="map-offline-atlas"><IllustratedAdventureMap {...props} />
        <div className="map-offline-note">Street tiles could not connect. Showing the illustrated atlas.
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reconnect</button>
        </div></div> : null}
      {status === "loading" ? <div className="real-map-probe" role="status"><span className="map-loader" />Loading the street map…</div> : null}
      {status !== "fallback" ? <>
        <div className="journey-map-controls" aria-label="Map controls">
          <button type="button" aria-label="Zoom in" onClick={() => map.current?.zoomIn()} disabled={zoom >= 19}>+</button>
          <button type="button" aria-label="Zoom out" onClick={() => map.current?.zoomOut()} disabled={zoom <= 4}>−</button>
          <button type="button" onClick={fitRoute}>Route</button>
          <button type="button" onClick={() => {
            const point = roadPointAtMiles(props.completedMiles);
            map.current?.flyTo([point.lat, point.lng], 11, { duration: 0.65 });
            runnerMarker.current?.openTooltip();
          }}>My runner</button>
        </div>
        {status === "ready" ? <div className="real-map-hint">Pinch or scroll to zoom · drag to explore · tap a landmark</div> : null}
      </> : null}
    </div>
  );
}
