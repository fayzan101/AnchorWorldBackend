import admin from 'firebase-admin';
import { config } from './environment';
import path from 'path';

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): void => {
  try {
    // Check if Firebase is already initialized
    if (firebaseApp) {
      return;
    }

    // Path to your Firebase service account JSON file
    const serviceAccountPath = path.join(
      process.cwd(),
      config.firebase.serviceAccountPath
    );

    const serviceAccount = require(serviceAccountPath);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    // Don't exit process, just log the error
    // Notifications will be disabled but app will continue
  }
};

export const getFirebaseApp = (): admin.app.App | null => {
  return firebaseApp;
};

export const getMessaging = (): admin.messaging.Messaging | null => {
  if (!firebaseApp) {
    console.warn('⚠️ Firebase not initialized');
    return null;
  }
  return admin.messaging();
};

export default { initializeFirebase, getFirebaseApp, getMessaging };