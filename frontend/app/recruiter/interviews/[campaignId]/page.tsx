import RecruiterInterviewDetailPage from "@/app/dashboard/recruiter/RecruiterInterviewDetailPage";

export default async function RecruiterInterviewDetailRoute({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <RecruiterInterviewDetailPage campaignId={campaignId} />;
}
