import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64!,
        "base64"
      ).toString("utf-8")
    );

    const auth = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    // 🔹 Create folder
    const folder = await drive.files.create({
      requestBody: {
        name: "DamageReports",
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id, name, webViewLink",
    });

    return NextResponse.json({
      success: true,
      folder: folder.data,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
