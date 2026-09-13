import { toSafeErrorPayload } from "@/lib/errors";
import { getRun, toRunSnapshot } from "@/features/agent/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await context.params;
    const run = getRun(runId);
    if (!run) {
      return Response.json(
        {
          error: {
            code: "RUN_NOT_FOUND",
            message: "That audit run doesn't exist or has expired.",
          },
        },
        { status: 404 },
      );
    }
    return Response.json(toRunSnapshot(run));
  } catch (error) {
    return Response.json({ error: toSafeErrorPayload(error) }, { status: 500 });
  }
}
