import * as functions from "firebase-functions";
import * as cors from "cors";
import Busboy from "busboy";
import B2 from "backblaze-b2";
import { v4 as uuidv4 } from "uuid";

const corsHandler = cors({ origin: true });

const b2 = new B2({
  applicationKeyId: functions.config().b2.key_id,
  applicationKey: functions.config().b2.app_key,
});

export const uploadDamageReport = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      try {
        await b2.authorize();

        const busboy = Busboy({ headers: req.headers });
        let uploadResult: any = null;

        busboy.on("file", async (_, file, info) => {
          const { filename, mimeType } = info;

          const uploadUrl = await b2.getUploadUrl({
            bucketId: functions.config().b2.bucket_id,
          });

          const fileName = `damage-reports/${uuidv4()}-${filename}`;

          uploadResult = await b2.uploadFile({
            uploadUrl: uploadUrl.data.uploadUrl,
            uploadAuthToken: uploadUrl.data.authorizationToken,
            fileName,
            mimeType,
            data: file,
          });
        });

        busboy.on("finish", () => {
          if (!uploadResult) {
            return res.status(400).json({ success: false });
          }

          const fileUrl = `${functions.config().b2.public_url}/file/${functions.config().b2.bucket}/${uploadResult.data.fileName}`;

          return res.json({
            success: true,
            url: fileUrl,
            fileName: uploadResult.data.fileName,
          });
        });

        req.pipe(busboy);
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    });
  }
);
