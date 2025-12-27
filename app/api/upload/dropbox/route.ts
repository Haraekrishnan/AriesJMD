
import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      return NextResponse.json(
        { error: "File too large (max 20MB)" },
        { status: 400 }
      );
    }
    
    const safeFileName = file.name.replace(/\s+/g, '_');

    const buffer = Buffer.from(await file.arrayBuffer());

    const dropboxRes = await fetch(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
          "Dropbox-API-Arg": JSON.stringify({
            path: `/documents/${Date.now()}_${safeFileName}`,
            mode: "add",
            autorename: true,
          }),
          "Content-Type": "application/octet-stream",
        },
        body: buffer,
      }
    );

    const uploadText = await dropboxRes.text();
    let uploadData;
    try {
      uploadData = JSON.parse(uploadText);
    } catch {
      uploadData = { raw: uploadText };
    }


    if (!dropboxRes.ok) {
      console.error("Dropbox upload error:", uploadData);
      return NextResponse.json({ error: "Dropbox upload failed.", details: uploadData }, { status: 500 });
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
          path: uploadData.path_lower,
          settings: {
            requested_visibility: "public",
          },
        }),
      }
    );

    const linkText = await linkRes.text();
    let linkData;
     try {
      linkData = JSON.parse(linkText);
    } catch {
      linkData = { raw: linkText };
    }


    if (!linkRes.ok) {
      // Handle case where link already exists
      if (linkData.error_summary?.startsWith('shared_link_already_exists')) {
          const listLinksRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
              method: 'POST',
              headers: {
                  Authorization: `Bearer ${process.env.DROPBOX_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  path: uploadData.path_lower,
                  direct_only: true,
              }),
          });
          const listLinksData = await listLinksRes.json();
          if (listLinksData.links && listLinksData.links.length > 0) {
              const downloadLink = listLinksData.links[0].url.replace("?dl=0", "?dl=1");
              return NextResponse.json({
                  success: true,
                  fileName: file.name,
                  downloadLink,
              });
          }
      }
      console.error("Dropbox share link error:", linkData);
      return NextResponse.json({ error: "Failed to create share link.", details: linkData }, { status: 500 });
    }
    
    const downloadLink = linkData.url.replace("?dl=0", "?dl=1");

    return NextResponse.json({
      success: true,
      fileName: file.name,
      downloadLink,
    });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { error: "Upload failed", details: error.message },
      { status: 500 }
    );
  }
}
