import admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    firebaseApp = admin.apps[0] as admin.app.App;
    console.log('Using existing Firebase Admin app');
    return firebaseApp;
  }

  if (firebaseApp) {
    return firebaseApp;
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is required');
  }

  try {
    const serviceAccountJSON = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 
      'base64'
    ).toString('utf-8');
    
    const serviceAccount = JSON.parse(serviceAccountJSON);
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    console.log('Firebase Admin initialized successfully');
    return firebaseApp;
    
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw new Error('Failed to initialize Firebase Admin');
  }
}

export function getFirestore(): admin.firestore.Firestore {
  const app = initializeFirebaseAdmin();
  return app.firestore();
}

export function getContentId(): string {
  return process.env.CONTENT_ID || 'twin-peaks-complete';
}