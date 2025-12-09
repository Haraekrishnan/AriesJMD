
const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "/tmp" });

app.post("/convert", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  
  const xlsxPath = req.file.path;
  const outDir = path.dirname(xlsxPath);
  
  // Note: LibreOffice saves the PDF in the same directory as the source file.
  const pdfPath = xlsxPath.replace(/\.[^.]+$/, ".pdf");

  exec(
    `libreoffice --headless --convert-to pdf "${xlsxPath}" --outdir "${outDir}"`,
    (err, stdout, stderr) => {
      if (err) {
        console.error("Conversion Error:", err);
        console.error("Stderr:", stderr);
        fs.unlinkSync(xlsxPath); // Clean up original file
        return res.status(500).send("Conversion failed");
      }

      fs.readFile(pdfPath, (readErr, pdfBuffer) => {
        // Cleanup both files
        fs.unlinkSync(xlsxPath);
        fs.unlinkSync(pdfPath);

        if (readErr) {
          console.error("Read Error:", readErr);
          return res.status(500).send("Failed to read converted PDF");
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=result.pdf");
        res.send(pdfBuffer);
      });
    }
  );
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Converter running on port ${port}`));
