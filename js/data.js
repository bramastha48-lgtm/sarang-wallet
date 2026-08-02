// ============================================
// Data Management - Firestore CRUD Operations
// ============================================

let currentUser = null;
let userData = {};

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        initApp();
    } else {
        // Not logged in, redirect to auth
        window.location.href = 'auth.html';
    }
});

// Load user data from Firestore
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            userData = userDoc.data();
        }
    } catch (e) {
        console.error('Error loading user data:', e);
    }
}

// Get user display name
function getUserDisplayName() {
    return userData.name || currentUser.displayName || currentUser.email.split('@')[0];
}

// ============================================
// WALLET CRUD
// ============================================
async function getWallets() {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('wallets').orderBy('createdAt', 'asc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addWallet(data) {
    return await db.collection('users').doc(currentUser.uid).collection('wallets').add({
        ...data,
        balance: Number(data.balance) || 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function updateWallet(id, data) {
    return await db.collection('users').doc(currentUser.uid).collection('wallets').doc(id).update(data);
}

async function deleteWallet(id) {
    return await db.collection('users').doc(currentUser.uid).collection('wallets').doc(id).delete();
}

// ============================================
// TRANSACTION CRUD
// ============================================
async function getTransactions(limit = 50) {
    const snapshot = await db.collection('users').doc(currentUser.uid)
        .collection('transactions').orderBy('date', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addTransaction(data) {
    const ref = await db.collection('users').doc(currentUser.uid).collection('transactions').add({
        ...data,
        amount: Number(data.amount) || 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update wallet balance
    if (data.walletId) {
        const walletRef = db.collection('users').doc(currentUser.uid).collection('wallets').doc(data.walletId);
        const walletDoc = await walletRef.get();
        if (walletDoc.exists) {
            const currentBalance = walletDoc.data().balance || 0;
            let newBalance = currentBalance;
            if (data.type === 'income') newBalance += Number(data.amount);
            else if (data.type === 'expense') newBalance -= Number(data.amount);
            await walletRef.update({ balance: newBalance });
        }
    }

    return ref;
}

async function deleteTransaction(id) {
    return await db.collection('users').doc(currentUser.uid).collection('transactions').doc(id).delete();
}

// ============================================
// GOAL CRUD
// ============================================
async function getGoals() {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('goals').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addGoal(data) {
    return await db.collection('users').doc(currentUser.uid).collection('goals').add({
        ...data,
        target: Number(data.target) || 0,
        current: Number(data.current) || 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function updateGoal(id, data) {
    return await db.collection('users').doc(currentUser.uid).collection('goals').doc(id).update(data);
}

async function deleteGoal(id) {
    return await db.collection('users').doc(currentUser.uid).collection('goals').doc(id).delete();
}

async function addToGoal(id, amount) {
    const goalRef = db.collection('users').doc(currentUser.uid).collection('goals').doc(id);
    const doc = await goalRef.get();
    if (doc.exists) {
        const current = doc.data().current || 0;
        await goalRef.update({ current: current + Number(amount) });
    }
}

async function withdrawFromGoal(id, amount) {
    const goalRef = db.collection('users').doc(currentUser.uid).collection('goals').doc(id);
    const doc = await goalRef.get();
    if (doc.exists) {
        const current = doc.data().current || 0;
        const newAmount = Math.max(0, current - Number(amount));
        await goalRef.update({ current: newAmount });
    }
}

// ============================================
// DEBT CRUD
// ============================================
async function getDebts() {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('debts').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addDebt(data) {
    return await db.collection('users').doc(currentUser.uid).collection('debts').add({
        ...data,
        totalPrincipal: Number(data.totalPrincipal) || 0,
        remaining: Number(data.remaining) || 0,
        monthlyPayment: Number(data.monthlyPayment) || 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function payDebt(id, amount) {
    const debtRef = db.collection('users').doc(currentUser.uid).collection('debts').doc(id);
    const doc = await debtRef.get();
    if (doc.exists) {
        const remaining = doc.data().remaining || 0;
        const newRemaining = Math.max(0, remaining - Number(amount));
        const status = newRemaining === 0 ? 'lunas' : 'aktif';
        await debtRef.update({ remaining: newRemaining, status });
    }
}

async function deleteDebt(id) {
    return await db.collection('users').doc(currentUser.uid).collection('debts').doc(id).delete();
}

// ============================================
// RECEIVABLE CRUD
// ============================================
async function getReceivables() {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('receivables').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addReceivable(data) {
    return await db.collection('users').doc(currentUser.uid).collection('receivables').add({
        ...data,
        totalLent: Number(data.totalLent) || 0,
        remaining: Number(data.remaining) || 0,
        collected: Number(data.collected) || 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function collectReceivable(id, amount) {
    const ref = db.collection('users').doc(currentUser.uid).collection('receivables').doc(id);
    const doc = await ref.get();
    if (doc.exists) {
        const data = doc.data();
        const newCollected = (data.collected || 0) + Number(amount);
        const newRemaining = Math.max(0, (data.remaining || 0) - Number(amount));
        const status = newRemaining === 0 ? 'lunas' : 'aktif';
        await ref.update({ collected: newCollected, remaining: newRemaining, status });
    }
}

async function deleteReceivable(id) {
    return await db.collection('users').doc(currentUser.uid).collection('receivables').doc(id).delete();
}

// ============================================
// INVESTMENT CRUD
// ============================================
async function getInvestments() {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('investments').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addInvestment(data) {
    return await db.collection('users').doc(currentUser.uid).collection('investments').add({
        ...data,
        buyPrice: Number(data.buyPrice) || 0,
        currentPrice: Number(data.currentPrice) || 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function updateInvestment(id, data) {
    return await db.collection('users').doc(currentUser.uid).collection('investments').doc(id).update(data);
}

async function deleteInvestment(id) {
    return await db.collection('users').doc(currentUser.uid).collection('investments').doc(id).delete();
}

// ============================================
// ASSET CRUD
// ============================================
async function getAssets() {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('assets').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addAsset(data) {
    return await db.collection('users').doc(currentUser.uid).collection('assets').add({
        ...data,
        value: Number(data.value) || 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function updateAsset(id, data) {
    return await db.collection('users').doc(currentUser.uid).collection('assets').doc(id).update(data);
}

async function deleteAsset(id) {
    return await db.collection('users').doc(currentUser.uid).collection('assets').doc(id).delete();
}

// ============================================
// SUBSCRIPTION CRUD
// ============================================
async function getSubscriptions() {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('subscriptions').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addSubscription(data) {
    return await db.collection('users').doc(currentUser.uid).collection('subscriptions').add({
        ...data,
        amount: Number(data.amount) || 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function deleteSubscription(id) {
    return await db.collection('users').doc(currentUser.uid).collection('subscriptions').doc(id).delete();
}

// ============================================
// LOGOUT
// ============================================
async function logoutUser() {
    await auth.signOut();
    window.location.href = 'auth.html';
}
