const DEFAULT_LAYOUT_OPTIONS = {
  minDistance: 6,
  ringStep: 2.4,
  maxAttempts: 24,
  edgePadding: 4
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const distanceSquared = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export function buildDeclutteredPercentPositions(items, getBasePosition, options = {}) {
  if (!Array.isArray(items) || !items.length || typeof getBasePosition !== 'function') {
    return new Map();
  }

  const settings = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const minDistanceSquared = settings.minDistance * settings.minDistance;

  const prepared = items
    .map((item) => ({
      id: item?.id,
      item,
      base: getBasePosition(item)
    }))
    .filter(
      (entry) => entry.id !== undefined
        && entry.base
        && Number.isFinite(entry.base.x)
        && Number.isFinite(entry.base.y)
    )
    .sort(
      (a, b) => (
        (a.base.y - b.base.y)
        || (a.base.x - b.base.x)
        || String(a.id).localeCompare(String(b.id))
      )
    );

  const placed = [];
  const result = new Map();

  prepared.forEach((entry, index) => {
    const base = {
      x: clamp(entry.base.x, settings.edgePadding, 100 - settings.edgePadding),
      y: clamp(entry.base.y, settings.edgePadding, 100 - settings.edgePadding)
    };

    let chosen = base;

    for (let attempt = 0; attempt <= settings.maxAttempts; attempt += 1) {
      const candidate = attempt === 0
        ? base
        : (() => {
          const ring = Math.ceil(attempt / 8);
          const angle = ((attempt % 8) / 8) * Math.PI * 2 + (index % 4) * 0.28;
          return {
            x: clamp(
              base.x + Math.cos(angle) * ring * settings.ringStep,
              settings.edgePadding,
              100 - settings.edgePadding
            ),
            y: clamp(
              base.y + Math.sin(angle) * ring * settings.ringStep,
              settings.edgePadding,
              100 - settings.edgePadding
            )
          };
        })();

      const isColliding = placed.some((point) => distanceSquared(point, candidate) < minDistanceSquared);
      if (!isColliding || attempt === settings.maxAttempts) {
        chosen = candidate;
        break;
      }
    }

    placed.push(chosen);
    result.set(entry.id, chosen);
  });

  return result;
}
