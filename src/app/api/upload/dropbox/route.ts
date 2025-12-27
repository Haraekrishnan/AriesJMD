import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const dropboxRes = await fetch(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
          "Dropbox-API-Arg": JSON.stringify({
            path: `/documents/${Date.now()}_${file.name}`,
            mode: "add",
            autorename: true,
          }),
          "Content-Type": "application/octet-stream",
        },
        body: buffer,
      }
    );

    const data = await dropboxRes.json();

    if (!dropboxRes.ok) {
      console.error("Dropbox upload error:", data);
      return NextResponse.json({ error: "Dropbox upload failed.", details: data }, { status: 500 });
    }

    // Create share link
    const linkRes = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: data.path_lower,
        }),
      }
    );

    const linkData = await linkRes.json();
    if (!linkRes.ok) {
        console.error("Dropbox share link error:", linkData);
        // Handle cases where a link might already exist
        if (linkData.error_summary && linkData.error_summary.startsWith('shared_link_already_exists')) {
            const listLinksRes = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ path: data.path_lower }),
            });
            const existingLinksData = await listLinksRes.json();
            if (listLinksRes.ok && existingLinksData.links.length > 0) {
                 const downloadLink = existingLinksData.links[0].url.replace("?dl=0", "?dl=1");
                 return NextResponse.json({ success: true, fileName: file.name, downloadLink });
            }
        }
        return NextResponse.json({ error: "Could not create shareable link.", details: linkData }, { status: 500 });
    }


    const downloadLink = linkData.url.replace("?dl=0", "?dl=1");

    return NextResponse.json({
      success: true,
      fileName: file.name,
      downloadLink,
    });
  } catch (err: any) {
    console.error("API route error:", err);
    return NextResponse.json(
      { error: "Upload failed", details: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
