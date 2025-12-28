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
    
    // Correctly access environment variable
    const accessToken = process.env.DROPBOX_ACCESS_TOKEN;

    if (!accessToken) {
        console.error("Dropbox access token is not configured.");
        return NextResponse.json({ error: "File upload service is not configured correctly." }, { status: 500 });
    }

    const dropboxRes = await fetch(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Dropbox-API-Arg": JSON.stringify({
            path: `/documents/${Date.now()}_${file.name.replace(/\s/g, '_')}`,
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
      return NextResponse.json(
        {
          success: false,
          error: data?.error_summary || "Dropbox upload failed",
          debug: data,
        },
        { status: 500 }
      );
    }

    // Create share link
    const linkRes = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: data.path_lower,
          settings: {
              requested_visibility: "public"
          }
        }),
      }
    );

    let linkData = await linkRes.json();
    
    if (!linkRes.ok) {
        // Handle cases where a link might already exist
        if (linkData.error_summary && linkData.error_summary.startsWith('shared_link_already_exists')) {
            const listLinksRes = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ path: data.path_lower, direct_only: true }),
            });
            const existingLinksData = await listLinksRes.json();
            if (listLinksRes.ok && existingLinksData.links.length > 0) {
                 linkData = existingLinksData.links[0];
            } else {
                 return NextResponse.json({ error: "Could not retrieve existing shareable link.", details: existingLinksData }, { status: 500 });
            }
        } else {
             return NextResponse.json({ error: "Could not create shareable link.", details: linkData }, { status: 500 });
        }
    }

    // Create a direct download link by replacing dl=0 with dl=1
    const downloadLink = linkData.url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");

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
