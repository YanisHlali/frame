import "dotenv/config";
import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is required");
}

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestore = admin.firestore();
export type Firestore = admin.firestore.Firestore;
export type DocumentReference<T = FirebaseFirestore.DocumentData> =
  FirebaseFirestore.DocumentReference<T>;
export type DocumentSnapshot<T = FirebaseFirestore.DocumentData> =
  FirebaseFirestore.DocumentSnapshot<T>;
export type CollectionReference<T = FirebaseFirestore.DocumentData> =
  FirebaseFirestore.CollectionReference<T>;

export { admin };