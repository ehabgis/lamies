import { lazy } from "react";
import { useParams } from "react-router-dom";

const ExpeditionPage = lazy(() => import("./ExpeditionPage"));
const WaterQuestPage = lazy(() => import("./WaterQuestPage"));
const ProjectQuestPage = lazy(() => import("./ProjectQuestPage"));

// Each lesson has its own kind of exploration journey.
export default function TripRoute() {
  const { id } = useParams();
  if (id === "lesson-2") return <WaterQuestPage id={id} />;
  if (id === "lesson-3") return <ProjectQuestPage id={id} />;
  return <ExpeditionPage />;
}
