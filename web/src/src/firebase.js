import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC9rJFZzq4c8bkLwnT_zQEGjxNevMN6MkM",
  authDomain: "healthcare-monitor-app.firebaseapp.com",
  databaseURL: "https://healthcare-monitor-app-default-rtdb.firebaseio.com",
  projectId: "healthcare-monitor-app",
  storageBucket: "healthcare-monitor-app.firebasestorage.app",
  messagingSenderId: "441950295241",
  appId: "1:441950295241:web:c235a977be46c0f7056918",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
