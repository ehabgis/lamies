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
    assert.equal(inside([31.24, 30.04], f.geometry.coordinates[0]), false);
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
