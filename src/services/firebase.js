// Mocked Firebase Service Layer
// In a real production deployment, you would replace this with actual Firebase imports
// e.g. import { initializeApp } from "firebase/app";

export const firebaseConfig = {
  apiKey: "MOCK_API_KEY",
  authDomain: "nexuspay.firebaseapp.mock",
  projectId: "nexuspay",
  storageBucket: "nexuspay.appspot.mock",
  messagingSenderId: "123456789",
  appId: "1:12345:web:mock123"
};

// Mock authentication logic
export const mockFirebaseAuth = async (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email === 'admin@nexuspay.com' && password === 'admin') {
        resolve({ id: 'admin1', name: 'Super Admin', role: 'admin', email });
      } else if (email === 'emp@nexuspay.com' && password === 'emp') {
        resolve({ id: 'emp1', name: 'John Employee', role: 'employee', email });
      } else {
        reject(new Error("Invalid credentials"));
      }
    }, 800);
  });
};
