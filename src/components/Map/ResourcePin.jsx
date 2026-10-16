import { useId } from "react";
import LessonIconPin from "./LessonIconPin";
import { iconFamily } from "./lessonIcons";

// Illustrated teaching symbols, inspired by the reference; not ore photographs.
export default function ResourcePin({ resource, className = "" }) {
  const family = iconFamily(resource);
  if (family) return <LessonIconPin family={family} className={className} />;
  return <IllustratedPin resource={resource} className={className} />;
}

function IllustratedPin({ resource, className }) {
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
                    : type === "copper"
                      ? "#e8a06b"
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
      {["iron", "manganese", "phosphate", "coal", "copper"].includes(type) && (
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
        <g
          stroke="#d8f9ff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          data-icon-kind={type}
        >
          {type === "nile-river" || type === "nile-delta" ? (
            <>
              <path
                d="M43 20c-14 12 12 17-2 29s8 13-3 24"
                stroke="#44d9ff"
                strokeWidth="7"
              />
              {type === "nile-delta" && (
                <path
                  d="M43 28L24 17m19 11 17-12"
                  stroke="#44d9ff"
                  strokeWidth="5"
                />
              )}
            </>
          ) : type === "groundwater" ? (
            <>
              <path d="M23 42h38v20H23ZM20 40l22-20 22 20M42 24v27" />
              <path d="M29 60q13-8 26 0" stroke="#41dfff" strokeWidth="6" />
            </>
          ) : type === "desalination" ? (
            <>
              <path d="M21 63V39h27v24M48 47h16v16M27 39V27h9v12M27 49h4m8 0h4M27 57h4m8 0h4" />
              <path d="M53 27q-10 13 0 17 10-4 0-17Z" fill="#40dfff" />
            </>
          ) : type === "rain-harvesting-matrouh" ? (
            <>
              <path
                d="M25 43c-13-2-9-17 2-17 5-17 25-13 26 1 18-2 20 17 6 18Z"
                fill="#d4f5ff"
              />
              <path
                d="M28 52l-4 10m18-9-4 10m18-11-4 10"
                stroke="#40dfff"
                strokeWidth="4"
              />
            </>
          ) : (
            <>
              <path
                d="M20 39q8-9 15 0t15 0 15 0M20 51q8-9 15 0t15 0 15 0M20 63q8-9 15 0t15 0 15 0"
                stroke="#53e3ff"
                strokeWidth="4"
              />
              {type === "lake-nasser" && (
                <ellipse cx="42" cy="50" rx="28" ry="24" />
              )}
            </>
          )}
        </g>
      )}
      {resource?.kind === "project" && (
        <g
          stroke="#d5fae7"
          strokeWidth="2.3"
          fill="none"
          strokeLinejoin="round"
          data-icon-kind={type}
        >
          {type === "new-delta" || type === "toshka-kheir" ? (
            <>
              <path
                d="M42 70V38m0 14C21 52 18 31 23 29c13-1 19 11 19 23Zm0-8c0-17 13-25 21-21 2 14-7 23-21 21Z"
                fill="#8bdf88"
              />
              <path d="M20 66l12-7m-9 16 13-7m12-9 14 7m-13 2 14 7" />
            </>
          ) : type === "new-suez-canal" ? (
            <>
              <path d="M20 48h44l-8 14H29ZM32 48V28h21v20M41 28V18M19 70q8-7 16 0t16 0 16 0" />
              <path d="M37 35h3m6 0h3" strokeWidth="4" />
            </>
          ) : type === "high-speed-rail" ? (
            <>
              <rect
                x="24"
                y="22"
                width="36"
                height="43"
                rx="10"
                fill="#bce5d5"
              />
              <path d="M30 29h24v17H30Z" stroke="#176c4b" />
              <path d="M33 65l-7 11m25-11 7 11M28 73h28" />
              <circle cx="33" cy="56" r="2" fill="#176c4b" />
              <circle cx="51" cy="56" r="2" fill="#176c4b" />
            </>
          ) : type === "galala-city" ? (
            <>
              <path d="M17 66l19-43 18 43Z" fill="#76b79d" />
              <path d="M41 66V39h17v27M47 45h4m-4 8h4" />
            </>
          ) : (
            <>
              <path d="M22 67V36h16v31M38 67V20h24v47" fill="#bfe9d7" />
              <path
                d="M44 30h4m6 0h3m-13 9h4m6 0h3m-13 9h4m6 0h3M27 45h5m-5 10h5"
                stroke="#16704c"
                strokeWidth="3"
              />
              <path d="M19 70h47" strokeWidth="4" />
            </>
          )}
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
