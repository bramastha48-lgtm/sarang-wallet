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
        } else {
            // User doc doesn't exist yet, use auth data
            userData = {
                name: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email
            };
        }
    } catch (e) {
        console.warn('Firestore not accessible, using auth data:', e.message);
        userData = {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email
        };
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
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('wallets').orderBy('createdAt', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('getWallets error:', e.message);
        return [];
    }
}

async function addWallet(data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('wallets').add({
            ...data,
            balance: Number(data.balance) || 0,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('addWallet error:', e.message);
        alert('Gagal menyimpan: ' + e.message);
    }
}

async function updateWallet(id, data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('wallets').doc(id).update(data);
    } catch (e) {
        console.error('updateWallet error:', e.message);
    }
}

async function deleteWallet(id) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('wallets').doc(id).delete();
    } catch (e) {
        console.error('deleteWallet error:', e.message);
        alert('Gagal menghapus: ' + e.message);
    }
}

// ============================================
// TRANSACTION CRUD
// ============================================
async function getTransactions(limit = 50) {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('transactions').orderBy('date', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('getTransactions error:', e.message);
        return [];
    }
}

async function addTransaction(data) {
    try {
        const ref = await db.collection('users').doc(currentUser.uid).collection('transactions').add({
            ...data,
            amount: Number(data.amount) || 0,
            createdAt: new Date().toISOString()
        });

        // Update wallet balance
        if (data.walletId) {
            try {
                const walletRef = db.collection('users').doc(currentUser.uid).collection('wallets').doc(data.walletId);
                const walletDoc = await walletRef.get();
                if (walletDoc.exists) {
                    const currentBalance = walletDoc.data().balance || 0;
                    let newBalance = currentBalance;
                    if (data.type === 'income') newBalance += Number(data.amount);
                    else if (data.type === 'expense') newBalance -= Number(data.amount);
                    await walletRef.update({ balance: newBalance });
                }
            } catch (walletErr) {
                console.warn('Wallet balance update failed:', walletErr.message);
            }
        }

        return ref;
    } catch (e) {
        console.error('addTransaction error:', e.message);
        alert('Gagal menyimpan transaksi: ' + e.message);
    }
}

async function deleteTransaction(id) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('transactions').doc(id).delete();
    } catch (e) {
        console.error('deleteTransaction error:', e.message);
        alert('Gagal menghapus: ' + e.message);
    }
}

// ============================================
// GOAL CRUD
// ============================================
async function getGoals() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('goals').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('getGoals error:', e.message);
        return [];
    }
}

async function addGoal(data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('goals').add({
            ...data,
            target: Number(data.target) || 0,
            current: Number(data.current) || 0,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('addGoal error:', e.message);
        alert('Gagal menyimpan: ' + e.message);
    }
}

async function updateGoal(id, data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('goals').doc(id).update(data);
    } catch (e) {
        console.error('updateGoal error:', e.message);
    }
}

async function deleteGoal(id) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('goals').doc(id).delete();
    } catch (e) {
        console.error('deleteGoal error:', e.message);
        alert('Gagal menghapus: ' + e.message);
    }
}

async function addToGoal(id, amount) {
    try {
        const goalRef = db.collection('users').doc(currentUser.uid).collection('goals').doc(id);
        const doc = await goalRef.get();
        if (doc.exists) {
            const current = doc.data().current || 0;
            await goalRef.update({ current: current + Number(amount) });
        }
    } catch (e) {
        console.error('addToGoal error:', e.message);
        alert('Gagal menambah dana: ' + e.message);
    }
}

async function withdrawFromGoal(id, amount) {
    try {
        const goalRef = db.collection('users').doc(currentUser.uid).collection('goals').doc(id);
        const doc = await goalRef.get();
        if (doc.exists) {
            const current = doc.data().current || 0;
            const newAmount = Math.max(0, current - Number(amount));
            await goalRef.update({ current: newAmount });
        }
    } catch (e) {
        console.error('withdrawFromGoal error:', e.message);
        alert('Gagal menarik dana: ' + e.message);
    }
}

// ============================================
// DEBT CRUD
// ============================================
async function getDebts() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('debts').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('getDebts error:', e.message);
        return [];
    }
}

