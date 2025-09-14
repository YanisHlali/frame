require("dotenv").config();
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");

const serviceAccountJSON = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
const serviceAccount = JSON.parse(serviceAccountJSON);

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();

async function exportDocumentRecursively(docRef) {
  const docSnap = await docRef.get();
  const data = docSnap.exists ? docSnap.data() : {};

  const result = { ...data };

  const subcollections = await docRef.listCollections();
  for (const sub of subcollections) {
    const subDocs = await sub.listDocuments();
    result[sub.id] = {};

    for (const subDocRef of subDocs) {
      result[sub.id][subDocRef.id] = await exportDocumentRecursively(subDocRef);
    }
  }

  return result;
}

(async () => {
  const contentId = process.env.CONTENT_ID;
  const docRef = db.doc(`content/${contentId}`);

  console.log(`Exporting content/${contentId} in progress...`);
  const fullData = await exportDocumentRecursively(docRef);

  fs.writeFileSync("content_export.json", JSON.stringify(fullData, null, 2));
  console.log("Export completed to content_export.json");
})();
