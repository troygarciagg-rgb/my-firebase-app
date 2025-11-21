import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyApgzdh52wl6AXW22dfHQS4XU_RmwJElwc",
  authDomain: "my-firebase-app-e4e7f.firebaseapp.com",
  projectId: "my-firebase-app-e4e7f",
  storageBucket: "my-firebase-app-e4e7f.firebasestorage.app",
  messagingSenderId: "353466258604",
  appId: "1:353466258604:web:270ae1d6a6a24b502abb09",
  measurementId: "G-692JCR5MG8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

export default app;

