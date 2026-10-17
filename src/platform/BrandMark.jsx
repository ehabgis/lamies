import { useId } from "react";

// Program logo: a globe with Egypt's map pin and a small compass sparkle.
// Colourful but flat enough to read at 28px.
export default function BrandMark({ size = 44, className = "" }) {
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
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffb938" />
          <stop offset=".55" stopColor="#ff7a45" />
          <stop offset="1" stopColor="#e2456b" />
        </linearGradient>
        <radialGradient id={`${id}-sea`} cx=".35" cy=".3" r=".8">
          <stop stopColor="#7fd8ff" />
          <stop offset="1" stopColor="#1576d6" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${id}-bg)`} />
      <circle cx="31" cy="34" r="19" fill={`url(#${id}-sea)`} stroke="#ffffff" strokeWidth="2.5" />
      <path
        d="M20 27c4-3 8-2 10 1 2-2 6-2 7 1 3 0 5 3 4 6l-5 2-2 6-4 3-3-5-5-1-2-5Z"
        fill="#7ccf5a"
      />
      <path d="M36 38c2 1 4 3 4 6l-3 2Z" fill="#7ccf5a" />
      <path d="M14 34h34M31 15c-6 6-6 32 0 38M31 15c6 6 6 32 0 38" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.2" />
      <path
        d="M33 10c-5 0-9 4-9 9 0 7 9 15 9 15s9-8 9-15c0-5-4-9-9-9Z"
        fill="#e23b3b"
        stroke="#ffffff"
        strokeWidth="2.2"
      />
      <circle cx="33" cy="19" r="3.4" fill="#ffffff" />
      <path d="M52 8l1.6 3.6L57 13l-3.4 1.4L52 18l-1.6-3.6L47 13l3.4-1.4Z" fill="#fff6c9" />
    </svg>
  );
}
