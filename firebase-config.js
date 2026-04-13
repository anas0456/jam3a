// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgE14RWMQCM3upbBSb7uPmsMMWmRgQy0U",
  authDomain: "jam3a-cd444.firebaseapp.com",
  projectId: "jam3a-cd444",
  storageBucket: "jam3a-cd444.firebasestorage.app",
  messagingSenderId: "638205627287",
  appId: "1:638205627287:web:4119ac227e126c2eff12d2",
  measurementId: "G-KM2F99HJJ9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();
const storage = firebase.storage();

// Add FieldValue to firebase for convenience
const FieldValue = firebase.firestore.FieldValue;

// Admin credentials (hidden - developer only)
const ADMIN_CREDENTIALS = {
  username: 'anas',
  password: '0456'
};

// Check if user is admin
function isAdminUser() {
  const adminData = localStorage.getItem('adminLoggedIn');
  return adminData === 'true';
}

// Get current admin ID
function getCurrentAdminId() {
  return localStorage.getItem('adminId');
}

// Set admin status
function setAdminStatus(status, adminId = null, adminName = null) {
    localStorage.setItem('adminLoggedIn', status);
    if (adminId) {
        localStorage.setItem('adminId', adminId);
    } else {
        localStorage.removeItem('adminId');
    }
    if (adminName) {
        localStorage.setItem('adminName', adminName);
    }
}

// Clear auth data
function clearAuthData() {
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminId');
  localStorage.removeItem('adminName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
}