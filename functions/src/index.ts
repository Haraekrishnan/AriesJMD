
import * as functions from "firebase-functions";
import * as cors from "cors";
import Busboy from "busboy";
import B2 from "backblaze-b2";
import {v4 as uuidv4} from "uuid";

const corsHandler = cors({origin: true});

export const uploadDamageReport = functions.https.onRequest(
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      try {
        const b2 = new B2({
            applicationKeyId: functions.config().b2.key_id,
            applicationKey: functions.config().b2.app_key,
        });
        await b2.authorize();

        const busboy = Busboy({ headers: req.headers });
        let uploadResult: any = null;

        busboy.on("file", async (_, file, info) => {
          const { filename, mimeType } = info;

          const uploadUrlResponse = await b2.getUploadUrl({
            bucketId: functions.config().b2.bucket_id,
          });

          const safeFileName = `damage-reports/${uuidv4()}-${filename}`;

          try {
            uploadResult = await b2.uploadFile({
                uploadUrl: uploadUrlResponse.data.uploadUrl,
                uploadAuthToken: uploadUrlResponse.data.authorizationToken,
                fileName: safeFileName,
                mimeType,
                data: file,
            });
          } catch(uploadError) {
              console.error("B2 Upload Error:", uploadError);
              // Important: End the response on upload error
              if (!res.headersSent) {
                res.status(500).json({ success: false, error: "File upload to storage failed." });
              }
          }
        });

        busboy.on("finish", () => {
          if (!uploadResult || !uploadResult.data) {
            // Important: End the response if finish is called before upload completes or on error
            if (!res.headersSent) {
              res.status(400).json({ success: false, error: "Upload finished without a result." });
            }
            return;
          }
          const publicUrl = `${functions.config().b2.public_url}/file/${functions.config().b2.bucket}/${uploadResult.data.fileName}`;
          
          // Important: Send success response
          res.status(200).json({
            success: true,
            url: publicUrl,
            fileName: uploadResult.data.fileName,
          });
        });

        busboy.on("error", (err: any) => {
            console.error("Busboy Error:", err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: "Error parsing the form data."});
            }
        });
        
        req.pipe(busboy);
        
      } catch (err: any) {
        console.error("Authorization or setup error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
      }
    });
  }
);
