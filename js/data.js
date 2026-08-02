// ============================================
// Data Management - Firestore + localStorage fallback
// ============================================

let currentUser = null;
let userData = {};
let useFirestore = true;

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        initApp();
    } else {
        window.location.href = 'auth.html';
    }
});

// Load user data
async function loadUserData() {
    // Try localStorage first (guaranteed)
    const localData = localStorage.getItem('sw_user_' + currentUser.uid);
    if (localData) {
        userData = JSON.parse(localData);
    }

    // Try Firestore (may fail)
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            userData = userDoc.data();
            localStorage.setItem('sw_user_' + currentUser.uid, JSON.stringify(userData));
        }
    } catch (e) {
        console.warn('Firestore not accessible, using localStorage:', e.message);
        useFirestore = false;
    }

    // Fallback to auth data
    if (!userData.name) {
        userData = {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email
        };
    }
}

function getUserDisplayName() {
    return userData.name || currentUser.displayName || currentUser.email.split('@')[0];
}

// ============================================
// Helper: Safe Firestore operation with fallback
// ============================================
async function safeFirestore(operation, fallback) {
    if (!useFirestore) return fallback;
    try {
        return await operation();
    } catch (e) {
        console.warn('Firestore operation failed:', e.message);
        if (e.code === 'permission-denied') {
            useFirestore = false;
            console.warn('Switched to localStorage mode');
        }
        return fallback;
    }
}

// LocalStorage helpers
function getLocalData(key) {
    const data = localStorage.getItem('sw_' + currentUser.uid + '_' + key);
    return data ? JSON.parse(data) : [];
}

