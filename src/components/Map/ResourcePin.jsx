import { useId } from "react";

// Illustrated teaching symbols, inspired by the reference; not ore photographs.
export default function ResourcePin({ resource, className = "" }) {
  const id = useId().replaceAll(":", "");
  const type = resource?.id;
  return (
    <svg
      className={`resource-pin ${className}`}
      viewBox="0 0 84 108"
      aria-hidden="true"
      style={{ color: resource?.color || "#087bdd" }}
    >
      <defs>
        <linearGradient id={`${id}-rim`} x2=".8" y2="1">
          <stop stopColor="white" />
          <stop offset=".2" stopColor="currentColor" />
          <stop offset=".7" stopColor="currentColor" />
          <stop offset="1" stopColor="#082239" />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx=".35" cy=".2" r=".85">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="#051525" />
        </radialGradient>
        <linearGradient id={`${id}-rock`} x2="1" y2="1">
          <stop
            stopColor={
              type === "coal"
                ? "#72787c"
                : type === "phosphate"
                  ? "#efefce"
                  : type === "manganese"
                    ? "#c2a4d5"
                    : "#b8c1c8"
            }
          />
          <stop
            offset="1"
            stopColor={
              type === "coal"
                ? "#12181c"
                : type === "phosphate"
                  ? "#aca77c"
                  : "#303b46"
            }
          />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x2=".5" y2="1">
          <stop stopColor="#fff5a9" />
          <stop offset=".45" stopColor="#ffc928" />
          <stop offset="1" stopColor="#b86b00" />
        </linearGradient>
      </defs>
      <path
        d="M42 105C33 92 4 68 4 43a38 38 0 1176 0c0 25-29 49-38 62Z"
        fill={`url(#${id}-rim)`}
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="42"
        cy="43"
        r="32"
        fill={`url(#${id}-face)`}
        stroke="#ffffff85"
        strokeWidth="2"
      />
      {["iron", "manganese", "phosphate", "coal"].includes(type) && (
        <g stroke="#ffffff45" strokeWidth=".8" fill={`url(#${id}-rock)`}>
          <path d="M17 47l9-20 14-4 11 11-3 18-19 9Z" />
          <path d="M40 50l7-21 14 7 8 17-11 13-15-3Z" />
          <path d="M25 56l9-14 11 1 7 19-17 7-11-5Z" />
          <path
            d="M26 27l9 10 13-5M17 47l18-10-6 24M47 29l8 16 14 8M34 42l4 16 14 4"
            fill="none"
          />
          {type === "iron" && (
            <g fill="#c57843" stroke="none">
              <path d="M20 44l7-12 4 5-5 13Z" />
              <path d="M51 39l8 3 3 9-8-3Z" />
              <path d="M32 55l7-7 3 8-5 7Z" />
            </g>
          )}
        </g>
      )}
      {type === "gold" && (
        <g fill={`url(#${id}-gold)`} stroke="#ffe780" strokeWidth="1.1">
          <path d="M17 48l5-12 20-5 5 16-22 7Z" />
          <path d="M43 51l3-11 18 1 3 14-21 6Z" />
          <path d="M27 30l5-12 18 1 5 14-21 5Z" />
          <path d="M34 38l-2-19M25 54l-3-18M46 61V40" fill="none" />
        </g>
      )}
      {type === "solar" && (
        <g>
          <circle cx="43" cy="25" r="10" fill="#fff15a" />
          <path
            d="M43 10v-4m0 37v-5M28 25h-5m40 0h-5M31 13l-4-4m28 4 4-4"
            stroke="#fff15a"
            strokeWidth="2"
          />
          <path
            d="M14 44h56l-6 24H20Z"
            fill="#0364a1"
            stroke="#bbecff"
            strokeWidth="2"
          />
          <path
            d="M27 44l-2 24m17-24v24m15-24 2 24M17 52h50M19 60h47"
            stroke="#b7e7ff"
            strokeWidth="1"
          />
        </g>
      )}
      {type === "wind" && (
        <g fill="#eefbff" stroke="#b5e6ff" strokeWidth="1">
          <path d="M39 70l2-34h3l3 34Z" />
          <path d="M42 34l-4-19 5-8 4 23Z" />
          <path d="M42 34l20 5 7 8-24-7Z" />
          <path d="M42 34L27 51l-10 2 21-21Z" />
          <circle cx="42" cy="34" r="4" />
        </g>
      )}
      {type === "hydro" && (
        <g>
          <path d="M17 28h50v10H17Z" fill="#d1d4cc" />
          <path d="M20 38h44v28H20Z" fill="#739782" />
          <path
            d="M26 38v28m10-28v28m10-28v28m10-28v28"
            stroke="#dbffff"
            strokeWidth="4"
          />
          <path
            d="M17 69q25-12 50 0"
            stroke="#28d8f4"
            strokeWidth="8"
            fill="none"
          />
        </g>
      )}
      {type === "oil" && (
        <g stroke="#e8c280" strokeWidth="2" fill="none">
          <path d="M28 70l9-48h10l9 48M34 35h15M31 47h21M29 60h25M33 47l17 13M35 35l16 12" />
          <path d="M21 70h43" strokeWidth="4" />
          <path d="M18 58v-9h10" stroke="#f08b31" strokeWidth="3" />
        </g>
      )}
      {type === "gas" && (
        <g>
          <path
            d="M42 16c2 12 18 18 14 31-3 13-22 16-28 3-5-12 10-20 14-34Z"
            fill="#21dfff"
            stroke="#bcf8ff"
            strokeWidth="1"
          />
          <path d="M42 33c8 8 12 17 2 20-9-2-8-10-2-20Z" fill="white" />
          <path d="M27 60h30v10H27Z" fill="#6fa6c4" />
          <path d="M42 56v16" stroke="#ddeffc" strokeWidth="4" />
        </g>
      )}
      {resource?.kind === "water" && (
        <g>
          <path
            d="M42 18C37 31 24 40 25 51a17 17 0 0034 0C60 40 47 31 42 18Z"
            fill="#53dcff"
            stroke="#d6faff"
            strokeWidth="2"
          />
          <path
            d="M33 49q-2 10 7 12"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      {resource?.kind === "project" && (
        <g fill="#e3fbef" stroke="#80d5ad" strokeWidth="2">
          <path d="M22 40h16v30H22ZM38 25h24v45H38Z" />
          <path
            d="M44 34h4m6 0h3m-13 9h4m6 0h3m-13 9h4m6 0h3M27 49h5m-5 10h5"
            stroke="#16704c"
            strokeWidth="3"
          />
          <path d="M19 71h47" strokeWidth="4" />
        </g>
      )}
      <path
        d="M16 28Q25 9 45 12"
        fill="none"
        stroke="white"
        strokeWidth="3"
        opacity=".6"
        strokeLinecap="round"
      />
    </svg>
  );
}
