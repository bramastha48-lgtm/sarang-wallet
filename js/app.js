// ============================================
// WLLT-e App JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Set current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('id-ID', options);
    }

    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('pageTitle');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarClose = document.getElementById('sidebarClose');

    function navigateTo(pageName) {
        // Update nav items
        navItems.forEach(item => item.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update pages
        pages.forEach(page => page.classList.remove('active'));
        const activePage = document.getElementById(`page-${pageName}`);
        if (activePage) activePage.classList.add('active');

        // Update title
        const titles = {
            home: 'Beranda',
            wallets: 'Dompet',
            transactions: 'Transaksi',
            budget: 'Anggaran',
            goals: 'Tujuan Keuangan',
            assets: 'Aset',
            debts: 'Hutang',
            receivables: 'Piutang',
            investments: 'Investasi',
            reports: 'Laporan',
            settings: 'Pengaturan'
        };
        if (pageTitle) pageTitle.textContent = titles[pageName] || pageName;

        // Close sidebar on mobile
        sidebar.classList.remove('open');

        // Initialize charts if needed
        if (pageName === 'investments') initPortfolioChart();
        if (pageName === 'reports') initExpenseChart();
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    // Quick action buttons
    document.querySelectorAll('.qa-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.page);
        });
    });

    // See all links
    document.querySelectorAll('.see-all').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });

    // Mobile menu
    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.add('open'));
    }
    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    // Add transaction button
    const addBtn = document.getElementById('addTransactionBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openModal('addTransactionModal'));
    }

    // Modal tabs
    document.querySelectorAll('.modal-tabs').forEach(tabGroup => {
        const tabs = tabGroup.querySelectorAll('.mt-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    });

    // Quick amount buttons
    document.querySelectorAll('.mb-quick-amounts button').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.querySelector('.mb-amount-input');
            if (input) {
                const current = parseInt(input.value.replace(/\D/g, '')) || 0;
                const add = parseInt(btn.textContent.replace(/\D/g, '')) || 0;
                const newValue = current + add;
                input.value = formatRupiah(newValue);
            }
        });
    });

    // Tags
    document.querySelectorAll('.mb-tags .tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const parent = tag.parentElement;
            parent.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
        });
    });

    // Filter tabs
    document.querySelectorAll('.filter-tabs').forEach(tabGroup => {
        const tabs = tabGroup.querySelectorAll('.ft-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    });

    // Settings tabs
    document.querySelectorAll('.settings-tabs').forEach(tabGroup => {
        const tabs = tabGroup.querySelectorAll('.st-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    });

    // Notification button
    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            alert('Tidak ada notifikasi baru');
        });
    }

    // Greeting based on time
    updateGreeting();
});

// ---- Modal Functions ----
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('open');
        }
    });
});

// ---- Chat Functions ----
function toggleChat() {
    const panel = document.getElementById('aiChatPanel');
    panel.classList.toggle('open');
}