function setLocalData(key, data) {
    localStorage.setItem('sw_' + currentUser.uid + '_' + key, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// WALLET CRUD
// ============================================
async function getWallets() {
    return safeFirestore(async () => {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('wallets').orderBy('createdAt', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, getLocalData('wallets'));
}

async function addWallet(data) {
    const wallet = { ...data, balance: Number(data.balance) || 0, createdAt: new Date().toISOString() };

    // Save to localStorage
    const wallets = getLocalData('wallets');
    const id = generateId();
    wallets.push({ id, ...wallet });
    setLocalData('wallets', wallets);

    // Try Firestore
    return safeFirestore(async () => {
        const ref = await db.collection('users').doc(currentUser.uid).collection('wallets').add(wallet);
        // Update localStorage with Firestore ID
        const idx = wallets.findIndex(w => w.id === id);
        if (idx >= 0) wallets[idx].id = ref.id;
        setLocalData('wallets', wallets);
        return ref;
    }, { id });
}

async function deleteWallet(id) {
    // Remove from localStorage
    const wallets = getLocalData('wallets').filter(w => w.id !== id);
    setLocalData('wallets', wallets);

    // Try Firestore
    return safeFirestore(async () => {
        return await db.collection('users').doc(currentUser.uid).collection('wallets').doc(id).delete();
    }, null);
}

// ============================================
// TRANSACTION CRUD
// ============================================
async function getTransactions(limit = 50) {
    return safeFirestore(async () => {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('transactions').orderBy('date', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, getLocalData('transactions').slice(0, limit));
}

async function addTransaction(data) {
    const tx = { ...data, amount: Number(data.amount) || 0, createdAt: new Date().toISOString() };

    // Save to localStorage
    const transactions = getLocalData('transactions');
    const id = generateId();
    transactions.unshift({ id, ...tx });
    setLocalData('transactions', transactions);

    // Update wallet balance in localStorage
    if (data.walletId) {
        const wallets = getLocalData('wallets');
        const idx = wallets.findIndex(w => w.id === data.walletId);
        if (idx >= 0) {
            if (data.type === 'income') wallets[idx].balance += Number(data.amount);
            else if (data.type === 'expense') wallets[idx].balance -= Number(data.amount);
            setLocalData('wallets', wallets);
        }
    }

    // Try Firestore
    return safeFirestore(async () => {
        const ref = await db.collection('users').doc(currentUser.uid).collection('transactions').add(tx);
        if (data.walletId) {
            try {
                const walletRef = db.collection('users').doc(currentUser.uid).collection('wallets').doc(data.walletId);
                const walletDoc = await walletRef.get();
                if (walletDoc.exists) {
                    const balance = walletDoc.data().balance || 0;
                    const newBalance = data.type === 'income' ? balance + Number(data.amount) : balance - Number(data.amount);
                    await walletRef.update({ balance: newBalance });
                }
            } catch (e) { console.warn('Wallet update failed:', e.message); }
        }
        return ref;
    }, { id });
}

async function deleteTransaction(id) {
    const transactions = getLocalData('transactions').filter(t => t.id !== id);
    setLocalData('transactions', transactions);

    return safeFirestore(async () => {
        return await db.collection('users').doc(currentUser.uid).collection('transactions').doc(id).delete();
    }, null);
}

// ============================================
// GOAL CRUD
// ============================================
async function getGoals() {
    return safeFirestore(async () => {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('goals').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, getLocalData('goals'));
}

async function addGoal(data) {
    const goal = { ...data, target: Number(data.target) || 0, current: Number(data.current) || 0, createdAt: new Date().toISOString() };
    const goals = getLocalData('goals');
    const id = generateId();
    goals.unshift({ id, ...goal });
    setLocalData('goals', goals);

    return safeFirestore(async () => {
        const ref = await db.collection('users').doc(currentUser.uid).collection('goals').add(goal);
        return ref;
    }, { id });
}

async function deleteGoal(id) {
    const goals = getLocalData('goals').filter(g => g.id !== id);
    setLocalData('goals', goals);
    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('goals').doc(id).delete(), null);
}

async function addToGoal(id, amount) {
    const goals = getLocalData('goals');
    const idx = goals.findIndex(g => g.id === id);
    if (idx >= 0) {
        goals[idx].current = (goals[idx].current || 0) + Number(amount);
        setLocalData('goals', goals);
    }
    return safeFirestore(async () => {
        const ref = db.collection('users').doc(currentUser.uid).collection('goals').doc(id);
        const doc = await ref.get();
        if (doc.exists) await ref.update({ current: (doc.data().current || 0) + Number(amount) });
    }, null);
}

async function withdrawFromGoal(id, amount) {
    const goals = getLocalData('goals');
    const idx = goals.findIndex(g => g.id === id);
    if (idx >= 0) {
        goals[idx].current = Math.max(0, (goals[idx].current || 0) - Number(amount));
        setLocalData('goals', goals);
    }
    return safeFirestore(async () => {
        const ref = db.collection('users').doc(currentUser.uid).collection('goals').doc(id);
        const doc = await ref.get();
        if (doc.exists) await ref.update({ current: Math.max(0, (doc.data().current || 0) - Number(amount)) });
    }, null);
}

// ============================================
// DEBT CRUD
// ============================================
async function getDebts() {
    return safeFirestore(async () => {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('debts').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, getLocalData('debts'));
}

async function addDebt(data) {
    const debt = { ...data, totalPrincipal: Number(data.totalPrincipal) || 0, remaining: Number(data.remaining) || 0, monthlyPayment: Number(data.monthlyPayment) || 0, createdAt: new Date().toISOString() };
    const debts = getLocalData('debts');
    const id = generateId();
    debts.unshift({ id, ...debt });
    setLocalData('debts', debts);

    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('debts').add(debt), { id });
}

async function payDebt(id, amount) {
    const debts = getLocalData('debts');
    const idx = debts.findIndex(d => d.id === id);
    if (idx >= 0) {
        debts[idx].remaining = Math.max(0, (debts[idx].remaining || 0) - Number(amount));
        debts[idx].status = debts[idx].remaining === 0 ? 'lunas' : 'aktif';
        setLocalData('debts', debts);
    }
    return safeFirestore(async () => {
        const ref = db.collection('users').doc(currentUser.uid).collection('debts').doc(id);
        const doc = await ref.get();
        if (doc.exists) {
            const remaining = Math.max(0, (doc.data().remaining || 0) - Number(amount));
            await ref.update({ remaining, status: remaining === 0 ? 'lunas' : 'aktif' });
        }
    }, null);
}

async function deleteDebt(id) {
    const debts = getLocalData('debts').filter(d => d.id !== id);
    setLocalData('debts', debts);
    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('debts').doc(id).delete(), null);
}

// ============================================
// RECEIVABLE CRUD
// ============================================
async function getReceivables() {
    return safeFirestore(async () => {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('receivables').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, getLocalData('receivables'));
}

async function addReceivable(data) {
    const rec = { ...data, totalLent: Number(data.totalLent) || 0, remaining: Number(data.remaining) || 0, collected: Number(data.collected) || 0, createdAt: new Date().toISOString() };
    const receivables = getLocalData('receivables');
    const id = generateId();
    receivables.unshift({ id, ...rec });
    setLocalData('receivables', receivables);

    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('receivables').add(rec), { id });
}

async function collectReceivable(id, amount) {
    const receivables = getLocalData('receivables');
    const idx = receivables.findIndex(r => r.id === id);
    if (idx >= 0) {
        receivables[idx].collected = (receivables[idx].collected || 0) + Number(amount);
        receivables[idx].remaining = Math.max(0, (receivables[idx].remaining || 0) - Number(amount));
        receivables[idx].status = receivables[idx].remaining === 0 ? 'lunas' : 'aktif';
        setLocalData('receivables', receivables);
    }
    return safeFirestore(async () => {
        const ref = db.collection('users').doc(currentUser.uid).collection('receivables').doc(id);
        const doc = await ref.get();
        if (doc.exists) {
            const d = doc.data();
            await ref.update({ collected: (d.collected || 0) + Number(amount), remaining: Math.max(0, (d.remaining || 0) - Number(amount)), status: Math.max(0, (d.remaining || 0) - Number(amount)) === 0 ? 'lunas' : 'aktif' });
        }
    }, null);
}

async function deleteReceivable(id) {
    const receivables = getLocalData('receivables').filter(r => r.id !== id);
    setLocalData('receivables', receivables);
    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('receivables').doc(id).delete(), null);
}

// ============================================
// INVESTMENT CRUD
// ============================================
async function getInvestments() {
    return safeFirestore(async () => {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('investments').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, getLocalData('investments'));
}

async function addInvestment(data) {
    const inv = { ...data, buyPrice: Number(data.buyPrice) || 0, currentPrice: Number(data.currentPrice) || 0, createdAt: new Date().toISOString() };
    const investments = getLocalData('investments');
    const id = generateId();
    investments.unshift({ id, ...inv });
    setLocalData('investments', investments);

    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('investments').add(inv), { id });
}

async function deleteInvestment(id) {
    const investments = getLocalData('investments').filter(i => i.id !== id);
    setLocalData('investments', investments);
    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('investments').doc(id).delete(), null);
}

// ============================================
// ASSET CRUD
// ============================================
async function getAssets() {
    return safeFirestore(async () => {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('assets').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, getLocalData('assets'));
}

async function addAsset(data) {
    const asset = { ...data, value: Number(data.value) || 0, createdAt: new Date().toISOString() };
    const assets = getLocalData('assets');
    const id = generateId();
    assets.unshift({ id, ...asset });
    setLocalData('assets', assets);

    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('assets').add(asset), { id });
}

async function deleteAsset(id) {
    const assets = getLocalData('assets').filter(a => a.id !== id);
    setLocalData('assets', assets);
    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('assets').doc(id).delete(), null);
}

// ============================================
// SUBSCRIPTION CRUD
// ============================================
async function getSubscriptions() {
    return safeFirestore(async () => {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('subscriptions').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, getLocalData('subscriptions'));
}

async function addSubscription(data) {
    const sub = { ...data, amount: Number(data.amount) || 0, createdAt: new Date().toISOString() };
    const subs = getLocalData('subscriptions');
    const id = generateId();
    subs.unshift({ id, ...sub });
    setLocalData('subscriptions', subs);

    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('subscriptions').add(sub), { id });
}

async function deleteSubscription(id) {
    const subs = getLocalData('subscriptions').filter(s => s.id !== id);
    setLocalData('subscriptions', subs);
    return safeFirestore(async () => db.collection('users').doc(currentUser.uid).collection('subscriptions').doc(id).delete(), null);
}

// ============================================
// LOGOUT
// ============================================
async function logoutUser() {
    await auth.signOut();
    window.location.href = 'auth.html';
}
