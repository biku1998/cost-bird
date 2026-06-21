import { NextResponse } from "next/server";

/**
 * Placeholder chat endpoint. The real Mastra NL→SQL agent is wired up in CP3;
 * for now this just proves the route is reachable from the app.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { message?: string };
  return NextResponse.json({
    reply: `Stub: received "${body.message ?? ""}". The NL→SQL agent arrives in CP3.`,
  });
}
