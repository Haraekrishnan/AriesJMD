import * as functions from "firebase-functions";
import * as cors from "cors";
import Busboy from "busboy";
import B2 from "backblaze-b2";
import {v4 as uuidv4} from "uuid";

const corsHandler = cors({origin: true});

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID as string,
  applicationKey: process.env.B2_APP_KEY as string,
});

export const uploadDamageReport = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        await b2.authorize();

        const busboy = new Busboy({ headers: req.headers });
        let uploadResult: B2.UploadFileResponse | null = null;

        busboy.on("file", async (_field, file, info) => {
          const {filename, mimeType} = info;

          const uploadUrl = await b2.getUploadUrl({
            bucketId: process.env.B2_BUCKET_ID as string,
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
            res.status(400).json({success: false});
            return;
          }

          const fileUrl = `${process.env.B2_PUBLIC_URL}/file/${process.env.B2_BUCKET}/${uploadResult.data.fileName}`;

          res.json({
            success: true,
            url: fileUrl,
            fileName: uploadResult.data.fileName,
          });
        });

        req.pipe(busboy);
      } catch (err: unknown) {
        console.error(err);
        res.status(500).json({error: "Upload failed"});
      }
    });
  }
);
