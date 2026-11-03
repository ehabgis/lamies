import { useEffect, useState } from "react";

// The start page picture. With the separate drawings in public/welcome/
// (boy.png, robot.png and globe-stand.png on clear backgrounds, and
// globe-map.jpg: a flat world map twice as wide as it is tall) the globe
// really turns on its axis: the flat map slides behind a round window shaded
// like a ball, while the stand, the boy and the robot stay still; the robot
// waves while it speaks. Until those files are added, the single painting
// (hero.webp) is shown with a light turning across its globe.
const LAYERS = ["boy.png", "robot.png", "globe-stand.png", "globe-map.jpg"];

function useLayers() {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    let left = LAYERS.length;
    let failed = false;
    for (const f of LAYERS) {
      const img = new Image();
      img.onload = () => !failed && --left === 0 && setOk(true);
      img.onerror = () => {
        failed = true;
        setOk(false);
      };
      img.src = `/welcome/${f}`;
    }
  }, []);
  return ok;
}

export default function WelcomeArt({ resting, greeting }) {
  const layered = useLayers();
  const state = `${resting ? "is-resting" : ""} ${greeting ? "is-greeting" : ""}`;
  if (layered)
    return (
      <div className={`entry-hero is-layered ${state}`} role="img" aria-label="طفل مستكشف وروبوت المرشد بجوار كرة أرضية تدور، عليها مصر">
        <img className="entry-layer-stand" src="/welcome/globe-stand.png" alt="" />
        <span className="entry-layer-globe" aria-hidden="true">
          <i style={{ backgroundImage: "url(/welcome/globe-map.jpg)" }} />
        </span>
        <img className="entry-layer-boy" src="/welcome/boy.png" alt="" />
        <img className="entry-layer-robot" src="/welcome/robot.png" alt="" />
      </div>
    );
  return (
    <div className={`entry-hero ${state}`}>
      <img src="/welcome/hero.webp" alt="طفل مستكشف وروبوت المرشد يشيران إلى مصر على كرة أرضية" />
      <span className="entry-globe-light" aria-hidden="true" />
      <span className="entry-robot-glow" aria-hidden="true" />
    </div>
  );
}
