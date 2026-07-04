// firebase-config.js - Centralized Firebase configuration and initialization
// This module provides Firebase app and services for use across the app

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiGu_MgQHw-WUztSk4tc4-7hEbJYBlGCo",
  authDomain: "asep-d4d9d.firebaseapp.com",
  projectId: "asep-d4d9d",
  storageBucket: "asep-d4d9d.firebasestorage.app",
  messagingSenderId: "723830083554",
  appId: "1:723830083554:web:cc58aeb092e6cf8f5cf3bb",
  measurementId: "G-CZ39CFGGMJ",
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export for use in other modules
export { auth, db };