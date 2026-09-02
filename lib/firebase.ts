import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyDE2yD9q3GByyAVAagRApd2Fe5G68j1C38',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'financas-gui-fer.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'financas-gui-fer',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    'financas-gui-fer.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '190526101139',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    '1:190526101139:web:aeee4fe5580bedf2301f66',
};

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
