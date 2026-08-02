// ============================================
// Firebase Configuration
// ============================================
// GANTI dengan config Firebase kamu!
// Cara: Firebase Console → Project Settings → Web App → Copy config

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Auto-email domain (user daftar pakai username, email auto-generated)
const EMAIL_DOMAIN = "sarangwallet.app";

// Generate email from username
function generateEmail(username) {
    return `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@${EMAIL_DOMAIN}`;
}

// Format currency
function formatRupiah(number) {
    return 'Rp ' + Number(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseRupiah(str) {
    return parseInt(str.replace(/[^0-9]/g, '')) || 0;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
