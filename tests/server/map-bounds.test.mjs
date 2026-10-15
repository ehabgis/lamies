import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EGYPT_BOUNDS } from "../../src/platform/mapBasemaps.js";
test("reset extent contains all lesson locations, including offshore gas and southern dams", () => {
  const content = JSON.parse(
    readFileSync(
      new URL("../../server/seed-content.json", import.meta.url),
      "utf8",
    ),
  );
  const [[south, west], [north, east]] = EGYPT_BOUNDS;
  const locations = content.resources.flatMap((r) => r.locations);
  assert(locations.length >= 9);
  for (const site of locations) {
    assert(
      site.lat > south && site.lat < north,
      `${site.name} must fit latitude bounds`,
    );
    assert(
      site.lng > west && site.lng < east,
      `${site.name} must fit longitude bounds`,
    );
  }
});

test("water highlights retain closed marine geometry, contain sea locators and exclude Cairo", () => {
  const seas = JSON.parse(
    readFileSync(
      new URL("../../public/geodata/egypt-seas.geojson", import.meta.url),
      "utf8",
    ),
  );
  const inside = ([x, y], ring) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [a, b] = ring[i],
        [c, d] = ring[j];
      if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a) hit = !hit;
    }
    return hit;
  };
  assert.equal(seas.features.length, 2);
  for (const f of seas.features) {
    assert.equal(f.geometry.type, "Polygon");
    assert.deepEqual(
      f.geometry.coordinates[0][0],
      f.geometry.coordinates[0].at(-1),
    );
    assert(
      inside(
        f.id === "red-sea" ? [35, 26] : [29, 32],
        f.geometry.coordinates[0],
      ),
    );
    const covers = (point) => inside(point, f.geometry.coordinates[0]) &&
      !f.geometry.coordinates.slice(1).some(ring => inside(point, ring));
    assert.equal(covers([31.24, 30.04]), false);
    // Land near shore must stay unfilled, including Sinai and the Nile Delta.
    for (const point of [[33.7, 29], [31, 31], [33.75, 27.2]])
      assert.equal(covers(point), false);
    if (f.id === "red-sea") {
      assert(covers([33, 28.5]), "Gulf of Suez must be included");
      assert(covers([34.7, 28.8]), "Gulf of Aqaba must be included");
    }
    for (const [x, y] of f.geometry.coordinates.flat())
      assert(
        Number.isFinite(x) &&
          Number.isFinite(y) &&
          x >= 24 &&
          x <= 37.5 &&
          y >= 21.7 &&
          y <= 34.5,
      );
  }
});
