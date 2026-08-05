import { Navigate, useParams } from "react-router-dom";

/** Instructions are shown inline on the registration page; this route redirects there. */
export function ExamInstructionsPage() {
  const { publicCode } = useParams();
  return <Navigate to={`/exam/${publicCode}`} replace />;
}
