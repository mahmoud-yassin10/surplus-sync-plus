/**
 * Real-world geography for the recovery network demo.
 * Lincoln Heights HS is anchored on Chicago's north side; partners are placed
 * around it so the live map reads as a real operational footprint.
 */

import type { Feature, LineString } from "geojson";

export type LngLat = [number, number];

export const SCHOOL_GEO: { id: string; name: string; coord: LngLat } = {
  id: "school",
  name: "Lincoln Heights HS",
  coord: [-87.645, 41.925],
};

/** Backend-stable partner id -> real coordinate. */
export const PARTNER_GEO: Record<string, LngLat> = {
  p1: [-87.67, 41.9],
  p2: [-87.655, 41.935],
  p3: [-87.69, 41.945],
  p4: [-87.69, 41.889],
  p5: [-87.64, 41.955],
};

export function partnerCoord(id: string): LngLat | null {
  return PARTNER_GEO[id] ?? null;
}

/**
 * Build a gently curved arc between two points as a GeoJSON LineString.
 * The control point is offset perpendicular to the chord midpoint so arcs
 * fan out instead of overlapping straight lines.
 */
export function buildArc(from: LngLat, to: LngLat, samples = 56, lift = 0.22): LngLat[] {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Perpendicular offset for the control point.
  const cx = mx - dy * lift;
  const cy = my + dx * lift;

  const points: LngLat[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const inv = 1 - t;
    const x = inv * inv * x1 + 2 * inv * t * cx + t * t * x2;
    const y = inv * inv * y1 + 2 * inv * t * cy + t * t * y2;
    points.push([x, y]);
  }
  return points;
}

export function arcFeature(
  from: LngLat,
  to: LngLat,
  properties: Record<string, unknown>,
): Feature<LineString> {
  return {
    type: "Feature",
    properties,
    geometry: { type: "LineString", coordinates: buildArc(from, to) },
  };
}

/** Bounds covering the school plus all partner coordinates, with padding handled by the map. */
export function networkBounds(): [LngLat, LngLat] {
  const coords = [SCHOOL_GEO.coord, ...Object.values(PARTNER_GEO)];
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/** Free, token-less CARTO vector basemap (Positron — clean light operational look). */
export const CARTO_BASEMAPS = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

/** Free, token-less CARTO vector basemap, selected to match the active app theme. */
export function basemapStyleUrl(isDark: boolean): string {
  return isDark ? CARTO_BASEMAPS.dark : CARTO_BASEMAPS.light;
}
