
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
if (!credentialsBase64) throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_BASE64 in .env');
const credentials = JSON.parse(Buffer.from(credentialsBase64, 'base64').toString('utf-8'));
const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
const driveService = google.drive({ version: 'v3', auth });


async function createDriveFolder(name, parentId) {
    const fileMetadata = { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined };
    const res = await driveService.files.create({ resource: fileMetadata, fields: 'id' });
    return res.data.id;
}


async function uploadFileToDrive(filePath, driveFolderId) {
    const fileName = path.basename(filePath);
    const fileMetadata = { name: fileName, parents: [driveFolderId] };
    const media = { body: fs.createReadStream(filePath) };
    const res = await driveService.files.create({ resource: fileMetadata, media, fields: 'id' });
    return res.data.id;
}


async function uploadFolder(localFolderPath, driveParentId) {
    const folderName = path.basename(localFolderPath);
    const driveFolderId = await createDriveFolder(folderName, driveParentId);
    console.log(`Created folder '${folderName}' on Drive (id: ${driveFolderId})`);
    const files = fs.readdirSync(localFolderPath);
    for (const file of files) {
        const fullPath = path.join(localFolderPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
            const fileId = await uploadFileToDrive(fullPath, driveFolderId);
            console.log(`Uploaded file: ${file} (id: ${fileId})`);
        } else if (stat.isDirectory()) {
            await uploadFolder(fullPath, driveFolderId);
        }
    }
    return driveFolderId;
}


async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) process.exit(1);
    const localFolderPath = args[0];
    const driveParentId = args[1];
    if (!fs.existsSync(localFolderPath) || !fs.statSync(localFolderPath).isDirectory()) process.exit(1);
    try {
        const driveFolderId = await uploadFolder(localFolderPath, driveParentId);
        console.log(`Upload complete. Drive folder id: ${driveFolderId}`);
    } catch (err) {
        console.error('Upload failed:', err);
    }
}

if (require.main === module) main();
