import { useState } from "react";

// A teacher photo for a journey card (public/lesson-media/sites/trip-kunuz.jpg …),
// tried as jpg, png, webp then jpeg; without one the card keeps its icon.
const EXTS = ["jpg", "png", "webp", "jpeg"];
export const TRIP_PHOTO = { "lesson-1": "trip-kunuz", "lesson-2": "trip-water", "lesson-3": "trip-projects" };

export default function TripPhoto({ name, Icon, className = "trip-photo", iconClass = "trip-icon" }) {
  const [i, setI] = useState(0);
  if (i >= EXTS.length)
    return (
      <span className={iconClass} aria-hidden="true">
        <Icon weight="duotone" />
      </span>
    );
  return <img className={className} src={`/lesson-media/sites/${name}.${EXTS[i]}`} alt="" onError={() => setI(i + 1)} />;
}
