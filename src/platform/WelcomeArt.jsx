import { useEffect, useRef, useState } from "react";

// The start page picture with a globe that really turns on its axis.
// The painting (hero.webp) is one image, so only its globe is redrawn: a
// canvas inside the painted glass draws the Earth in orthographic projection
// from Natural Earth land outlines (public/geodata/world-110m.json) and turns
// it slowly west to east. The stand, the boy and the robot do not move; the
// boy's arm and the robot (hero-front.webp, cut from the same painting) stay
// in front of the turning globe. When a name is typed the turn slows and
// stops; under reduced motion the globe stays still.

// The painted globe, as a share of the picture (1180 × 990 px): centre
// (692, 420), radii 362 × 345 px; the drawn sphere sits just inside the rim.
const GLOBE = { left: 29.0, top: 8.7, width: 59.3, height: 67.5 };
const TILT = (18 * Math.PI) / 180; // the north pole leans toward the viewer
const SPEED = (360 / 90) * (Math.PI / 180); // one turn in about 90 s
const START = (58 * Math.PI) / 180; // Egypt starts near the boy's finger
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function WelcomeArt({ resting, greeting }) {
  const canvas = useRef(null);
  const state = useRef({ lon: START, speed: SPEED, resting: false });
  const [ready, setReady] = useState(false);
  state.current.resting = resting;

  useEffect(() => {
    let world;
    let frame = 0;
    let alive = true;
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!ctx) return undefined;
    const size = 520;
    c.width = c.height = size;
    const R = size / 2 - 2;
    const draw = (lon) => {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, R, 0, Math.PI * 2);
      ctx.clip();
      const sea = ctx.createRadialGradient(size * 0.38, size * 0.32, R * 0.1, size / 2, size / 2, R);
      sea.addColorStop(0, "#47a8ff");
      sea.addColorStop(1, "#0b4fbe");
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, size, size);
      const cosT = Math.cos(TILT);
      const sinT = Math.sin(TILT);
      // Orthographic projection; a point behind the globe is pulled onto the
      // edge so shapes crossing the edge close neatly.
      const project = ([lng, lat]) => {
        const l = (lng * Math.PI) / 180 - lon;
        const p = (lat * Math.PI) / 180;
        const x = Math.cos(p) * Math.sin(l);
        const y = cosT * Math.sin(p) - sinT * Math.cos(p) * Math.cos(l);
        const z = sinT * Math.sin(p) + cosT * Math.cos(p) * Math.cos(l);
        if (z >= 0) return [size / 2 + x * R, size / 2 - y * R];
        const k = 1 / Math.hypot(x, y || 1e-9);
        return [size / 2 + x * k * R, size / 2 - y * k * R];
      };
      const path = (ring) => {
        ctx.beginPath();
        ring.forEach((pt, i) => {
          const [x, y] = project(pt);
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.closePath();
      };
      // A faint grid shows the turn.
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      for (let g = -180; g < 180; g += 30) {
        const ring = [];
        for (let la = -90; la <= 90; la += 6) ring.push([g, la]);
        ctx.beginPath();
        let open = false;
        for (const pt of ring) {
          const l = (pt[0] * Math.PI) / 180 - lon;
          const p = (pt[1] * Math.PI) / 180;
          const z = sinT * Math.sin(p) + cosT * Math.cos(p) * Math.cos(l);
          const [x, y] = project(pt);
          if (z < 0) {
            open = false;
            continue;
          }
          if (open) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          open = true;
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#79b94f";
      ctx.strokeStyle = "rgba(255,240,200,0.55)";
      ctx.lineWidth = 1.2;
      for (const ring of world.land) {
        path(ring);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#f0a33a";
      ctx.strokeStyle = "#fff3c4";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(255,190,60,0.9)";
      ctx.shadowBlur = 10;
      for (const ring of world.egypt) {
        path(ring);
        ctx.fill();
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // Light from the top left and a dark limb make it read as a ball.
      const shade = ctx.createRadialGradient(size * 0.36, size * 0.3, R * 0.05, size / 2, size / 2, R * 1.02);
      shade.addColorStop(0, "rgba(255,255,255,0.35)");
      shade.addColorStop(0.45, "rgba(255,255,255,0)");
      shade.addColorStop(0.82, "rgba(0,20,70,0.18)");
      shade.addColorStop(1, "rgba(0,15,55,0.6)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();
    };
    fetch("/geodata/world-110m.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!alive) return;
        world = data;
        draw(state.current.lon);
        setReady(true);
        if (reduced()) return;
        let last = 0;
        const tick = (t) => {
          const dt = last ? Math.min(t - last, 100) / 1000 : 0;
          last = t;
          const s = state.current;
          // Slow down smoothly once a name is typed.
          const target = s.resting ? 0 : SPEED;
          s.speed += (target - s.speed) * Math.min(1, dt * 3);
          if (s.resting && s.speed < SPEED * 0.02) s.speed = 0;
          if (s.speed > 0) {
            s.lon -= s.speed * dt;
            draw(s.lon);
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {});
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={`entry-hero ${resting ? "is-resting" : ""} ${greeting ? "is-greeting" : ""}`}>
      <img src="/welcome/hero.webp" alt="طفل مستكشف وروبوت المرشد يشيران إلى مصر على كرة أرضية تدور" />
      <canvas
        ref={canvas}
        className={`entry-globe-canvas ${ready ? "is-ready" : ""}`}
        style={{ left: `${GLOBE.left}%`, top: `${GLOBE.top}%`, width: `${GLOBE.width}%`, height: `${GLOBE.height}%` }}
        aria-hidden="true"
      />
      <img className="entry-hero-front" src="/welcome/hero-front.webp" alt="" aria-hidden="true" />
      <span className="entry-robot-glow" aria-hidden="true" />
    </div>
  );
}
