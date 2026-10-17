import { lazy } from "react";
import { useParams } from "react-router-dom";

const ExpeditionPage = lazy(() => import("./ExpeditionPage"));
const WaterQuestPage = lazy(() => import("./WaterQuestPage"));

// Each lesson has its own kind of exploration journey.
export default function TripRoute() {
  const { id } = useParams();
  return id === "lesson-2" ? <WaterQuestPage id={id} /> : <ExpeditionPage />;
}
