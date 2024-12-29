importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: 'process.env.VITE_FIREBASE_API_KEY',
    authDomain: 'process.env.VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'process.env.VITE_FIREBASE_PROJECT_ID',
    storageBucket: 'process.env.VITE_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'process.env.VITE_FIREBASE_APP_ID',
};

firebase.initializeApp(firebaseConfig);
try {
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message', payload);
        const { title, body, icon } = payload.notification;
        self.registration.showNotification(title, { body, icon });
    });
} catch (error) {
    console.error('Firebase messaging is not supported in this browser in sw');
}
