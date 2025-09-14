import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

const credentialsJson = JSON.parse(
  Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64!, "base64").toString("utf-8")
);

const auth = new google.auth.GoogleAuth({
  credentials: credentialsJson,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

export const driveService: drive_v3.Drive = google.drive({
  version: "v3",
  auth,
});
