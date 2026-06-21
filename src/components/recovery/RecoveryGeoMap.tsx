import "maplibre-gl/dist/maplibre-gl.css";
import type MapLibre from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import { useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { useStore } from "../../lib/store";
import {
  PARTNER_GEO,
  SCHOOL_GEO,
  arcFeature,
  basemapStyleUrl,
  networkBounds,
  partnerCoord,
} from "../../lib/geo";
import { NetworkMap } from "./NetworkMap";

type MatchState = "provisional" | "reserved" | "confirmed" | "completed" | undefined;

const STATE_COLOR: Record<string, string> = {
  available: "#16a34a",
  limited: "#d97706",
  unavailable: "#94a3b8",
  closed: "#94a3b8",
};

const MATCH_COLOR: Record<string, string> = {
  reserved: "#6d4bd8",
  provisional: "#6d4bd8",
  confirmed: "#16a34a",
  completed: "#0d9488",
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function prefersDarkMap(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

/** Precomputed dash frames for the flowing-energy arc animation. */
const DASH_SEQUENCE: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];

export function RecoveryGeoMap({
  onSelect,
  selectedId,
}: {
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const { state } = useStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibre.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: MapLibre.Marker; el: HTMLElement }>>(new Map());
  const rafRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const loadedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Build the arc collection from current partners + matches.
  function arcCollection(): FeatureCollection<LineString> {
    const features = state.partners
      .filter((p) => p.status !== "closed" && partnerCoord(p.id))
      .map((p) => {
        const match = state.matches.find((m) => m.partnerId === p.id);
        const matchState = match?.state as MatchState;
        const color = matchState
          ? (MATCH_COLOR[matchState] ?? "#94a3b8")
          : (STATE_COLOR[p.status] ?? "#94a3b8");
        const width = matchState === "confirmed" || matchState === "completed" ? 3 : 2;
        return arcFeature(SCHOOL_GEO.coord, partnerCoord(p.id)!, {
          id: p.id,
          color,
          width,
          active: matchState ? 1 : 0,
        });
      });
    return { type: "FeatureCollection", features };
  }

  function makeMarkerEl(opts: {
    kind: "school" | "partner";
    color: string;
    label: string;
    dim: boolean;
    active: boolean;
  }): HTMLElement {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `ssp-marker group${opts.kind === "school" ? " ssp-marker--school" : ""}`;
    el.style.opacity = opts.dim ? "0.5" : "1";
    el.innerHTML = `
      <span class="ssp-marker-ring" style="background:${opts.color}"></span>
      <span class="ssp-marker-dot${opts.kind === "school" ? " ssp-marker-school" : ""}${
        opts.active ? " ssp-marker-active" : ""
      }" style="background:${opts.kind === "school" ? "#1f2a44" : opts.color}"></span>
      <span class="ssp-marker-label">${opts.label}</span>
    `;
    return el;
  }

  // Mount the map once on the client.
  useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined" || !containerRef.current) return;

    fallbackTimerRef.current = window.setTimeout(() => {
      if (!loadedRef.current) setStatus("error");
    }, 2500);

    void (async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        if (cancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: basemapStyleUrl(prefersDarkMap()),
          center: SCHOOL_GEO.coord,
          zoom: 11.6,
          pitch: 30,
          bearing: -17,
          attributionControl: { compact: true },
          fadeDuration: 0,
        });
        mapRef.current = map;

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
        map.scrollZoom.disable(); // keep page scroll smooth; zoom via controls / double-click

        map.on("load", () => {
          if (cancelled) return;
          loadedRef.current = true;
          if (fallbackTimerRef.current) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }

          map.addSource("arcs", { type: "geojson", data: arcCollection() });

          map.addLayer({
            id: "arcs-base",
            type: "line",
            source: "arcs",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": ["get", "color"],
              "line-width": ["get", "width"],
              "line-opacity": 0.28,
              "line-blur": 1.5,
            },
          });

          map.addLayer({
            id: "arcs-flow",
            type: "line",
            source: "arcs",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": ["get", "color"],
              "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 14, 2.2],
              "line-opacity": 0.95,
              "line-dasharray": [0, 4, 3],
            },
          });

          // Flowing dash animation — skipped (kept static & legible) when the
          // user prefers reduced motion.
          if (prefersReducedMotion()) {
            if (map.getLayer("arcs-flow")) {
              map.setPaintProperty("arcs-flow", "line-dasharray", [2, 2]);
            }
          } else {
            let step = 0;
            let last = 0;
            const animate = (t: number) => {
              if (t - last > 55) {
                step = (step + 1) % DASH_SEQUENCE.length;
                if (map.getLayer("arcs-flow")) {
                  map.setPaintProperty("arcs-flow", "line-dasharray", DASH_SEQUENCE[step]);
                }
                last = t;
              }
              rafRef.current = requestAnimationFrame(animate);
            };
            rafRef.current = requestAnimationFrame(animate);
          }

          buildMarkers(maplibregl, map);
          fitNetwork(map);
          setStatus("ready");
        });

        map.on("error", () => {
          if (!loadedRef.current) setStatus("error");
        });
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fitNetwork(map: MapLibre.Map) {
    const [sw, ne] = networkBounds();
    map.fitBounds([sw, ne], {
      padding: { top: 70, bottom: 70, left: 60, right: 60 },
      pitch: 50,
      bearing: -17,
      duration: prefersReducedMotion() ? 0 : 350,
      maxZoom: 13.5,
    });
  }

  function resetView() {
    const map = mapRef.current;
    if (map && loadedRef.current) fitNetwork(map);
  }

  function buildMarkers(maplibregl: typeof MapLibre, map: MapLibre.Map) {
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

    // School marker.
    const schoolEl = makeMarkerEl({
      kind: "school",
      color: "#1f2a44",
      label: SCHOOL_GEO.name,
      dim: false,
      active: false,
    });
    const schoolMarker = new maplibregl.Marker({ element: schoolEl, anchor: "center" })
      .setLngLat(SCHOOL_GEO.coord)
      .addTo(map);
    markersRef.current.set("school", { marker: schoolMarker, el: schoolEl });

    // Partner markers.
    for (const p of state.partners) {
      const coord = PARTNER_GEO[p.id];
      if (!coord) continue;
      const match = state.matches.find((m) => m.partnerId === p.id);
      const color = match?.state
        ? (MATCH_COLOR[match.state] ?? STATE_COLOR[p.status])
        : STATE_COLOR[p.status];
      const el = makeMarkerEl({
        kind: "partner",
        color,
        label: p.name,
        dim: p.status === "closed" || p.status === "unavailable",
        active: selectedId === p.id,
      });
      el.addEventListener("click", () => onSelect?.(p.id));
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(coord)
        .addTo(map);
      markersRef.current.set(p.id, { marker, el });
    }
  }

  // Update arcs + marker colors when workflow state changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("arcs") as MapLibre.GeoJSONSource | undefined;
    src?.setData(arcCollection());

    for (const p of state.partners) {
      const entry = markersRef.current.get(p.id);
      if (!entry) continue;
      const match = state.matches.find((m) => m.partnerId === p.id);
      const color = match?.state
        ? (MATCH_COLOR[match.state] ?? STATE_COLOR[p.status])
        : STATE_COLOR[p.status];
      const dot = entry.el.querySelector<HTMLElement>(".ssp-marker-dot");
      const ring = entry.el.querySelector<HTMLElement>(".ssp-marker-ring");
      if (dot) dot.style.background = color;
      if (ring) ring.style.background = color;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.partners, state.matches]);

  // Toggle active marker styling + fly to selection.
  useEffect(() => {
    const map = mapRef.current;
    markersRef.current.forEach(({ el }, id) => {
      const dot = el.querySelector<HTMLElement>(".ssp-marker-dot");
      if (!dot) return;
      dot.classList.toggle("ssp-marker-active", id === selectedId);
    });
    if (map && loadedRef.current && selectedId) {
      const coord = partnerCoord(selectedId);
      if (coord)
        map.flyTo({
          center: coord,
          zoom: 13,
          pitch: 55,
          duration: prefersReducedMotion() ? 0 : 900,
          essential: true,
        });
    }
  }, [selectedId]);

  return (
    <div className="relative aspect-[5/3] w-full rounded-md border border-[var(--color-line)] overflow-hidden bg-[var(--color-surface-2)]">
      {status === "loading" && (
        <div className="absolute inset-0">
          <NetworkMap onSelect={onSelect} selectedId={selectedId} />
        </div>
      )}
      <div
        ref={containerRef}
        className={`absolute inset-0 ${status === "ready" ? "" : "pointer-events-none opacity-0"}`}
      />

      {status === "loading" && (
        <div className="absolute inset-x-3 top-3 z-10">
          <div className="rounded-md bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-line)] px-3 py-2 text-[11px] text-[var(--color-text-soft)] shadow-lg">
            Loading live network map…
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0">
          <NetworkMap onSelect={onSelect} selectedId={selectedId} />
          <div className="absolute left-3 top-3 z-10 max-w-[260px] rounded-md bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-line)] px-3 py-2 text-[11px] text-[var(--color-text-soft)] shadow-lg">
            Live map is offline. Showing the schematic recovery network instead.
          </div>
        </div>
      )}

      {status === "ready" && (
        <button
          type="button"
          onClick={resetView}
          className="press absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-md bg-[var(--color-surface)]/85 backdrop-blur-md border border-[var(--color-line)] px-2.5 py-1.5 text-[10.5px] font-medium text-[var(--color-text-soft)] shadow-lg hover:text-[var(--color-text)] animate-fade"
          aria-label="Fit map to full network"
        >
          <Maximize2 size={11} /> Fit network
        </button>
      )}

      {status === "ready" && (
        <div className="absolute left-3 bottom-3 z-10 rounded-md bg-[var(--color-surface)]/85 backdrop-blur-md border border-[var(--color-line)] px-3 py-2 text-[10.5px] text-[var(--color-text-soft)] shadow-lg animate-fade">
          <div className="font-medium text-[var(--color-text)] mb-1.5 text-[11px]">
            Route status
          </div>
          <Legend color="#6d4bd8" label="Provisional / reserved" />
          <Legend color="#16a34a" label="Confirmed" />
          <Legend color="#0d9488" label="Completed" />
          <div className="mt-1.5 border-t border-[var(--color-line)] pt-1.5 text-[9.5px] text-[var(--color-text-faint)]">
            Demo-area partner points are approximate.
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
