import { initializeApp } from '@firebase/app';
import { getStorage, ref, uploadString, getDownloadURL } from '@firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';

// Your web app's Firebase configuration
// IMPORTANT: Please fill in your actual apiKey and appId below.
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Debug log to ensure variables are loaded (only in development)
if (__DEV__ && !firebaseConfig.apiKey) {
    console.warn("Firebase API Key is missing! Ensure your .env file has EXPO_PUBLIC_FIREBASE_API_KEY and restart your Expo server with 'npx expo start -c'");
}



const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export const uploadReportToFirebase = async (localUri, fileName) => {
    try {
        console.log(`Starting Firebase upload for ${fileName}...`);

        const isPdf = fileName.toLowerCase().endsWith('.pdf');
        const contentType = isPdf ? 'application/pdf' : 'image/jpeg';

        // Use Firebase Storage REST API to completely bypass the buggy SDK blobbing issue on Android
        const bucket = firebaseConfig.storageBucket;
        const uploadPath = `reports/${fileName}`;
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(uploadPath)}`;

        // Read local file as a blob
        const response = await fetch(localUri);
        const blob = await response.blob();

        const uploadRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
            },
            body: blob
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error(`Firebase REST Error: ${uploadRes.status} ${errText}`);
        }

        const data = await uploadRes.json();
        const token = data.downloadTokens;

        if (!token) {
            throw new Error('Upload succeeded but no download token was returned.');
        }

        const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(uploadPath)}?alt=media&token=${token}`;
        console.log(`Upload complete! Remote URL:`, downloadURL);

        return downloadURL;
    } catch (error) {
        console.error('Firebase Storage Base64 Upload Error:', error);
        throw error;
    }
};
