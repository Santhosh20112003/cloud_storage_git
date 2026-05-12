import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import {getStorage} from 'firebase/storage'; // Storage is now handled by Cloudinary

const firebaseConfig = {
  apiKey: "AIzaSyCx4-M3Rg8rJrBIEo0C75nWRXT6VCM2EZc",
  authDomain: "cloud-drive-2026.firebaseapp.com",
  projectId: "cloud-drive-2026",
  storageBucket: "cloud-drive-2026.firebasestorage.app",
  messagingSenderId: "726349767831",
  appId: "1:726349767831:web:1c637baaac59c0a0a8f5d2"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Only export auth, not storage
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;