// ============================================
// Authentication Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            window.location.href = 'app.html';
        }
    });
});

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

function isValidUsername(username) {
    return /^[a-z0-9]{4,20}$/.test(username);
}

// ============================================
// REGISTER - Simplified & Robust
// ============================================
async function registerUser() {
    clearErrors();
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const name = document.getElementById('regName').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    if (!username) return showError('regError', 'Username wajib diisi');
    if (!isValidUsername(username)) return showError('regError', 'Username hanya huruf kecil dan angka, 4-20 karakter');
    if (!name) return showError('regError', 'Nama lengkap wajib diisi');
    if (password.length < 6) return showError('regError', 'Password minimal 6 karakter');
    if (password !== confirm) return showError('regError', 'Password tidak cocok');

    setLoading('regBtnText', 'regSpinner', true);

    try {
        const email = generateEmail(username);
        console.log('Registering with email:', email);

        // Step 1: Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('Auth user created:', user.uid);

        // Step 2: Update display name
        await user.updateProfile({ displayName: name });

        // Step 3: Save to localStorage (guaranteed to work)
        const userData = {
            uid: user.uid,
            username: username,
            name: name,
            email: email,
            currency: 'IDR',
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('sw_user_' + user.uid, JSON.stringify(userData));
        console.log('User data saved to localStorage');

        // Step 4: Try Firestore (non-blocking, app works without it)
        try {
            await db.collection('users').doc(user.uid).set(userData);
            console.log('User data saved to Firestore');
        } catch (fwErr) {
            console.warn('Firestore save skipped:', fwErr.message);
            // App still works with localStorage
        }

        showSuccess('regSuccess', 'Akun berhasil dibuat! Mengalihkan...');
        setTimeout(() => window.location.href = 'app.html', 1500);

    } catch (error) {
        setLoading('regBtnText', 'regSpinner', false);
        console.error('Registration error:', error);
        let msg = 'Terjadi kesalahan';
        if (error.code === 'auth/email-already-in-use') msg = 'Username sudah digunakan';
        else if (error.code === 'auth/weak-password') msg = 'Password terlalu lemah';
        else if (error.code === 'auth/invalid-email') msg = 'Username tidak valid';
        else if (error.code === 'auth/operation-not-allowed') msg = 'Email/Password belum diaktifkan di Firebase Console';
        else msg = error.message;
        showError('regError', msg);
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
        console.log('Logging in with email:', email);
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'app.html';
    } catch (error) {
        setLoading('loginBtnText', 'loginSpinner', false);
        console.error('Login error:', error);
        let msg = 'Username atau password salah';
        if (error.code === 'auth/user-not-found') msg = 'Username tidak ditemukan';
        else if (error.code === 'auth/wrong-password') msg = 'Password salah';
        else if (error.code === 'auth/too-many-requests') msg = 'Terlalu banyak percobaan, coba lagi nanti';
        else if (error.code === 'auth/invalid-credential') msg = 'Username atau password salah';
        else if (error.code === 'auth/operation-not-allowed') msg = 'Email/Password belum diaktifkan di Firebase Console';
        showError('loginError', msg);
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgotForm = document.getElementById('forgotForm');

        if (loginForm && loginForm.style.display !== 'none') loginUser();
        else if (registerForm && registerForm.style.display !== 'none') registerUser();
        else if (forgotForm && forgotForm.style.display !== 'none') resetPassword();
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
        showSuccess('forgotSuccess', `Link reset password telah dikirim. Silakan cek inbox/spam di email yang terkait dengan username "${username}".`);
        setLoading('forgotBtnText', 'forgotSpinner', false);
    } catch (error) {
        setLoading('forgotBtnText', 'forgotSpinner', false);
        let msg = 'Terjadi kesalahan';
        if (error.code === 'auth/user-not-found') msg = 'Username tidak ditemukan';
        showError('forgotError', msg);
    }
}
