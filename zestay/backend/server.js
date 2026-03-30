const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Rate limiting for Chat API: 10 requests per minute per IP
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: { success: false, error: "Z is tired and will answer your questions later." }
});

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

// Chat API Endpoint
app.post('/api/chat', chatLimiter, async (req, res) => {
    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    try {
        let result;
        if (systemInstruction) {
            // Use system instruction if provided
            const modelWithSystem = genAI.getGenerativeModel({ 
                model: "gemini-flash-latest",
                systemInstruction: systemInstruction 
            });
            result = await modelWithSystem.generateContent(prompt);
        } else {
            result = await model.generateContent(prompt);
        }
        
        const response = await result.response;
        const text = response.text();

        res.json({ success: true, response: text });
    } catch (error) {
        console.error('Error calling Gemini:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete User Endpoint
app.post('/delete-user', async (req, res) => {
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
