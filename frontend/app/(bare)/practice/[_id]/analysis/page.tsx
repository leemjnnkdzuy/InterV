import InterviewAnalysisPage from "@/app/pages/InterviewAnalysisPage";

interface AnalysisRouteProps {
  params: Promise<{ _id: string }>;
  searchParams: Promise<{ runId?: string }>;
}

export default async function Page({
  params,
  searchParams,
}: AnalysisRouteProps) {
  const [{ _id }, query] = await Promise.all([params, searchParams]);
  return (
    <InterviewAnalysisPage practiceId={_id} runId={query.runId || ""} />
  );
}
