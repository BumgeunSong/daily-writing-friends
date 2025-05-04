importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: 'AIzaSyC_tJDlVtclbporH2LaBOGEtnf-W0swZTY',
    authDomain: 'dailywritingfriends.com',
    projectId: 'artico-app-4f9d4',
    storageBucket: 'artico-app-4f9d4.firebasestorage.app',
    messagingSenderId: '710428954454',
    appId: '1:710428954454:web:849a684a92a5fb22ea90f7',
};

firebase.initializeApp(firebaseConfig);

try {
    const messaging = firebase.messaging();
    console.log('[firebase-messaging-sw.js] FCM messaging initialized');
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message', payload);
        if (payload && payload.notification) {
            const { title, body, icon } = payload.notification;
            console.log('[firebase-messaging-sw.js] Showing notification:', { title, body, icon });
            self.registration.showNotification(title, { body, icon });
        } else {
            console.warn('[firebase-messaging-sw.js] No notification payload found:', payload);
        }
    });
} catch (error) {
    console.error('[firebase-messaging-sw.js] Error initializing FCM messaging:', error);
}