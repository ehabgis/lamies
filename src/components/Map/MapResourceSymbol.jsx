import { useId } from "react";
import { Drop, Waves, CloudRain, Factory, GitFork } from "phosphor-react";
import ResourcePin from "./ResourcePin";

// Screen-stable teaching locators; shape/color identify a resource, never quantity.
export default function MapResourceSymbol({ resource, compact = false }) {
  const id = useId().replaceAll(":", "");
  if (resource?.kind !== "water") return <ResourcePin resource={resource} />;
  const Icon = ["mediterranean-sea", "red-sea", "lake-nasser"].includes(resource.id)
    ? Waves : resource.id === "desalination" ? Factory
      : resource.id === "nile-delta" ? GitFork
        : resource.id?.includes("rain") ? CloudRain : Drop;
  if (compact) return <Icon className="legend-water-icon" size={25} weight="bold" aria-hidden="true" />;
  return (
    <svg className="resource-pin water-resource-pin" viewBox="0 0 84 108" aria-hidden="true" data-icon-kind={resource.id}>
      <defs><linearGradient id={`water-${id}`} x2="0" y2="1"><stop stopColor="#24c8f2" /><stop offset="1" stopColor="#087bd5" /></linearGradient></defs>
      <path d="M42 104C30 86 5 66 5 42a37 37 0 1 1 74 0c0 24-25 44-37 62Z" fill={`url(#water-${id})`} stroke="white" strokeWidth="4" />
      <circle cx="42" cy="42" r="30" fill="#079ee2" stroke="#8de5ff" strokeWidth="2" />
      <Icon x={21} y={20} width={42} height={42} color="white" weight={Icon === Drop ? "fill" : "bold"} />
    </svg>
  );
}
