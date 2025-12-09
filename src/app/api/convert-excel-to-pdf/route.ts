import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use a temporary directory like /tmp which is available in most server environments
    const tempXlsx = `/tmp/${Date.now()}.xlsx`;
    const tempPdfDir = "/tmp";

    // Save Excel file to the temporary directory
    await writeFile(tempXlsx, buffer);

    // Convert to PDF using LibreOffice
    // The command specifies the output directory for the PDF
    await execAsync(
      `libreoffice --headless --convert-to pdf "${tempXlsx}" --outdir ${tempPdfDir}`
    );

    // Construct the path to the generated PDF
    const tempPdfPath = tempXlsx.replace(".xlsx", ".pdf");

    // Read the generated PDF
    const pdfBuffer = await readFile(tempPdfPath);

    // Cleanup temporary files
    await unlink(tempXlsx);
    await unlink(tempPdfPath);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="TP_Certification_List.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF Conversion Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
