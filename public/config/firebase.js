// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);