const admin = require('firebase-admin');

// Import service account key (you'll need to create this file)
let serviceAccount;
try {
  serviceAccount = require('./firebase-service-account.json');
} catch (error) {
  console.warn('Firebase service account key not found. Please create config/firebase-service-account.json');
  console.warn('Get the key from Firebase Console > Project Settings > Service Accounts');
}

// Initialize Firebase Admin SDK
if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // projectId: process.env.FIREBASE_PROJECT_ID, // optional if specified in service account
  });

  console.log('Firebase Admin SDK initialized successfully');
} else {
  console.warn('Firebase Admin SDK not initialized - service account key missing');
}

module.exports = admin;
