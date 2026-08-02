// ============================================
// Firebase Configuration
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyCuGKOiRrInAb-dElrElje639wIwHjkmhY",
    authDomain: "sarang-wallet-e5faa.firebaseapp.com",
    projectId: "sarang-wallet-e5faa",
    storageBucket: "sarang-wallet-e5faa.firebasestorage.app",
    messagingSenderId: "197608432834",
    appId: "1:197608432834:web:d70c591997e8080a5b875b",
    measurementId: "G-RL939GX7JQ"
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
