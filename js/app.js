// ============================================
// SARANG WALLET App JavaScript - Firebase Integrated
// ============================================

// ---- Navigation ----
function initApp() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('pageTitle');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarClose = document.getElementById('sidebarClose');

    // Set greeting
    updateGreeting();

    // Set current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Set user display name in sidebar
    const sidebarName = document.querySelector('.user-name');
    if (sidebarName) sidebarName.textContent = getUserDisplayName();

    function navigateTo(pageName) {
        navItems.forEach(item => item.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
        if (activeNav) activeNav.classList.add('active');

        pages.forEach(page => page.classList.remove('active'));
        const activePage = document.getElementById(`page-${pageName}`);
        if (activePage) activePage.classList.add('active');

        const titles = {
            home: 'Beranda', wallets: 'Dompet', transactions: 'Transaksi',
            budget: 'Anggaran', goals: 'Tujuan Keuangan', assets: 'Aset',
            debts: 'Hutang', receivables: 'Piutang', investments: 'Investasi',
            reports: 'Laporan', settings: 'Pengaturan'
        };
        if (pageTitle) pageTitle.textContent = titles[pageName] || pageName;

        sidebar.classList.remove('open');
        loadPageData(pageName);
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    document.querySelectorAll('[data-page]').forEach(el => {
        if (!el.classList.contains('nav-item')) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(el.dataset.page);
            });
        }
    });

    if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.add('open'));
    if (sidebarClose) sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));

    // Add transaction button
    const addBtn = document.getElementById('addTransactionBtn');
    if (addBtn) addBtn.addEventListener('click', () => openModal('addTransactionModal'));

    // Transaction modal tabs
    document.querySelectorAll('.mt-tab[data-tx-type]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.mt-tab[data-tx-type]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Tag selection in goal modal
    document.querySelectorAll('#addGoalModal .tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.querySelectorAll('#addGoalModal .tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
        });
    });

    // Initialize scan upload
    initScanUpload();

    // Initialize number formatting
    initNumberFormatting();

    // Load home page data
    loadPageData('home');
}

// ---- Page Data Loading ----
async function loadPageData(page) {
    switch (page) {
        case 'home': await loadHomePage(); break;
        case 'wallets': await loadWalletsPage(); break;
        case 'transactions': await loadTransactionsPage(); break;
        case 'budget': await loadBudgetPage(); break;
        case 'goals': await loadGoalsPage(); break;
        case 'assets': await loadAssetsPage(); break;
        case 'debts': await loadDebtsPage(); break;
        case 'receivables': await loadReceivablesPage(); break;
        case 'investments': await loadInvestmentsPage(); break;
        case 'reports': await loadReportsPage(); break;
        case 'settings': await loadSettingsPage(); break;
    }
}

// ============================================
// HOME PAGE
// ============================================
async function loadHomePage() {
    const wallets = await getWallets();
    const transactions = await getTransactions(10);
    const goals = await getGoals();
    const debts = await getDebts();

    // Calculate totals
    const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    const now = new Date();
    const thisMonth = transactions.filter(t => {
        const d = t.date ? new Date(t.date) : (t.createdAt ? t.createdAt.toDate() : null);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    // Update overview
    const overviewAmount = document.querySelector('.overview-amount');
    if (overviewAmount) overviewAmount.textContent = formatRupiah(totalBalance);

    const incomeEl = document.querySelector('.os-value.green');
    if (incomeEl) incomeEl.textContent = formatRupiah(totalIncome);

    const expenseEl = document.querySelector('.os-value.red');
    if (expenseEl) expenseEl.textContent = formatRupiah(totalExpense);

    // Update expense list
    const expenseList = document.querySelector('.expense-list');
    if (expenseList) {
        const categories = {};
        thisMonth.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'Lainnya';
            categories[cat] = (categories[cat] || 0) + (t.amount || 0);
        });
        const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((s, [, v]) => s + v, 0);

        if (sorted.length === 0) {
            expenseList.innerHTML = '<div class="empty-state">Belum ada pengeluaran bulan ini</div>';
        } else {
            expenseList.innerHTML = sorted.slice(0, 5).map(([cat, amount]) => {
                const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                const icons = { 'Housing': 'home', 'Food & Dining': 'utensils', 'Shopping': 'shopping-bag', 'Transport': 'car', 'Entertainment': 'film' };
                const icon = icons[cat] || 'tag';
                return `<div class="expense-item">
                    <div class="ei-icon"><i class="fas fa-${icon}"></i></div>
                    <div class="ei-info"><span class="ei-name">${escapeHtml(cat)}</span>
                    <div class="ei-bar"><div class="ei-fill" style="width:${pct}%"></div></div></div>
                    <span class="ei-amount">${formatRupiah(amount)}</span>
                    <span class="ei-pct">${pct}%</span>
                </div>`;
            }).join('');
        }
    }

    // Update due dates from debts
    const dueList = document.querySelector('.due-list');
    if (dueList) {
        const activeDebts = debts.filter(d => d.status !== 'lunas' && d.remaining > 0);
        if (activeDebts.length === 0) {
            dueList.innerHTML = '<div class="empty-state">Tidak ada jatuh tempo</div>';
        } else {
            dueList.innerHTML = activeDebts.slice(0, 3).map(d => `
                <div class="due-item">
                    <div class="due-info">
                        <span class="due-name">${escapeHtml(d.name)}</span>
                        <span class="due-date">${d.dueDate || '-'}</span>
                    </div>
                    <span class="due-amount">${formatRupiah(d.remaining)}</span>
                </div>
            `).join('');
        }
    }
}

