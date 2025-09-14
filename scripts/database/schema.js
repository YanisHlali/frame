const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = require("../../config/secrets/service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function analyzeValue(value, depth = 0) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "array (empty)";
    const itemTypes = [...new Set(value.map(item => analyzeValue(item, depth + 1)))];
    return `array<${itemTypes.join(' | ')}>`;
  }
  if (typeof value === 'object') {
    if (depth > 4) return "object (deep)";
    const objSchema = {};
    for (const [key, val] of Object.entries(value)) {
      objSchema[key] = analyzeValue(val, depth + 1);
    }
    return objSchema;
  }
  return typeof value;
}

async function scanCollection(ref, collectionName = '') {
  try {
    console.log(`Scanning collection: ${collectionName}`);
    const snapshot = await ref.get();
    console.log(`Found ${snapshot.docs.length} documents in ${collectionName}`);
    
    const schema = {};
    const documentExamples = {};

    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`Processing document ${doc.id} with ${Object.keys(data).length} fields`);

      if (Object.keys(documentExamples).length < 3) {
        documentExamples[doc.id] = {};
      }

      for (const key in data) {
        const analyzedType = analyzeValue(data[key]);
        
        if (!schema[key]) {
          schema[key] = analyzedType;
        } else if (JSON.stringify(schema[key]) !== JSON.stringify(analyzedType)) {
          schema[key] = "mixed";
        }

        if (documentExamples[doc.id]) {
          documentExamples[doc.id][key] = analyzedType;
        }
      }

      const subCollections = await doc.ref.listCollections();
      if (subCollections.length > 0) {
        console.log(`Found ${subCollections.length} subcollections in document ${doc.id}`);
        for (const subCol of subCollections) {
          const subCollectionSchema = await scanCollection(subCol, `${collectionName}/${doc.id}/${subCol.id}`);
          if (!schema._subCollections) schema._subCollections = {};
          schema._subCollections[subCol.id] = subCollectionSchema;
        }
      }
    }

    schema._documentExamples = documentExamples;
    
    return schema;
  } catch (error) {
    console.error(`Error scanning collection ${collectionName}:`, error);
    return {};
  }
}

async function main() {
  try {
    const possibleNames = [
      "content",
      "twin-peaks-complete",
      "twin_peaks_complete", 
      "twinPeaksComplete",
      "episodes",
      "frames",
      "data"
    ];
    
    console.log("Testing possible collection names...");
    
    for (const collectionName of possibleNames) {
      try {
        const testRef = db.collection(collectionName);
        const testSnapshot = await testRef.limit(1).get();
        console.log(`Collection "${collectionName}": ${testSnapshot.docs.length > 0 ? 'HAS DATA' : 'empty'}`);
        
        if (testSnapshot.docs.length > 0) {
          console.log(`Found data in "${collectionName}"! Using this collection.`);
          const schema = await scanCollection(testRef, collectionName);
          
          const fullSchema = {
            [collectionName]: schema
          };

          fs.writeFileSync("schema.json", JSON.stringify(fullSchema, null, 2));
          console.log("Schéma généré : schema.json");
          return;
        }
      } catch (err) {
        console.log(`Collection "${collectionName}": error - ${err.message}`);
      }
    }
    
    console.log("No collections found with data. Proceeding with original name...");
    const targetCollection = "twin-peaks-complete";
    const collectionRef = db.collection(targetCollection);
    const schema = await scanCollection(collectionRef, targetCollection);
    
    const fullSchema = {
      [targetCollection]: schema
    };

    fs.writeFileSync("schema.json", JSON.stringify(fullSchema, null, 2));
    console.log("Schéma généré : schema.json");
  } catch (error) {
    console.error("Error in main function:", error);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);
