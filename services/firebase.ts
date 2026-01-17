
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDnMwiTNhuMS_paQep56SRxCIkHv7ZoYmo",
  authDomain: "lllumina.firebaseapp.com",
  projectId: "lllumina",
  storageBucket: "lllumina.firebasestorage.app",
  messagingSenderId: "149174803806",
  appId: "1:149174803806:web:5a43e6c2f4af50a42103cf",
  measurementId: "G-K92CK4R22N"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Critical: Enable offline persistence for seamless usage
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
        console.warn('Persistence failed: Browser not supported.');
    }
});

export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();
