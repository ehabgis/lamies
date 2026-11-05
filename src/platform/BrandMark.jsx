import { useId } from "react";
import { LOGO_LAND } from "./brandLand";

// Program logo (approved 2026-11-05): a globe in a white rim inside an
// orange-to-red ring, with a red map pin at the top right. The land is real
// (Natural Earth outlines), so it reads the same at 24px and at 200px.
// `round` is kept for older callers; the logo is always round now.
// eslint-disable-next-line no-unused-vars
export default function BrandMark({ size = 44, className = "", round = true }) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      className={`brand-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffc21a" />
          <stop offset=".45" stopColor="#ff6a1f" />
          <stop offset="1" stopColor="#f0193f" />
        </linearGradient>
        <radialGradient id={`${id}-sea`} cx=".38" cy=".3" r=".85">
          <stop stopColor="#33c4ff" />
          <stop offset=".55" stopColor="#0b6fe0" />
          <stop offset="1" stopColor="#0a3fb8" />
        </radialGradient>
        <linearGradient id={`${id}-land`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f3f51c" />
          <stop offset="1" stopColor="#8fd11e" />
        </linearGradient>
        <clipPath id={`${id}-globe`}>
          <circle cx="32" cy="32" r="21.6" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30.5" fill={`url(#${id}-ring)`} />
      <circle cx="32" cy="32" r="23.4" fill="#ffffff" />
      <circle cx="32" cy="32" r="21.6" fill={`url(#${id}-sea)`} />
      <path clipPath={`url(#${id}-globe)`} d={LOGO_LAND} fill={`url(#${id}-land)`} />
      <ellipse cx="24.5" cy="20.5" rx="9" ry="4.4" fill="#ffffff" opacity=".18" transform="rotate(-30 24.5 20.5)" />
      <path
        d="M44 5.5c-5.6 0-10 4.4-10 9.8 0 6.9 10 16.4 10 16.4s10-9.5 10-16.4c0-5.4-4.4-9.8-10-9.8Z"
        fill="#ffffff"
      />
      <path
        d="M44 8.2c-4.1 0-7.3 3.2-7.3 7.1 0 5 7.3 12.4 7.3 12.4s7.3-7.4 7.3-12.4c0-3.9-3.2-7.1-7.3-7.1Z"
        fill="#e8141c"
      />
      <circle cx="44" cy="15.2" r="3" fill="#ffffff" />
    </svg>
  );
}