// ============================================
// WALLETS PAGE
// ============================================
async function loadWalletsPage() {
    const wallets = await getWallets();
    const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

    const wbcAmount = document.getElementById('walletsTotalBalance') || document.querySelector('.wbc-amount');
    if (wbcAmount) wbcAmount.textContent = formatRupiah(totalBalance);

    const wbcSub = document.getElementById('walletsCount') || document.querySelector('.wbc-sub');
    if (wbcSub) wbcSub.textContent = `${wallets.length} dompet aktif`;

    const walletList = document.getElementById('walletList') || document.querySelector('.wallet-list');
    if (walletList) {
        if (wallets.length === 0) {
            walletList.innerHTML = '<div class="empty-state">Belum ada dompet. Tambahkan dompet pertamamu!</div>';
        } else {
            walletList.innerHTML = wallets.map(w => {
                const iconClass = w.type === 'bank' ? 'university' : w.type === 'ewallet' ? 'mobile-alt' : 'money-bill-wave';
                const typeClass = w.type === 'bank' ? '' : w.type === 'ewallet' ? 'gopay' : 'cash';
                return `<div class="wallet-item">
                    <div class="wi-icon ${typeClass}"><i class="fas fa-${iconClass}"></i></div>
                    <div class="wi-info"><span class="wi-name">${escapeHtml(w.name)}</span><span class="wi-detail">${w.type}</span></div>
                    <span class="wi-amount">${formatRupiah(w.balance || 0)}</span>
                    <div class="wi-actions">
                        <button class="btn-icon-sm red" onclick="handleDeleteWallet('${w.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
        }
    }

    // Populate wallet selects in transfer form and transaction modal
    populateWalletSelects(wallets);
}

function populateWalletSelects(wallets) {
    // Populate all wallet selects (by class and by ID)
    const selects = document.querySelectorAll('.wallet-select, #txWallet, #scanWallet');
    selects.forEach(sel => {
        const current = sel.value;
        sel.innerHTML = '<option value="">Pilih Dompet</option>' +
            wallets.map(w => `<option value="${w.id}">${escapeHtml(w.name)} (${formatRupiah(w.balance || 0)})</option>`).join('');
        if (current) sel.value = current;
    });
}

async function handleDeleteWallet(id) {
    if (confirm('Hapus dompet ini?')) {
        await deleteWallet(id);
        await loadWalletsPage();
    }
}

// ============================================
// TRANSACTIONS PAGE
// ============================================
async function loadTransactionsPage() {
    const transactions = await getTransactions(100);
    const txList = document.getElementById('transactionList') || document.querySelector('.transaction-list');

    if (!txList) return;

    if (transactions.length === 0) {
        txList.innerHTML = '<div class="empty-state">Belum ada transaksi. Tambahkan transaksi pertamamu!</div>';
        return;
    }

    // Group by date
    const grouped = {};
    transactions.forEach(t => {
        const d = t.date || (t.createdAt ? t.createdAt.toDate().toISOString().split('T')[0] : 'Unknown');
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(t);
    });

    const categoryIcons = {
        'Salary': 'money-bill-wave', 'Freelance': 'laptop-code', 'Food & Dining': 'utensils',
        'Housing': 'home', 'Shopping': 'shopping-bag', 'Transport': 'car',
        'Entertainment': 'film', 'Health': 'heartbeat', 'Education': 'graduation-cap'
    };

    txList.innerHTML = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => {
        const total = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
        const dateStr = new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        return `<div class="tx-group">
            <div class="tx-date">
                <span>${dateStr}</span>
                <span class="tx-total ${total >= 0 ? 'green' : 'red'}">${total >= 0 ? '+' : ''}${formatRupiah(Math.abs(total))}</span>
            </div>
            ${items.map(t => {
                const icon = categoryIcons[t.category] || 'tag';
                const isIncome = t.type === 'income';
                return `<div class="tx-item">
                    <div class="txi-icon ${isIncome ? 'salary' : 'food'}"><i class="fas fa-${icon}"></i></div>
                    <div class="txi-info">
                        <span class="txi-name">${escapeHtml(t.description || t.category || 'Transaksi')}</span>
                        <span class="txi-source">${escapeHtml(t.walletName || '-')} • ${escapeHtml(t.category || '-')}</span>
                    </div>
                    <span class="txi-amount ${isIncome ? 'green' : 'red'}">${isIncome ? '+' : '-'}${formatRupiah(t.amount)}</span>
                    <button class="btn-icon-sm red" onclick="handleDeleteTransaction('${t.id}')" style="margin-left:8px"><i class="fas fa-trash"></i></button>
                </div>`;
            }).join('')}
        </div>`;
    }).join('');
}

async function handleDeleteTransaction(id) {
    if (confirm('Hapus transaksi ini?')) {
        await deleteTransaction(id);
        await loadTransactionsPage();
    }
}

// ============================================
// GOALS PAGE
// ============================================
async function loadGoalsPage() {
    const goals = await getGoals();
    const grid = document.getElementById('goalList') || document.querySelector('.goals-grid');

    if (!grid) return;

    if (goals.length === 0) {
        grid.innerHTML = '<div class="empty-state">Belum ada tujuan keuangan. Buat tujuan pertamamu!</div>';
        return;
    }

    grid.innerHTML = goals.map(g => {
        const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
        const icons = { '🎯': 'bullseye', '🏠': 'home', '✈️': 'plane', '🚗': 'car', '💍': 'ring', '📱': 'mobile-alt', '🛡️': 'shield-halved' };
        const icon = icons[g.icon] || 'bullseye';
        return `<div class="goal-card">
            <div class="gc-header">
                <div class="gc-icon emergency"><i class="fas fa-${icon}"></i></div>
                <div class="gc-info"><h4>${escapeHtml(g.name)}</h4><span class="gc-date">Target: ${g.targetDate || '-'}</span></div>
                <span class="gc-pct">${pct}%</span>
            </div>
            <div class="gc-progress"><div class="gc-bar"><div class="gc-fill" style="width:${Math.min(pct, 100)}%"></div></div></div>
            <div class="gc-details">
                <div class="gc-detail"><span class="gc-label">Terkumpul</span><span class="gc-value">${formatRupiah(g.current)}</span></div>
                <div class="gc-detail"><span class="gc-label">Target</span><span class="gc-value">${formatRupiah(g.target)}</span></div>
            </div>
            <div class="gc-actions">
                <button class="btn-green" onclick="handleAddToGoal('${g.id}')"><i class="fas fa-plus"></i> Tambah Dana</button>
                <button class="btn-outline-sm" onclick="handleWithdrawGoal('${g.id}')"><i class="fas fa-minus"></i> Tarik</button>
                <button class="btn-icon-sm red" onclick="handleDeleteGoal('${g.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

async function handleAddToGoal(id) {
    // Open modal with goal data
    const goals = await getGoals();
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    document.getElementById('fundGoalId').value = id;
    document.getElementById('fundGoalName').value = goal.name;
    document.getElementById('fundGoalAmount').value = '';
    openModal('addFundGoalModal');
}

async function handleAddFundGoal() {
    const id = document.getElementById('fundGoalId')?.value;
    const amount = parseRupiah(document.getElementById('fundGoalAmount')?.value || '0');
    if (!id || !amount) return alert('Masukkan nominal');
    await addToGoal(id, amount);
    closeModal('addFundGoalModal');
    await loadGoalsPage();
}

async function handleWithdrawGoal(id) {
    // Open modal with goal data
    const goals = await getGoals();
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    document.getElementById('withdrawGoalId').value = id;
    document.getElementById('withdrawGoalName').value = goal.name;
    document.getElementById('withdrawGoalAmount').value = '';

    // Populate wallet select
    const wallets = await getWallets();
    const walletSelect = document.getElementById('withdrawGoalWallet');
    if (walletSelect) {
        walletSelect.innerHTML = '<option value="">Pilih Dompet</option>' +
            wallets.map(w => `<option value="${w.id}">${escapeHtml(w.name)} (${formatRupiah(w.balance || 0)})</option>`).join('');
    }

    openModal('withdrawGoalModal');
}

async function handleWithdrawGoalSubmit() {
    const id = document.getElementById('withdrawGoalId')?.value;
    const amount = parseRupiah(document.getElementById('withdrawGoalAmount')?.value || '0');
    const walletId = document.getElementById('withdrawGoalWallet')?.value;
    if (!id || !amount) return alert('Masukkan nominal');

    await withdrawFromGoal(id, amount);

    // Add as income to selected wallet
    if (walletId) {
        const wallets = await getWallets();
        const wallet = wallets.find(w => w.id === walletId);
        await addTransaction({
            type: 'income',
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            walletId: walletId,
            walletName: wallet ? wallet.name : '',
            category: 'Other',
            description: 'Tarik dana dari tujuan keuangan'
        });
    }

    closeModal('withdrawGoalModal');
    await loadGoalsPage();
}

async function handleDeleteGoal(id) {
    if (confirm('Hapus tujuan ini?')) {
        await deleteGoal(id);
        await loadGoalsPage();
    }
}

// ============================================
// ASSETS PAGE
// ============================================
async function loadAssetsPage() {
    const assets = await getAssets();
    const totalValue = assets.reduce((s, a) => s + (a.value || 0), 0);

    const asAmount = document.querySelector('.as-amount');
    if (asAmount) asAmount.textContent = formatRupiah(totalValue);

    const liquid = assets.filter(a => a.type === 'liquid');
    const fixed = assets.filter(a => a.type === 'fixed');
    const liquidTotal = liquid.reduce((s, a) => s + (a.value || 0), 0);
    const fixedTotal = fixed.reduce((s, a) => s + (a.value || 0), 0);

    // Update breakdown
    const breakdown = document.querySelector('.asset-breakdown');
    if (breakdown) {
        breakdown.innerHTML = `
            <div class="ab-item"><span class="ab-icon liquid"><i class="fas fa-coins"></i></span><span class="ab-name">Aset Likuid</span><span class="ab-amount">${formatRupiah(liquidTotal)}</span></div>
            <div class="ab-item"><span class="ab-icon fixed"><i class="fas fa-home"></i></span><span class="ab-name">Aset Tetap</span><span class="ab-amount">${formatRupiah(fixedTotal)}</span></div>
        `;
    }

    // Render asset lists
    const assetList = document.getElementById('assetList') || document.querySelector('.asset-list');
    if (assetList) {
        if (assets.length === 0) {
            assetList.innerHTML = '<div class="empty-state">Belum ada aset. Tambahkan aset pertamamu!</div>';
        } else {
            assetList.innerHTML = assets.map(a => `
                <div class="asset-item">
                    <div class="ai-icon ${a.type === 'liquid' ? 'gold' : 'house'}"><i class="fas fa-${a.type === 'liquid' ? 'coins' : 'home'}"></i></div>
                    <div class="ai-info"><span class="ai-name">${escapeHtml(a.name)}</span><span class="ai-type">${a.type}</span></div>
                    <span class="ai-amount">${formatRupiah(a.value)}</span>
                    <button class="btn-icon-sm red" onclick="handleDeleteAsset('${a.id}')" style="margin-left:8px"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
        }
    }
}

async function handleDeleteAsset(id) {
    if (confirm('Hapus aset ini?')) {
        await deleteAsset(id);
        await loadAssetsPage();
    }
}

// ============================================
// DEBTS PAGE
// ============================================
async function loadDebtsPage() {
    const debts = await getDebts();
    const activeDebts = debts.filter(d => d.status !== 'lunas');
    const totalRemaining = activeDebts.reduce((s, d) => s + (d.remaining || 0), 0);
    const totalPrincipal = debts.reduce((s, d) => s + (d.totalPrincipal || 0), 0);
    const totalPaid = totalPrincipal - totalRemaining;
    const monthlyTotal = activeDebts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);

    const dsAmount = document.querySelector('.ds-amount');
    if (dsAmount) dsAmount.textContent = formatRupiah(totalRemaining);

    const debtList = document.getElementById('debtList') || document.querySelector('.debt-list');
    if (debtList) {
        if (debts.length === 0) {
            debtList.innerHTML = '<div class="empty-state">Belum ada hutang. Tambahkan data hutang!</div>';
        } else {
            debtList.innerHTML = debts.map(d => {
                const paidPct = d.totalPrincipal > 0 ? Math.round(((d.totalPrincipal - d.remaining) / d.totalPrincipal) * 100) : 0;
                return `<div class="debt-card">
                    <div class="dc-header">
                        <div class="dc-icon"><i class="fas fa-file-invoice-dollar"></i></div>
                        <div class="dc-info"><h4>${escapeHtml(d.name)}</h4><span class="dc-type">${d.status === 'lunas' ? '✅ Lunas' : 'Aktif'}</span></div>
                    </div>
                    <div class="dc-details">
                        <div class="dc-row"><span>Sisa Hutang</span><span class="dc-value">${formatRupiah(d.remaining)}</span></div>
                        <div class="dc-row"><span>Cicilan / Bulan</span><span class="dc-value">${formatRupiah(d.monthlyPayment)}</span></div>
                    </div>
                    <div class="dc-progress"><div class="dc-bar"><div class="dc-fill ${paidPct >= 50 ? 'green' : ''}" style="width:${paidPct}%"></div></div><span>${paidPct}% lunas</span></div>
                    <div style="display:flex;gap:8px;margin-top:12px">
                        <button class="btn-pay" onclick="handlePayDebt('${d.id}')"><i class="fas fa-money-bill-wave"></i> Bayar</button>
                        <button class="btn-icon-sm red" onclick="handleDeleteDebt('${d.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
        }
    }
}

async function handlePayDebt(id) {
    // Open modal with debt data
    const debts = await getDebts();
    const debt = debts.find(d => d.id === id);
    if (!debt) return;
    document.getElementById('payDebtId').value = id;
    document.getElementById('payDebtName').value = debt.name;
    document.getElementById('payDebtRemaining').value = formatRupiah(debt.remaining);
    document.getElementById('payDebtAmount').value = '';
    openModal('payDebtModal');
}

async function handlePayDebtSubmit() {
    const id = document.getElementById('payDebtId')?.value;
    const amount = parseRupiah(document.getElementById('payDebtAmount')?.value || '0');
    if (!id || !amount) return alert('Masukkan nominal');
    await payDebt(id, amount);
    closeModal('payDebtModal');
    await loadDebtsPage();
}

async function handleDeleteDebt(id) {
    if (confirm('Hapus data hutang ini?')) {
        await deleteDebt(id);
        await loadDebtsPage();
    }
}

// ============================================
// RECEIVABLES PAGE
// ============================================
async function loadReceivablesPage() {
    const receivables = await getReceivables();
    const active = receivables.filter(r => r.status !== 'lunas');
    const totalRemaining = active.reduce((s, r) => s + (r.remaining || 0), 0);
    const totalCollected = receivables.reduce((s, r) => s + (r.collected || 0), 0);

    const rsAmount = document.getElementById('receivableTotalRemaining');
    if (rsAmount) rsAmount.textContent = formatRupiah(totalRemaining);

    const rsTotalLent = document.getElementById('receivableTotalLent');
    if (rsTotalLent) rsTotalLent.textContent = formatRupiah(receivables.reduce((s, r) => s + (r.totalLent || 0), 0));

    const rsCollected = document.getElementById('receivableTotalCollected');
    if (rsCollected) rsCollected.textContent = formatRupiah(totalCollected);

    const rsProgressText = document.getElementById('receivableProgressText');
    if (rsProgressText) rsProgressText.textContent = `PROGRES PENAGIHAN: ${formatRupiah(totalCollected)} terkumpul`;

    const list = document.getElementById('receivableList') || document.querySelector('.receivable-list');
    if (list) {
        if (receivables.length === 0) {
            list.innerHTML = '<div class="empty-state">Belum ada piutang</div>';
        } else {
            list.innerHTML = receivables.map(r => {
                const pct = r.totalLent > 0 ? Math.round((r.collected / r.totalLent) * 100) : 0;
                return `<div class="receivable-card">
                    <div class="rc-header"><h4>${escapeHtml(r.name)}</h4></div>
                    <div class="rc-row"><span>Peminjam</span><span class="rc-value">${escapeHtml(r.borrower || '-')}</span></div>
                    <div class="rc-row"><span>Sisa Piutang</span><span class="rc-value">${formatRupiah(r.remaining)}</span></div>
                    <div class="rc-row"><span>Jatuh Tempo</span><span class="rc-value">${r.dueDate || '-'}</span></div>
                    <div class="rc-progress"><div class="rc-bar"><div class="rc-fill" style="width:${pct}%"></div></div><span>Terkumpul: ${formatRupiah(r.collected)} / ${formatRupiah(r.totalLent)}</span></div>
                    <div style="display:flex;gap:8px;margin-top:12px">
                        <button class="btn-green" onclick="handleCollectReceivable('${r.id}')"><i class="fas fa-hand-holding-usd"></i> Terima</button>
                        <button class="btn-icon-sm red" onclick="handleDeleteReceivable('${r.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
        }
    }
}

async function handleCollectReceivable(id) {
    // Open modal with receivable data
    const receivables = await getReceivables();
    const rec = receivables.find(r => r.id === id);
    if (!rec) return;
    document.getElementById('collectReceivableId').value = id;
    document.getElementById('collectReceivableName').value = rec.name;
    document.getElementById('collectReceivableRemaining').value = formatRupiah(rec.remaining);
    document.getElementById('collectReceivableAmount').value = '';
    openModal('collectReceivableModal');
}

async function handleCollectReceivableSubmit() {
    const id = document.getElementById('collectReceivableId')?.value;
    const amount = parseRupiah(document.getElementById('collectReceivableAmount')?.value || '0');
    if (!id || !amount) return alert('Masukkan nominal');
    await collectReceivable(id, amount);
    closeModal('collectReceivableModal');
    await loadReceivablesPage();
}

async function handleDeleteReceivable(id) {
    if (confirm('Hapus piutang ini?')) {
        await deleteReceivable(id);
        await loadReceivablesPage();
    }
}

// ============================================
// INVESTMENTS PAGE
// ============================================
let portfolioChartInstance = null;

async function loadInvestmentsPage() {
    const investments = await getInvestments();
    const totalValue = investments.reduce((s, i) => s + (i.currentPrice || 0), 0);
    const totalBuy = investments.reduce((s, i) => s + (i.buyPrice || 0), 0);
    const profit = totalValue - totalBuy;
    const profitPct = totalBuy > 0 ? ((profit / totalBuy) * 100).toFixed(2) : 0;

    const isAmount = document.getElementById('investTotalValue');
    if (isAmount) isAmount.textContent = formatRupiah(totalValue);

    const isProfit = document.getElementById('investProfit');
    if (isProfit) {
        isProfit.className = `is-profit ${profit >= 0 ? 'green' : 'red'}`;
        isProfit.innerHTML = `<i class="fas fa-arrow-${profit >= 0 ? 'up' : 'down'}"></i> ${profit >= 0 ? '+' : ''}${formatRupiah(profit)} (${profitPct}%)`;
    }

    const list = document.getElementById('investmentList') || document.querySelector('.investment-list');
    if (list) {
        if (investments.length === 0) {
            list.innerHTML = '<div class="empty-state">Belum ada investasi</div>';
        } else {
            list.innerHTML = investments.map(i => {
                const change = i.buyPrice > 0 ? (((i.currentPrice - i.buyPrice) / i.buyPrice) * 100).toFixed(1) : 0;
                const typeIcons = { stock: 'chart-line', crypto: 'bitcoin', bond: 'file-contract' };
                return `<div class="investment-item">
                    <div class="ii-icon ${i.type}"><i class="fas fa-${typeIcons[i.type] || 'chart-line'}"></i></div>
                    <div class="ii-info"><span class="ii-name">${escapeHtml(i.name)}</span><span class="ii-type">${i.type}</span></div>
                    <div class="ii-data">
                        <span class="ii-amount">${formatRupiah(i.currentPrice)}</span>
                        <span class="ii-change ${change >= 0 ? 'green' : 'red'}">${change >= 0 ? '+' : ''}${change}%</span>
                    </div>
                    <button class="btn-icon-sm red" onclick="handleDeleteInvestment('${i.id}')" style="margin-left:8px"><i class="fas fa-trash"></i></button>
                </div>`;
            }).join('');
        }
    }

    // Chart
    const ctx = document.getElementById('portfolioChart');
    if (ctx && investments.length > 0) {
        if (portfolioChartInstance) portfolioChartInstance.destroy();
        const types = {};
        investments.forEach(i => { types[i.type] = (types[i.type] || 0) + (i.currentPrice || 0); });
        portfolioChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(types),
                datasets: [{ data: Object.values(types), backgroundColor: ['#00c853', '#ff9100', '#2979ff', '#7c4dff'], borderWidth: 0 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } }, cutout: '65%' }
        });
    }
}

async function handleDeleteInvestment(id) {
    if (confirm('Hapus investasi ini?')) {
        await deleteInvestment(id);
        await loadInvestmentsPage();
    }
}

// ============================================
// REPORTS PAGE
// ============================================
let expenseChartInstance = null;

async function loadReportsPage() {
    const wallets = await getWallets();
    const transactions = await getTransactions(200);
    const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

    const now = new Date();
    const thisMonth = transactions.filter(t => {
        const d = t.date ? new Date(t.date) : (t.createdAt ? t.createdAt.toDate() : null);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    // Update report cards
    const reportCards = document.querySelectorAll('.report-card');
    if (reportCards[0]) reportCards[0].querySelector('.rc-amount').textContent = formatRupiah(totalBalance);
    if (reportCards[1]) reportCards[1].querySelector('.rc-amount').textContent = formatRupiah(totalIncome);
    if (reportCards[2]) reportCards[2].querySelector('.rc-amount').textContent = formatRupiah(totalExpense);

    // Chart
    const ctx = document.getElementById('expenseChart');
    if (ctx) {
        if (expenseChartInstance) expenseChartInstance.destroy();
        // Group by month
        const months = {};
        transactions.forEach(t => {
            const d = t.date ? new Date(t.date) : (t.createdAt ? t.createdAt.toDate() : null);
            if (!d) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!months[key]) months[key] = { income: 0, expense: 0 };
            if (t.type === 'income') months[key].income += t.amount || 0;
            else months[key].expense += t.amount || 0;
        });
        const sorted = Object.entries(months).sort().slice(-6);
        expenseChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(([k]) => k),
                datasets: [
                    { label: 'Pemasukan', data: sorted.map(([, v]) => v.income), backgroundColor: '#00c853', borderRadius: 6 },
                    { label: 'Pengeluaran', data: sorted.map(([, v]) => v.expense), backgroundColor: '#ff1744', borderRadius: 6 }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatRupiah(v) } }, x: { grid: { display: false } } } }
        });
    }
}

// ============================================
// BUDGET PAGE
// ============================================
async function loadBudgetPage() {
    const wallets = await getWallets();
    const transactions = await getTransactions(200);
    const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

    // Load budget settings
    const budgetSettings = getLocalData('budgetSettings');
    const totalBudget = budgetSettings.totalBudget || totalBalance;

    // Calculate spending by category this month
    const now = new Date();
    const thisMonth = transactions.filter(t => {
        const d = t.date ? new Date(t.date) : (t.createdAt ? new Date(t.createdAt) : null);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'expense';
    });

    // Category mapping
    const needsCategories = ['Housing', 'Food & Dining', 'Transport', 'Health'];
    const wantsCategories = ['Shopping', 'Entertainment'];
    const savingsCategories = ['Investment'];

    const needsSpent = thisMonth.filter(t => needsCategories.includes(t.category)).reduce((s, t) => s + (t.amount || 0), 0);
    const wantsSpent = thisMonth.filter(t => wantsCategories.includes(t.category)).reduce((s, t) => s + (t.amount || 0), 0);
    const savingsSpent = thisMonth.filter(t => savingsCategories.includes(t.category)).reduce((s, t) => s + (t.amount || 0), 0);
    const totalSpent = needsSpent + wantsSpent + savingsSpent;

    const needsLimit = Math.round(totalBudget * 0.5);
    const wantsLimit = Math.round(totalBudget * 0.3);
    const savingsLimit = Math.round(totalBudget * 0.2);

    // Update overview
    const boAmount = document.querySelector('.bo-amount');
    if (boAmount) boAmount.textContent = formatRupiah(totalBalance);

    // Update budget categories
    const budgetCategories = document.querySelector('.budget-categories');
    if (budgetCategories) {
        budgetCategories.innerHTML = `
            <div class="section-card">
                <div class="section-header">
                    <h3>🟣 Kebutuhan</h3>
                    <span style="font-size:0.8rem;color:var(--text-light)">${formatRupiah(needsSpent)} / ${formatRupiah(needsLimit)}</span>
                </div>
                <div class="budget-category">
                    <div class="bc-bar"><div class="bc-fill" style="width:${needsLimit > 0 ? Math.min(Math.round(needsSpent/needsLimit*100), 100) : 0}%"></div></div>
                    <div class="bc-items">
                        ${needsCategories.map(cat => {
                            const spent = thisMonth.filter(t => t.category === cat).reduce((s, t) => s + (t.amount || 0), 0);
                            return spent > 0 ? `<div class="bci-row"><span><i class="fas fa-tag"></i> ${cat}</span><span>${formatRupiah(spent)}</span></div>` : '';
                        }).join('')}
                    </div>
                </div>
            </div>
            <div class="section-card">
                <div class="section-header">
                    <h3>🟠 Keinginan</h3>
                    <span style="font-size:0.8rem;color:var(--text-light)">${formatRupiah(wantsSpent)} / ${formatRupiah(wantsLimit)}</span>
                </div>
                <div class="budget-category">
                    <div class="bc-bar"><div class="bc-fill orange" style="width:${wantsLimit > 0 ? Math.min(Math.round(wantsSpent/wantsLimit*100), 100) : 0}%"></div></div>
                    <div class="bc-items">
                        ${wantsCategories.map(cat => {
                            const spent = thisMonth.filter(t => t.category === cat).reduce((s, t) => s + (t.amount || 0), 0);
                            return spent > 0 ? `<div class="bci-row"><span><i class="fas fa-tag"></i> ${cat}</span><span>${formatRupiah(spent)}</span></div>` : '';
                        }).join('')}
                    </div>
                </div>
            </div>
            <div class="section-card">
                <div class="section-header">
                    <h3>🔵 Tabungan & Investasi</h3>
                    <span style="font-size:0.8rem;color:var(--text-light)">${formatRupiah(savingsSpent)} / ${formatRupiah(savingsLimit)}</span>
                </div>
                <div class="budget-category">
                    <div class="bc-bar"><div class="bc-fill blue" style="width:${savingsLimit > 0 ? Math.min(Math.round(savingsSpent/savingsLimit*100), 100) : 0}%"></div></div>
                </div>
            </div>
        `;
    }

    // Show wallets
    const wmList = document.querySelector('.wallet-mini-list');
    if (wmList) {
        if (wallets.length === 0) {
            wmList.innerHTML = '<div class="empty-state">Belum ada dompet</div>';
        } else {
            wmList.innerHTML = wallets.map(w => `
                <div class="wm-item">
                    <div class="wm-icon"><i class="fas fa-${w.type === 'bank' ? 'university' : w.type === 'ewallet' ? 'mobile-alt' : 'money-bill-wave'}"></i></div>
                    <div class="wm-info"><span class="wm-name">${escapeHtml(w.name)}</span><span class="wm-type">${w.type}</span></div>
                    <span class="wm-amount">${formatRupiah(w.balance || 0)}</span>
                </div>
            `).join('');
        }
    }
}

// Set Budget
function setBudget() {
    const current = getLocalData('budgetSettings');
    const amount = prompt('Masukkan total budget bulanan (Rp):', current.totalBudget || '0');
    if (amount !== null) {
        const parsed = parseRupiah(amount);
        if (parsed > 0) {
            setLocalData('budgetSettings', { totalBudget: parsed });
            loadBudgetPage();
        }
    }
}

// ============================================
// SETTINGS PAGE
// ============================================
async function loadSettingsPage() {
    const subs = await getSubscriptions();
    const subTotal = subs.reduce((s, sub) => s + (sub.amount || 0), 0);

    const subList = document.getElementById('subscriptionList') || document.querySelector('.subscription-list');
    if (subList) {
        if (subs.length === 0) {
            subList.innerHTML = '<div class="empty-state">Belum ada langganan</div>';
        } else {
            subList.innerHTML = subs.map(s => `
                <div class="sub-item">
                    <div class="sub-icon"><i class="fas fa-sync"></i></div>
                    <div class="sub-info"><span class="sub-name">${escapeHtml(s.name)}</span><span class="sub-detail">${escapeHtml(s.category || '-')} • ${escapeHtml(s.frequency || 'Bulanan')}</span></div>
                    <span class="sub-amount red">-${formatRupiah(s.amount)}</span>
                    <div class="sub-actions"><button class="btn-icon-sm red" onclick="handleDeleteSub('${s.id}')"><i class="fas fa-trash"></i></button></div>
                </div>
            `).join('');
        }
    }

    // Set profile fields
    const nameInput = document.querySelector('#settingsName');
    if (nameInput) nameInput.value = getUserDisplayName();
}

async function handleDeleteSub(id) {
    if (confirm('Hapus langganan ini?')) {
        await deleteSubscription(id);
        await loadSettingsPage();
    }
}

// ============================================
// MODAL HANDLERS (Form Submissions)
// ============================================

// Add Wallet
async function handleAddWallet() {
    const name = document.getElementById('walletName')?.value?.trim();
    const type = document.getElementById('walletType')?.value;
    const balance = parseRupiah(document.getElementById('walletBalance')?.value || '0');

    if (!name) return alert('Nama dompet wajib diisi');

    await addWallet({ name, type, balance });
    closeModal('addWalletModal');
    await loadWalletsPage();
    document.getElementById('walletName').value = '';
    document.getElementById('walletBalance').value = '';
}

// Add Transaction
async function handleAddTransaction() {
    const type = document.querySelector('.mt-tab.active')?.dataset?.txType || 'expense';
    const amount = parseRupiah(document.getElementById('txAmount')?.value || '0');
    const date = document.getElementById('txDate')?.value;
    const walletId = document.getElementById('txWallet')?.value;
    const category = document.getElementById('txCategory')?.value;
    const description = document.getElementById('txDescription')?.value?.trim();

    if (!amount) return alert('Nominal wajib diisi');

    // Get wallet name
    let walletName = '';
    if (walletId) {
        const wallets = await getWallets();
        const w = wallets.find(w => w.id === walletId);
        walletName = w ? w.name : '';
    }

    await addTransaction({ type, amount, date, walletId, walletName, category, description });
    closeModal('addTransactionModal');
    await loadTransactionsPage();
    document.getElementById('txAmount').value = '';
    document.getElementById('txDescription').value = '';
}

// Add Goal
async function handleAddGoal() {
    const name = document.getElementById('goalName')?.value?.trim();
    const target = parseRupiah(document.getElementById('goalTarget')?.value || '0');
    const targetDate = document.getElementById('goalDate')?.value;
    const icon = document.querySelector('#addGoalModal .tag.active')?.textContent || '🎯';

    if (!name) return alert('Nama tujuan wajib diisi');
    if (!target) return alert('Target nominal wajib diisi');

    await addGoal({ name, target, targetDate, icon, current: 0 });
    closeModal('addGoalModal');
    await loadGoalsPage();
    document.getElementById('goalName').value = '';
    document.getElementById('goalTarget').value = '';
}

// Add Asset
async function handleAddAsset() {
    const name = document.getElementById('assetName')?.value?.trim();
    const type = document.getElementById('assetType')?.value;
    const value = parseRupiah(document.getElementById('assetValue')?.value || '0');

    if (!name) return alert('Nama aset wajib diisi');

    await addAsset({ name, type, value });
    closeModal('addAssetModal');
    await loadAssetsPage();
    document.getElementById('assetName').value = '';
    document.getElementById('assetValue').value = '';
}

// Add Debt
async function handleAddDebt() {
    const name = document.getElementById('debtName')?.value?.trim();
    const totalPrincipal = parseRupiah(document.getElementById('debtPrincipal')?.value || '0');
    const monthlyPayment = parseRupiah(document.getElementById('debtMonthly')?.value || '0');
    const dueDate = document.getElementById('debtDueDate')?.value;

    if (!name) return alert('Nama hutang wajib diisi');

    await addDebt({ name, totalPrincipal, remaining: totalPrincipal, monthlyPayment, dueDate, status: 'aktif' });
    closeModal('addDebtModal');
    await loadDebtsPage();
    document.getElementById('debtName').value = '';
    document.getElementById('debtPrincipal').value = '';
    document.getElementById('debtMonthly').value = '';
}

// Add Receivable
async function handleAddReceivable() {
    const name = document.getElementById('receivableName')?.value?.trim();
    const borrower = document.getElementById('receivableBorrower')?.value?.trim();
    const totalLent = parseRupiah(document.getElementById('receivableTotalLent')?.value || '0');
    const dueDate = document.getElementById('receivableDueDate')?.value;

    if (!name) return alert('Nama piutang wajib diisi');

    await addReceivable({ name, borrower, totalLent, remaining: totalLent, collected: 0, dueDate, status: 'aktif' });
    closeModal('addReceivableModal');
    await loadReceivablesPage();
    document.getElementById('receivableName').value = '';
    document.getElementById('receivableBorrower').value = '';
    document.getElementById('receivableTotalLent').value = '';
}

// Add Investment
async function handleAddInvestment() {
    const name = document.getElementById('investName')?.value?.trim();
    const type = document.getElementById('investType')?.value;
    const buyPrice = parseRupiah(document.getElementById('investBuyPrice')?.value || '0');
    const currentPrice = parseRupiah(document.getElementById('investCurrentPrice')?.value || '0');

    if (!name) return alert('Nama investasi wajib diisi');

    await addInvestment({ name, type, buyPrice, currentPrice });
    closeModal('addInvestmentModal');
    await loadInvestmentsPage();
    document.getElementById('investName').value = '';
    document.getElementById('investBuyPrice').value = '';
    document.getElementById('investCurrentPrice').value = '';
}

// Add Subscription
async function handleAddSubscription() {
    const name = document.getElementById('subName')?.value?.trim();
    const category = document.getElementById('subCategory')?.value;
    const amount = parseRupiah(document.getElementById('subAmount')?.value || '0');
    const frequency = document.getElementById('subFrequency')?.value;
    const dueDate = document.getElementById('subDueDate')?.value;

    if (!name) return alert('Nama langganan wajib diisi');

    await addSubscription({ name, category, amount, frequency, dueDate });
    closeModal('addSubscriptionModal');
    await loadSettingsPage();
    document.getElementById('subName').value = '';
    document.getElementById('subAmount').value = '';
}

// ============================================
// SCAN STRUK AI
// ============================================

// Sample receipt items for simulation
const SAMPLE_RECEIPTS = [
    { store: 'TOKO SEJAHTERA', items: [
        { name: 'Pop Mie Ayam 75g', qty: 1, price: 4900 },
        { name: 'Pop Mie Pedas Dower 75g', qty: 1, price: 5400 },
        { name: 'Teh Botol Sosro 350ml', qty: 2, price: 5000 },
        { name: 'Chitato Sapi Panggang 68g', qty: 1, price: 12500 },
        { name: 'Aqua 600ml', qty: 3, price: 3500 }
    ]},
    { store: 'INDOMARET', items: [
        { name: 'Indomie Goreng', qty: 5, price: 3500 },
        { name: 'Beras Premium 5kg', qty: 1, price: 62000 },
        { name: 'Minyak Goreng 1L', qty: 1, price: 14500 },
        { name: 'Gula Pasir 1kg', qty: 1, price: 13000 }
    ]},
    { store: 'ALFAMART', items: [
        { name: 'Kopi Good Day 10s', qty: 1, price: 18500 },
        { name: 'Susu UHT Coklat 1L', qty: 2, price: 12000 },
        { name: 'Roti Tawar', qty: 1, price: 15000 },
        { name: 'Telur 1kg', qty: 1, price: 28000 }
    ]}
];

function initScanUpload() {
    const fileInput = document.getElementById('scanFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleScanFile);
    }
}

function handleScanFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
        // Show preview
        const preview = document.getElementById('scanPreview');
        const previewImg = document.getElementById('scanPreviewImg');
        const processing = document.getElementById('scanProcessing');
        const results = document.getElementById('scanResults');
        const uploadArea = document.getElementById('scanUploadArea');

        previewImg.src = ev.target.result;
        preview.style.display = 'block';
        uploadArea.style.display = 'none';
        processing.style.display = 'block';
        results.style.display = 'none';

        // Simulate AI processing
        await new Promise(r => setTimeout(r, 2000));

        // Get random receipt data
        const receipt = SAMPLE_RECEIPTS[Math.floor(Math.random() * SAMPLE_RECEIPTS.length)];
        const total = receipt.items.reduce((s, i) => s + (i.qty * i.price), 0);

        // Fill results
        document.getElementById('scanTotal').value = formatRupiah(total);
        document.getElementById('scanDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('scanItems').innerHTML = receipt.items.map(i => 
            `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9">
                <span>${i.name} (x${i.qty})</span>
                <span style="font-weight:600">${formatRupiah(i.qty * i.price)}</span>
            </div>`
        ).join('') + `<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;border-top:2px solid var(--border)">
            <span>TOTAL</span>
            <span>${formatRupiah(total)}</span>
        </div>`;

        // Populate wallet select
        const wallets = await getWallets();
        const walletSelect = document.getElementById('scanWallet');
        walletSelect.innerHTML = '<option value="">Pilih Dompet</option>' + 
            wallets.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');

        processing.style.display = 'none';
        results.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function saveScanResult() {
    const total = parseRupiah(document.getElementById('scanTotal')?.value || '0');
    const date = document.getElementById('scanDate')?.value;
    const walletId = document.getElementById('scanWallet')?.value;
    const category = document.getElementById('scanCategory')?.value || 'Food & Dining';

    if (!total) return alert('Total tidak valid');
    if (!walletId) return alert('Pilih dompet');

    let walletName = '';
    const wallets = await getWallets();
    const w = wallets.find(w => w.id === walletId);
    walletName = w ? w.name : '';

    await addTransaction({
        type: 'expense',
        amount: total,
        date: date,
        walletId: walletId,
        walletName: walletName,
        category: category,
        description: 'Scan Struk AI'
    });

    closeModal('scanModal');
    // Reset scan modal
    document.getElementById('scanUploadArea').style.display = 'block';
    document.getElementById('scanPreview').style.display = 'none';
    document.getElementById('scanResults').style.display = 'none';
    document.getElementById('scanFileInput').value = '';

    // Reload current page
    const activePage = document.querySelector('.page.active');
    if (activePage) {
        const pageName = activePage.id.replace('page-', '');
        await loadPageData(pageName);
    }

    alert('Transaksi dari struk berhasil disimpan! ✅');
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('open');
        // Set default date
        const dateInput = modal.querySelector('input[type="date"]');
        if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];

        // Populate wallet selects when opening transaction or scan modal
        if (id === 'addTransactionModal' || id === 'scanModal') {
            getWallets().then(wallets => populateWalletSelects(wallets));
        }
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
});

// ============================================
// AI CHAT
// ============================================
function toggleChat() {
    const panel = document.getElementById('aiChatPanel');
    if (panel) panel.classList.toggle('open');
}

function sendChat() {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');
    const text = input.value.trim();
    if (!text) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.innerHTML = `<div class="msg-avatar"><i class="fas fa-user"></i></div>
        <div class="msg-content"><p>${escapeHtml(text)}</p><span class="msg-time">${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
    messages.appendChild(userMsg);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'msg bot';
        botMsg.innerHTML = `<div class="msg-avatar"><i class="fas fa-robot"></i></div>
            <div class="msg-content"><p>Halo ${getUserDisplayName()}! 👋 Saya SARANG AI. Ada yang bisa saya bantu? Coba tanya tentang budget, tabungan, atau pengeluaranmu!</p>
            <span class="msg-time">${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
        messages.appendChild(botMsg);
        messages.scrollTop = messages.scrollHeight;
    }, 800);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement?.id === 'chatInput') sendChat();
});

// ============================================
// NUMBER FORMATTING
// ============================================

// Format number with dots while typing
function formatNumberInput(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        // Add dots every 3 digits from right
        value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    input.value = value;
}

// Initialize number formatting on all amount inputs
function initNumberFormatting() {
    const amountInputs = document.querySelectorAll(
        '#txAmount, #walletBalance, #goalTarget, #assetValue, #debtPrincipal, #debtMonthly, ' +
        '#receivableTotalLent, #investBuyPrice, #investCurrentPrice, #subAmount, ' +
        '#fundGoalAmount, #withdrawGoalAmount, #payDebtAmount, #collectReceivableAmount, #scanTotal'
    );
    amountInputs.forEach(input => {
        input.addEventListener('input', () => formatNumberInput(input));
        input.addEventListener('focus', () => formatNumberInput(input));
    });
}

// ============================================
// UTILITY
// ============================================

// Parse Rupiah with dots to number
function parseRupiah(str) {
    if (typeof str === 'number') return str;
    return parseInt(String(str).replace(/[^0-9]/g, '')) || 0;
}

function formatRupiah(number) {
    return 'Rp ' + Number(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Selamat Pagi';
    if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
    else if (hour >= 18) greeting = 'Selamat Malam';

    const el = document.getElementById('greetingText') || document.querySelector('.greeting-card h2');
    if (el) el.textContent = `${greeting}, ${getUserDisplayName()}! 👋`;
}

// Logout button
document.addEventListener('click', (e) => {
    if (e.target.closest('.logout-btn')) {
        logoutUser();
    }
});

// ============================================
// EXPORT / IMPORT DATA
// ============================================

async function exportData() {
    const data = {
        version: '1.0',
        app: 'SARANG WALLET',
        exportDate: new Date().toISOString(),
        user: {
            name: getUserDisplayName(),
            email: currentUser?.email
        },
        wallets: getLocalData('wallets'),
        transactions: getLocalData('transactions'),
        goals: getLocalData('goals'),
        debts: getLocalData('debts'),
        receivables: getLocalData('receivables'),
        investments: getLocalData('investments'),
        assets: getLocalData('assets'),
        subscriptions: getLocalData('subscriptions')
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sarang-wallet-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.version || !data.wallets) {
                return alert('File backup tidak valid!');
            }

            if (data.wallets) setLocalData('wallets', data.wallets);
            if (data.transactions) setLocalData('transactions', data.transactions);
            if (data.goals) setLocalData('goals', data.goals);
            if (data.debts) setLocalData('debts', data.debts);
            if (data.receivables) setLocalData('receivables', data.receivables);
            if (data.investments) setLocalData('investments', data.investments);
            if (data.assets) setLocalData('assets', data.assets);
            if (data.subscriptions) setLocalData('subscriptions', data.subscriptions);

            alert('Data berhasil di-import! ✅');

            // Reload current page
            const activePage = document.querySelector('.page.active');
            if (activePage) {
                const pageName = activePage.id.replace('page-', '');
                await loadPageData(pageName);
            }
        } catch (err) {
            alert('Gagal import: ' + err.message);
        }
    };
    input.click();
}
