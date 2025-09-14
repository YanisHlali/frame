import fs from "fs";
import path from "path";
import axios from "axios";
import { driveService } from "../config/googleDrive";
import { getFolderIds, getIndexFolder, getLastIndex } from "./contentDetector";

export async function downloadImage(
  fileId: string,
  filename: string
): Promise<string | null> {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
    });

    const filePath =
      process.env.NODE_ENV === "production"
        ? `/tmp/${filename}`
        : path.join(process.cwd(), "public", filename);

    fs.writeFileSync(filePath, Buffer.from(response.data));
    return filePath;
  } catch (error) {
    console.error("Download failed:", error);
    return null;
  }
}

export async function getFolderId(): Promise<string> {
  const folderIds = await getFolderIds();
  const indexFolder = await getIndexFolder();
  const folderId = folderIds[indexFolder];

  if (!folderId) {
    throw new Error(`No folder found at index ${indexFolder}`);
  }

  return folderId;
}

export async function getNextFrameFile(): Promise<{
  id: string;
  name: string;
}> {
  const folderIds = await getFolderIds();
  const indexFolder = await getIndexFolder();
  const folderId = folderIds[indexFolder];
  const lastIndex = await getLastIndex();

  if (!folderId) {
    throw new Error(`No folder found at index ${indexFolder}`);
  }

  const absoluteFrameIndex = indexFolder * 100 + lastIndex + 1;
  const paddedFrame = absoluteFrameIndex.toString().padStart(4, "0");
  const filename = `frame_${paddedFrame}.png`;

  console.log(
    `Searching for file ${filename} in folder ${folderId}`
  );

  const res = await driveService.files.list({
    q: `'${folderId}' in parents and name='${filename}' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 1,
  });

  const file = res.data.files?.[0];

  if (!file?.id || !file?.name) {
    throw new Error(`File ${filename} not found.`);
  }

  return { id: file.id, name: file.name };
}