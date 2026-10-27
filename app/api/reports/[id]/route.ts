import { findReport } from "@/lib/reports";

// Mock API. Behaves like a slightly slow real backend:
//   - responds after 300–1200 ms
//   - 404 for an unknown id
//   - ?fail=1 forces a 500, so you can build and test your error state
// You can read this file, but treat its behaviour as a contract you can't change.

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 900));

  if (new URL(request.url).searchParams.get("fail") === "1") {
    return Response.json({ error: "Something went wrong loading this report." }, { status: 500 });
  }

  const report = findReport(id);
  if (!report) {
    return Response.json({ error: `No report with id "${id}".` }, { status: 404 });
  }
  return Response.json(report);
}
