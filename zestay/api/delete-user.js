import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (getApps().length === 0) {
            // We expect the service account JSON to be in an environment variable
            if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
                throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
            }
            
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            
            initializeApp({
                credential: cert(serviceAccount)
            });
        }

        // Security measure: Extract and verify ID token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
        }
        
        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (e) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
        }

        // Security measure: Check if caller is an Admin
        try {
            const userDoc = await getFirestore().collection('users').doc(decodedToken.uid).get();
            if (!userDoc.exists || userDoc.data().isAdmin !== true) {
                return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
            }
        } catch (e) {
            console.error('Error verifying admin status:', e);
            return res.status(500).json({ success: false, error: 'Error verifying admin status' });
        }

        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({ success: false, error: 'UID is required' });
        }

        await getAuth().deleteUser(uid);
        return res.status(200).json({ success: true, message: 'User deleted successfully' });

    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
