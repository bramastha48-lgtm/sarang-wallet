// ============================================
// Authentication Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Already logged in, redirect to app
            window.location.href = 'app.html';
        }
    });
});

// Show/hide forms
function showForm(formId) {
    document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
    document.getElementById(formId).style.display = 'block';
    clearErrors();
}

function clearErrors() {
    document.querySelectorAll('.auth-error, .auth-success').forEach(el => {
        el.classList.remove('show');
        el.textContent = '';
    });
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.add('show');
}

function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.add('show');
}

function setLoading(btnTextId, spinnerId, loading) {
    const text = document.getElementById(btnTextId);
    const spinner = document.getElementById(spinnerId);
    if (loading) {
        text.style.display = 'none';
        spinner.style.display = 'block';
    } else {
        text.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

// Toggle password visibility
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Validate username
function isValidUsername(username) {
    return /^[a-z0-9]{4,20}$/.test(username);
}

// ============================================
// REGISTER
// ============================================
async function registerUser() {
    clearErrors();
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const name = document.getElementById('regName').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    // Validation
    if (!username) return showError('regError', 'Username wajib diisi');
    if (!isValidUsername(username)) return showError('regError', 'Username hanya huruf kecil dan angka, 4-20 karakter');
    if (!name) return showError('regError', 'Nama lengkap wajib diisi');
    if (password.length < 6) return showError('regError', 'Password minimal 6 karakter');
    if (password !== confirm) return showError('regError', 'Password tidak cocok');

    setLoading('regBtnText', 'regSpinner', true);

    try {
        const email = generateEmail(username);

        // Step 1: Create user in Firebase Auth FIRST
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Step 2: Update display name
        await user.updateProfile({ displayName: name });

        // Step 3: Now user is authenticated, save to Firestore
        try {
            await db.collection('users').doc(user.uid).set({
                username: username,
                name: name,
                email: email,
                currency: 'IDR',
                createdAt: new Date().toISOString()
            });
            console.log('User data saved to Firestore');
        } catch (firestoreErr) {
            console.warn('Firestore write failed (non-critical):', firestoreErr.message);
        }

        // Step 4: Try to reserve username (non-critical)
        try {
            await db.collection('usernames').doc(username).set({
                uid: user.uid
            });
        } catch (e) {
            console.warn('Username reservation failed (non-critical):', e.message);
        }

        showSuccess('regSuccess', 'Akun berhasil dibuat! Mengalihkan...');
        setTimeout(() => window.location.href = 'app.html', 1500);

    } catch (error) {
        setLoading('regBtnText', 'regSpinner', false);
        let msg = 'Terjadi kesalahan';
        if (error.code === 'auth/email-already-in-use') msg = 'Username sudah digunakan';
        else if (error.code === 'auth/weak-password') msg = 'Password terlalu lemah';
        else if (error.code === 'auth/invalid-email') msg = 'Username tidak valid';
        else msg = error.message;
        showError('regError', msg);
    }
}

// Initialize empty data structure for new user
async function initializeUserData(uid) {
    try {
        // Create default wallet
        await db.collection('users').doc(uid).collection('wallets').add({
            name: 'Dompet Tunai',
            type: 'cash',
            balance: 0,
            createdAt: new Date().toISOString()
        });
        console.log('Default wallet created');
    } catch (e) {
        console.warn('Failed to create default wallet (non-critical):', e.message);
    }
}

// ============================================
// LOGIN
// ============================================
async function loginUser() {
    clearErrors();
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    if (!username) return showError('loginError', 'Username wajib diisi');
    if (!password) return showError('loginError', 'Password wajib diisi');

    setLoading('loginBtnText', 'loginSpinner', true);

    try {
        const email = generateEmail(username);
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'app.html';
    } catch (error) {
        setLoading('loginBtnText', 'loginSpinner', false);
        let msg = 'Username atau password salah';
        if (error.code === 'auth/user-not-found') msg = 'Username tidak ditemukan';
        else if (error.code === 'auth/wrong-password') msg = 'Password salah';
        else if (error.code === 'auth/too-many-requests') msg = 'Terlalu banyak percobaan, coba lagi nanti';
        showError('loginError', msg);
    }
}

// Enter key support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotForm = document.getElementById('forgotForm');

        if (loginForm.style.display !== 'none') loginUser();
        else if (registerForm.style.display !== 'none') registerUser();
        else if (forgotForm.style.display !== 'none') resetPassword();
    }
});

// ============================================
// FORGOT PASSWORD
// ============================================
async function resetPassword() {
    clearErrors();
    const username = document.getElementById('forgotUsername').value.trim().toLowerCase();

    if (!username) return showError('forgotError', 'Username wajib diisi');

    setLoading('forgotBtnText', 'forgotSpinner', true);

    try {
        const email = generateEmail(username);
        await auth.sendPasswordResetEmail(email);
        showSuccess('forgotSuccess', `Link reset password telah dikirim ke email yang terkait dengan username "${username}". Silakan cek inbox/spam.`);
        setLoading('forgotBtnText', 'forgotSpinner', false);
    } catch (error) {
        setLoading('forgotBtnText', 'forgotSpinner', false);
        let msg = 'Terjadi kesalahan';
        if (error.code === 'auth/user-not-found') msg = 'Username tidak ditemukan';
        showError('forgotError', msg);
    }
}
