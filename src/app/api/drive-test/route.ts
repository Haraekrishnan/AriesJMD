import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

export async function GET() {
  try {
    const serviceAccount = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON!
    );

    const auth = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    const content = Buffer.from(
      `Drive test successful at ${new Date().toISOString()}`
    );

    const file = await drive.files.create({
      requestBody: {
        name: "drive-test.txt",
        parents: [process.env.DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: "text/plain",
        body: Readable.from(content),
      },
      fields: "id, name, webViewLink",
    });

    return NextResponse.json({
      success: true,
      file: file.data,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
