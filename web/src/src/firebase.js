// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC9rJFZzq4c8bkLwnT_zQEGjxNevMN6MkM",
  authDomain: "healthcare-monitor-app.firebaseapp.com",
  databaseURL: "https://healthcare-monitor-app-default-rtdb.firebaseio.com",
  projectId: "healthcare-monitor-app",
  storageBucket: "healthcare-monitor-app.firebasestorage.app",
  messagingSenderId: "441950295241",
  appId: "1:441950295241:web:c235a977be46c0f7056918",
  measurementId: "G-F3R5X37F1M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);