import { describe, expect, it } from "vitest";
import {
  CARTO_BASEMAPS,
  PARTNER_GEO,
  SCHOOL_GEO,
  arcFeature,
  basemapStyleUrl,
  buildArc,
  networkBounds,
  partnerCoord,
} from "../geo";

describe("geo helpers", () => {
  it("constructs deterministic curved arcs between coordinates", () => {
    const arc = buildArc(SCHOOL_GEO.coord, PARTNER_GEO.p1!, 4);

    expect(arc).toHaveLength(5);
    expect(arc[0]).toEqual(SCHOOL_GEO.coord);
    expect(arc[4]).toEqual(PARTNER_GEO.p1);
    expect(arc[2]).not.toEqual([
      (SCHOOL_GEO.coord[0] + PARTNER_GEO.p1![0]) / 2,
      (SCHOOL_GEO.coord[1] + PARTNER_GEO.p1![1]) / 2,
    ]);
  });

  it("wraps arcs as GeoJSON LineString features with supplied properties", () => {
    const feature = arcFeature(SCHOOL_GEO.coord, PARTNER_GEO.p2!, {
      id: "p2",
      active: 1,
    });

    expect(feature.geometry.type).toBe("LineString");
    expect(feature.geometry.coordinates[0]).toEqual(SCHOOL_GEO.coord);
    expect(feature.properties).toEqual({ id: "p2", active: 1 });
  });

  it("generates bounds that contain the school and every partner coordinate", () => {
    const [sw, ne] = networkBounds();
    const allCoords = [SCHOOL_GEO.coord, ...Object.values(PARTNER_GEO)];

    for (const [lng, lat] of allCoords) {
      expect(lng).toBeGreaterThanOrEqual(sw[0]);
      expect(lng).toBeLessThanOrEqual(ne[0]);
      expect(lat).toBeGreaterThanOrEqual(sw[1]);
      expect(lat).toBeLessThanOrEqual(ne[1]);
    }
  });

  it("looks up partner coordinates deterministically without fabricating unknown ids", () => {
    expect(partnerCoord("p3")).toEqual(PARTNER_GEO.p3);
    expect(partnerCoord("unknown")).toBeNull();
  });

  it("selects tokenless CARTO basemaps for light and dark themes", () => {
    expect(basemapStyleUrl(false)).toBe(CARTO_BASEMAPS.light);
    expect(basemapStyleUrl(true)).toBe(CARTO_BASEMAPS.dark);
  });
});
