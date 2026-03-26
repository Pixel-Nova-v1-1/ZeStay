const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- CONFIGURATION ---
// 1. Go to Firebase Console -> Project Settings -> Service Accounts
// 2. Click "Generate new private key"
// 3. Save the file as "serviceAccountKey.json" in this "backend" folder
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
    console.error("WARNING: Firebase Admin SDK could not be initialized.");
    console.error("Missing 'serviceAccountKey.json'. Please download it from Firebase Console and place it in the 'backend' folder.");
}

// --- ROUTES ---

// Delete User Endpoint
app.post('/delete-user', async (req, res) => {
    // Security measure: Extract and verify ID token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
    }
    const idToken = authHeader.split('Bearer ')[1];

    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    // Security measure: Check if caller is an Admin
    try {
        const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data().isAdmin !== true) {
            return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
        }
    } catch (e) {
        return res.status(500).json({ success: false, error: 'Error verifying admin status' });
    }

    const { uid } = req.body;

    if (!uid) {
        return res.status(400).json({ success: false, error: 'UID is required' });
    }

    try {
        // Delete from Firebase Authentication
        await admin.auth().deleteUser(uid);
        console.log(`Successfully deleted user ${uid} from Authentication.`);
        res.json({ success: true, message: 'User deleted from Authentication' });
    } catch (error) {
        console.error('Error deleting user from Auth:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
