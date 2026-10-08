import { getReport } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (!["json", "pdf"].includes(format)) return Response.json({ error: "Choose format=json or format=pdf." }, { status: 400 });
  const report = getReport(id);
  if (!report) return Response.json({ error: "This report is no longer in memory. Generate it again to download." }, { status: 404 });
  const filename = report.guide.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
  return new Response(format === "pdf" ? new Uint8Array(report.pdf) : JSON.stringify(report.guide, null, 2), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}-brand-guide.${format}"`,
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    },
  });
}
