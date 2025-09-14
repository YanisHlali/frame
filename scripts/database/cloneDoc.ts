import { firestore } from "../../src/config/firebase"

export async function cloneDoc(fromPath: string, toPath: string) {
  console.log(`Copied: ${fromPath} → ${toPath}`);
  const fromRef = firestore.doc(fromPath);
  const toRef = firestore.doc(toPath);

  const snapshot = await fromRef.get();

  if (!snapshot.exists) {
    throw new Error(`Document ${fromPath} does not exist`);
  }

  const data = snapshot.data();
  if (!data) {
    throw new Error(`No data in ${fromPath}`);
  }

  await toRef.set(data);
  console.log(`Copied: ${fromPath} → ${toPath}`);

  const subcollections = await fromRef.listCollections();

  for (const subcol of subcollections) {
    const docs = await subcol.get();
    for (const doc of docs.docs) {
      const subFromPath = `${fromPath}/${subcol.id}/${doc.id}`;
      const subToPath = `${toPath}/${subcol.id}/${doc.id}`;
      await cloneDoc(subFromPath, subToPath);
    }
  }
  console.log("Cloning completed.");
}
