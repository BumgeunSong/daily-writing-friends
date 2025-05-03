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
if (typeof window !== "undefined" && typeof window.navigator !== "undefined") {
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
}