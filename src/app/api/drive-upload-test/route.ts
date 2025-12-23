import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

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

    const file = await drive.files.create({
      requestBody: {
        name: "proof.txt",
        parents: [process.env.DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: "text/plain",
        body: Readable.from("Service account upload SUCCESS"),
      },
      fields: "id, name, parents",
    });

    return NextResponse.json({
      success: true,
      file,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
