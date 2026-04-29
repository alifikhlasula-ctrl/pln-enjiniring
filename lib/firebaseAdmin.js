import admin from 'firebase-admin';

// Format private key properly to handle escaped newlines in env variables
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('✅ Firebase Admin SDK initialized successfully.');
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    }
  } else {
    const missing = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    
    console.warn(`⚠️ Firebase Admin SDK skipped initialization. Missing: ${missing.join(', ')}`);
  }
}

export const messagingAdmin = admin.apps.length ? admin.messaging() : null;