function sendChat() {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');
    const text = input.value.trim();
    if (!text) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.innerHTML = `
        <div class="msg-avatar"><i class="fas fa-user"></i></div>
        <div class="msg-content">
            <p>${escapeHtml(text)}</p>
            <span class="msg-time">${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;
    messages.appendChild(userMsg);

    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Simulate AI response
    setTimeout(() => {
        const responses = getAIResponse(text);
        const botMsg = document.createElement('div');
        botMsg.className = 'msg bot';
        botMsg.innerHTML = `
            <div class="msg-avatar"><i class="fas fa-robot"></i></div>
            <div class="msg-content">
                <p>${responses}</p>
                <span class="msg-time">${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        `;
        messages.appendChild(botMsg);
        messages.scrollTop = messages.scrollHeight;
    }, 1000);
}

// Enter key for chat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'chatInput') {
        sendChat();
    }
});

function getAIResponse(input) {
    const lower = input.toLowerCase();

    if (lower.includes('analisa') || lower.includes('analisis') || lower.includes('pengeluaran')) {
        return `📊 <strong>Analisis Pengeluaran Minggu Ini:</strong><br><br>
Total pengeluaran: <strong>Rp 4.040.000</strong><br><br>
• Housing: Rp 3.500.000 (87%) - masih dalam batas normal<br>
• Shopping: Rp 375.000 (9%) - cukup terkendali<br>
• Food & Dining: Rp 165.000 (4%) - sangat baik!<br><br>
💡 Tips: Untuk minggu depan, coba kurangi pengeluaran shopping sedikit ya!`;
    }

    if (lower.includes('budget') || lower.includes('anggaran')) {
        return `💰 <strong>Status Budget Bulan Ini:</strong><br><br>
Sisa budget: <strong>Rp 43.060.000</strong><br>
Total budget: Rp 47.100.000<br>
Terpakai: Rp 4.040.000 (8.6%)<br><br>
✅ Kamu masih on track! Pertahankan!`;
    }

    if (lower.includes('tabung') || lower.includes('saving') || lower.includes('nabung')) {
        return `🏦 <strong>Progress Tabungan:</strong><br><br>
• Dana Darurat: 42% (Rp 25.000.000 / Rp 60.000.000)<br>
• Liburan Jepang: 34% (Rp 8.500.000 / Rp 25.000.000)<br><br>
💡 Kamu perlu nabung Rp 1.178.572/bulan untuk capai target liburan!`;
    }

    if (lower.includes('hutang') || lower.includes('debt') || lower.includes('cicilan')) {
        return `📋 <strong>Status Hutang:</strong><br><br>
• KPR Bank Mandiri: Rp 280.000.000 sisa (20% lunas)<br>
• Cicilan Motor: Rp 8.000.000 sisa (67% lunas)<br><br>
Total cicilan/bulan: Rp 3.800.000<br>
💡 Bagus! Motor Vario hampir lunas!`;
    }

    if (lower.includes('investasi') || lower.includes('portfolio')) {
        return `📈 <strong>Portofolio Investasi:</strong><br><br>
Total: <strong>Rp 32.078.376</strong><br>
Keuntungan: +Rp 3.558.876 (+12.48%)<br><br>
• BBCA: +25% 🚀<br>
• BBRI: +16%<br>
• BTC: +14%<br>
• Obligasi: +4%<br><br>
💡 Performa investasimu bagus bulan ini!`;
    }

    return `Halo! 👋 Saya WLLT-Ai, asisten keuanganmu.<br><br>
Saya bisa membantu:<br>
• 📊 Analisis pengeluaran<br>
• 💰 Cek budget<br>
• 🏦 Status tabungan<br>
• 📋 Info hutang<br>
• 📈 Portofolio investasi<br><br>
Coba tanyakan salah satu di atas!`;
}

// ---- Charts ----
let portfolioChartInstance = null;
let expenseChartInstance = null;

function initPortfolioChart() {
    const ctx = document.getElementById('portfolioChart');
    if (!ctx) return;

    if (portfolioChartInstance) portfolioChartInstance.destroy();

    portfolioChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Saham', 'Crypto', 'Obligasi'],
            datasets: [{
                data: [18300000, 3428376, 10350000],
                backgroundColor: ['#00c853', '#ff9100', '#2979ff'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { family: 'Inter', size: 12 }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function initExpenseChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    if (expenseChartInstance) expenseChartInstance.destroy();

    expenseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'],
            datasets: [
                {
                    label: 'Pemasukan',
                    data: [15000000, 16500000, 14000000, 17000000, 15500000, 16000000, 17000000],
                    backgroundColor: '#00c853',
                    borderRadius: 6
                },
                {
                    label: 'Pengeluaran',
                    data: [12000000, 13500000, 11000000, 14000000, 12500000, 13000000, 4040000],
                    backgroundColor: '#ff1744',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { family: 'Inter', size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => 'Rp ' + (value / 1000000).toFixed(0) + 'Jt',
                        font: { family: 'Inter' }
                    },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    grid: { display: false },
                    font: { family: 'Inter' }
                }
            }
        }
    });
}

// ---- Utility Functions ----
function formatRupiah(number) {
    return 'Rp ' + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateGreeting() {
    const hour = new Date().getHours();
    const greetingCard = document.querySelector('.greeting-card h2');
    if (!greetingCard) return;

    let greeting = 'Selamat Pagi';
    if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
    else if (hour >= 18) greeting = 'Selamat Malam';

    greetingCard.textContent = `${greeting}, Ricky! 👋`;
}