async function addDebt(data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('debts').add({
            ...data,
            totalPrincipal: Number(data.totalPrincipal) || 0,
            remaining: Number(data.remaining) || 0,
            monthlyPayment: Number(data.monthlyPayment) || 0,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('addDebt error:', e.message);
        alert('Gagal menyimpan: ' + e.message);
    }
}

async function payDebt(id, amount) {
    try {
        const debtRef = db.collection('users').doc(currentUser.uid).collection('debts').doc(id);
        const doc = await debtRef.get();
        if (doc.exists) {
            const remaining = doc.data().remaining || 0;
            const newRemaining = Math.max(0, remaining - Number(amount));
            const status = newRemaining === 0 ? 'lunas' : 'aktif';
            await debtRef.update({ remaining: newRemaining, status });
        }
    } catch (e) {
        console.error('payDebt error:', e.message);
        alert('Gagal bayar: ' + e.message);
    }
}

async function deleteDebt(id) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('debts').doc(id).delete();
    } catch (e) {
        console.error('deleteDebt error:', e.message);
        alert('Gagal menghapus: ' + e.message);
    }
}

// ============================================
// RECEIVABLE CRUD
// ============================================
async function getReceivables() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('receivables').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('getReceivables error:', e.message);
        return [];
    }
}

async function addReceivable(data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('receivables').add({
            ...data,
            totalLent: Number(data.totalLent) || 0,
            remaining: Number(data.remaining) || 0,
            collected: Number(data.collected) || 0,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('addReceivable error:', e.message);
        alert('Gagal menyimpan: ' + e.message);
    }
}

async function collectReceivable(id, amount) {
    try {
        const ref = db.collection('users').doc(currentUser.uid).collection('receivables').doc(id);
        const doc = await ref.get();
        if (doc.exists) {
            const data = doc.data();
            const newCollected = (data.collected || 0) + Number(amount);
            const newRemaining = Math.max(0, (data.remaining || 0) - Number(amount));
            const status = newRemaining === 0 ? 'lunas' : 'aktif';
            await ref.update({ collected: newCollected, remaining: newRemaining, status });
        }
    } catch (e) {
        console.error('collectReceivable error:', e.message);
        alert('Gagal menerima pembayaran: ' + e.message);
    }
}

async function deleteReceivable(id) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('receivables').doc(id).delete();
    } catch (e) {
        console.error('deleteReceivable error:', e.message);
        alert('Gagal menghapus: ' + e.message);
    }
}

// ============================================
// INVESTMENT CRUD
// ============================================
async function getInvestments() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('investments').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('getInvestments error:', e.message);
        return [];
    }
}

async function addInvestment(data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('investments').add({
            ...data,
            buyPrice: Number(data.buyPrice) || 0,
            currentPrice: Number(data.currentPrice) || 0,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('addInvestment error:', e.message);
        alert('Gagal menyimpan: ' + e.message);
    }
}

async function updateInvestment(id, data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('investments').doc(id).update(data);
    } catch (e) {
        console.error('updateInvestment error:', e.message);
    }
}

async function deleteInvestment(id) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('investments').doc(id).delete();
    } catch (e) {
        console.error('deleteInvestment error:', e.message);
        alert('Gagal menghapus: ' + e.message);
    }
}

// ============================================
// ASSET CRUD
// ============================================
async function getAssets() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('assets').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('getAssets error:', e.message);
        return [];
    }
}

async function addAsset(data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('assets').add({
            ...data,
            value: Number(data.value) || 0,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('addAsset error:', e.message);
        alert('Gagal menyimpan: ' + e.message);
    }
}

async function updateAsset(id, data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('assets').doc(id).update(data);
    } catch (e) {
        console.error('updateAsset error:', e.message);
    }
}

async function deleteAsset(id) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('assets').doc(id).delete();
    } catch (e) {
        console.error('deleteAsset error:', e.message);
        alert('Gagal menghapus: ' + e.message);
    }
}

// ============================================
// SUBSCRIPTION CRUD
// ============================================
async function getSubscriptions() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('subscriptions').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn('getSubscriptions error:', e.message);
        return [];
    }
}

async function addSubscription(data) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('subscriptions').add({
            ...data,
            amount: Number(data.amount) || 0,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('addSubscription error:', e.message);
        alert('Gagal menyimpan: ' + e.message);
    }
}

async function deleteSubscription(id) {
    try {
        return await db.collection('users').doc(currentUser.uid).collection('subscriptions').doc(id).delete();
    } catch (e) {
        console.error('deleteSubscription error:', e.message);
        alert('Gagal menghapus: ' + e.message);
    }
}

// ============================================
// LOGOUT
// ============================================
async function logoutUser() {
    await auth.signOut();
    window.location.href = 'auth.html';
}
