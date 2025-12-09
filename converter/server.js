const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.options("*", cors());

const storage = multer.diskStorage({
  destination: "/tmp",
  filename: (_, file, cb) => {
    cb(null, Date.now() + ".xlsx");
  }
});
const upload = multer({ storage });

app.post("/convert", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  
  const xlsxPath = req.file.path;
  const outDir = "/tmp";
  const pdfPath = xlsxPath.replace(".xlsx", ".pdf");

  exec(
    `libreoffice --headless --convert-to pdf --outdir "${outDir}" "${xlsxPath}"`,
    (err, stdout, stderr) => {
      if (err) {
        console.error("LibreOffice Error:", stderr);
        // Clean up original file
        if (fs.existsSync(xlsxPath)) {
            fs.unlinkSync(xlsxPath);
        }
        return res.status(500).send("Conversion failed. Check service logs.");
      }

      fs.readFile(pdfPath, (readErr, pdfBuffer) => {
        // Cleanup both files
        if (fs.existsSync(xlsxPath)) {
            fs.unlinkSync(xlsxPath);
        }
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }

        if (readErr) {
          console.error("PDF Read Error:", readErr);
          return res.status(500).send("Failed to read PDF");
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
