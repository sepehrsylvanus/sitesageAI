import { cancelRun } from "@/features/agent/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const cancelled = cancelRun(runId);
  return Response.json({ cancelled }, { status: cancelled ? 200 : 409 });
}
