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
