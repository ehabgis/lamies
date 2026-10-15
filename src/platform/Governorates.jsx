import { useEffect, useState } from "react";
const project = ([lng, lat]) => [
  75 + ((lng - 24) / 12) * 350,
  365 - ((lat - 21) / 11) * 330,
];
const path = (rings) =>
  rings
    .map(
      (r) =>
        r
          .map(
            (p, i) =>
              `${i ? "L" : "M"}${project(p)
                .map((n) => n.toFixed(2))
                .join(",")}`,
          )
          .join(" ") + "Z",
    )
    .join(" ");
export default function Governorates() {
  const [features, setFeatures] = useState([]),
    [selected, setSelected] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/geodata/egypt-governorates.geojson")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => setFeatures(d.features))
      .catch(() => setError("تعذر تحميل طبقة المحافظات."));
  }, []);
  return (
    <div className="governorates-layer">
      <svg viewBox="0 0 500 400" aria-label="حدود المحافظات التعليمية">
        <g>
          {features.map((f) => (
            <g key={f.id} className={selected === f.id ? "selected" : ""}>
              <path
                d={
                  f.geometry.type === "Polygon"
                    ? path(f.geometry.coordinates)
                    : f.geometry.coordinates.map(path).join(" ")
                }
                onClick={() => setSelected(f.id)}
              />
              {(() => {
                const [x, y] = project([
                  f.properties.longitude,
                  f.properties.latitude,
                ]);
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    onClick={() => setSelected(f.id)}
                  >
                    {f.properties.name_ar}
                  </text>
                );
              })()}
            </g>
          ))}
        </g>
      </svg>
      <div className="governorate-accessible">
        <label>
          اختر محافظة
          <select
            value={selected || ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">جميع المحافظات</option>
            {features.map((f) => (
              <option value={f.id} key={f.id}>
                {f.properties.name_ar}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <p role="status">
            المحافظة المختارة:{" "}
            {features.find((f) => f.id === selected)?.properties.name_ar}
          </p>
        )}
        {error && <p role="status">{error}</p>}
        <small>
          Natural Earth · حدود معمّمة للاستخدام التعليمي وليست مرجعًا رسميًا.
        </small>
      </div>
    </div>
  );
}
