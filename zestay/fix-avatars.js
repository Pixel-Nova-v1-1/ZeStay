import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./backend/serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkImage(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return false;
    }
    
    try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (response.ok) {
            return true;
        }
        
        // Some servers reject HEAD, fallback to GET
        const getResponse = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
        return getResponse.ok;
    } catch (e) {
        return false;
    }
}

async function fixAvatars() {
    console.log("Starting avatar fix process...");
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        
        let checked = 0;
        let fixed = 0;

        for (const doc of snapshot.docs) {
            const userData = doc.data();
            const currentUrl = userData.photoUrl;
            
            const isValid = await checkImage(currentUrl);
            
            if (!isValid) {
                const newAvatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${userData.name || doc.id}`;
                console.log(`Fixing broken avatar for user ${doc.id} (${userData.name}): ${currentUrl} -> ${newAvatar}`);
                
                await doc.ref.update({
                    photoUrl: newAvatar,
                    profileOption: 'default',
                    storagePath: null // In case it was a broken storage image, we clear the path
                });
                
                // Note: This script only updates 'users' collection. 
                // To be fully perfectly synced, it should technically query all chats and update 'userInfo.uid.avatar'. 
                // However, that might be overkill for this quick fix unless the user complains. Will add a basic chat sync as well.
                const chatsQuery = await db.collection('chats').where('participants', 'array-contains', doc.id).get();
                if (!chatsQuery.empty) {
                    const batch = db.batch();
                    chatsQuery.docs.forEach(chatDoc => {
                        const chatUpdate = {};
                        chatUpdate[`userInfo.${doc.id}.avatar`] = newAvatar;
                        batch.update(chatDoc.ref, chatUpdate);
                    });
                    await batch.commit();
                }

                fixed++;
            }
            checked++;
            if (checked % 10 === 0) console.log(`Checked ${checked}/${snapshot.size} users`);
        }
        
        console.log(`\nFinished! Checked ${checked} users, fixed ${fixed} broken avatars.`);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

fixAvatars();
