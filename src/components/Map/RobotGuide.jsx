import { useId } from "react";
export default function RobotGuide({ style } = {}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 160 180"
      role="img"
      aria-label="المعلم الذكي"
      className="atlas-robot"
      style={style}
    >
      <defs>
        <linearGradient id={`${id}-shell`} x2=".8" y2="1">
          <stop stopColor="white" />
          <stop offset=".6" stopColor="#d9f7ff" />
          <stop offset="1" stopColor="#64b8ef" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x2="0" y2="1">
          <stop stopColor="#034c99" />
          <stop offset="1" stopColor="#00194b" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="168" rx="51" ry="8" fill="#1894cf" opacity=".16" />
      <g stroke="#065bcc" strokeWidth="3" strokeLinejoin="round">
        <path d="M80 32V17" />
        <circle cx="80" cy="12" r="7" fill="#31e8ff" />
        <rect x="26" y="48" width="16" height="35" rx="8" fill="#40d5ff" />
        <rect x="118" y="48" width="16" height="35" rx="8" fill="#40d5ff" />
        <rect
          x="38"
          y="33"
          width="84"
          height="70"
          rx="31"
          fill={`url(#${id}-shell)`}
        />
        <rect
          x="47"
          y="44"
          width="66"
          height="46"
          rx="20"
          fill={`url(#${id}-face)`}
        />
        <rect
          x="52"
          y="104"
          width="56"
          height="45"
          rx="19"
          fill={`url(#${id}-shell)`}
        />
        <path
          d="M51 110Q24 103 26 126Q28 137 42 130"
          fill={`url(#${id}-shell)`}
        />
        <path
          d="M107 115Q131 114 135 90L145 87Q151 107 130 130L110 136"
          fill={`url(#${id}-shell)`}
        />
        <path
          d="M137 91L139 69Q144 63 148 70L146 88"
          fill={`url(#${id}-shell)`}
        />
        <rect
          x="53"
          y="147"
          width="24"
          height="17"
          rx="8"
          fill={`url(#${id}-shell)`}
        />
        <rect
          x="85"
          y="147"
          width="24"
          height="17"
          rx="8"
          fill={`url(#${id}-shell)`}
        />
      </g>
      <ellipse cx="64" cy="65" rx="7" ry="10" fill="#35e8ff" />
      <ellipse cx="96" cy="65" rx="7" ry="10" fill="#35e8ff" />
      <circle cx="65" cy="61" r="3" fill="white" />
      <circle cx="97" cy="61" r="3" fill="white" />
      <path
        d="M72 79Q80 87 89 78"
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M80 114L91 119V128Q80 143 69 128V119Z" fill="#0a9eff" />
      <path
        d="M19 30L13 17M132 26L137 13M145 38L156 32"
        stroke="#ffd447"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
