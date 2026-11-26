import { authorizedRole } from "@/lib/server";
import { hubspotExportSchema } from "@/lib/hubspot-export-options";
import { readExportData } from "@/lib/hubspot-export-reader";
import { buildHubspotExport } from "@/lib/hubspot-export";
import { exportZip } from "@/lib/export-zip";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await authorizedRole();
  if (auth?.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = hubspotExportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose at least one export category and enter a pipeline and destination stage." }, { status: 400 });
  try {
    const data = await readExportData(auth.client, parsed.data.categories);
    const exportedAt = new Date().toISOString();
    const { files } = buildHubspotExport(data, parsed.data, exportedAt);
    const zip = exportZip(files);
    if (zip.byteLength > 4_000_000) return Response.json({ error: "This ZIP exceeds the download limit. Export fewer categories at a time." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    return new Response(new Blob([zip as Uint8Array<ArrayBuffer>], { type: "application/zip" }), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="rmaiig-hubspot-${exportedAt.slice(0, 10)}.zip"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not create the export. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
