import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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
