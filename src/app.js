// Main application controller
const App = {
    state: {
        currentTab: 'dashboard',
        settings: null,
        farmers: [],
        mills: [],
        vehicles: [],
        loads: [],
        currentPage: 1,
        itemsPerPage: 50
    },

    async init() {
        try {
            await DB.init();
            await DB.seedData();
            await this.loadSettings();
            await this.loadAllData();

            this.setupEventListeners();
            this.showDashboard();

            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            Utils.showToast('Failed to initialize application', 'error');
        }
    },

    async loadSettings() {
        this.state.settings = await DB.get('settings', 1);
        const orgName = document.getElementById('org-name');
        if (orgName && this.state.settings) {
            orgName.textContent = this.state.settings.organization_name;
        }
    },

    async loadAllData() {
        this.state.farmers = await DB.getAll('farmers');
        this.state.mills = await DB.getAll('mills');
        this.state.vehicles = await DB.getAll('vehicles');
        this.state.loads = await DB.getAll('loads');
    },

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Modal close
        const modal = document.getElementById('modal');
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => this.closeModal());

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Backup/Restore
        document.getElementById('backup-btn').addEventListener('click', () => this.backup());
        document.getElementById('restore-btn').addEventListener('click', () => this.restore());
    },

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        this.state.currentTab = tabName;

        // Load tab content
        switch(tabName) {
            case 'dashboard':
                this.showDashboard();
                break;
            case 'loads':
                Loads.show();
                break;
            case 'farmers':
                Farmers.show();
                break;
            case 'mills':
                Mills.show();
                break;
            case 'vehicles':
                Vehicles.show();
                break;
            case 'mill-payments':
                Payments.showMillPayments();
                break;
            case 'farmer-payouts':
                Payments.showFarmerPayouts();
                break;
            case 'master-data':
                MasterData.show();
                break;
            case 'reports':
                Reports.show();
                break;
            case 'settings':
                this.showSettings();
                break;
        }
    },

    async showDashboard() {
        const stats = await this.getDashboardStats();

        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-label">Today's Loads</div>
                    <div class="stat-value">${stats.todayLoads}</div>
                    <div class="stat-sub">${stats.todayBags} bags</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Month Profit</div>
                    <div class="stat-value">${CalcEngine.formatCurrency(stats.monthProfit)}</div>
                    <div class="stat-sub">This month</div>
                </div>
                <div class="stat-card stat-warning">
                    <div class="stat-label">Pending from Mills</div>
                    <div class="stat-value">${CalcEngine.formatCurrency(stats.pendingFromMills)}</div>
                    <div class="stat-sub">${stats.pendingMillLoads} loads</div>
                </div>
                <div class="stat-card stat-danger">
                    <div class="stat-label">Pending to Farmers</div>
                    <div class="stat-value">${CalcEngine.formatCurrency(stats.pendingToFarmers)}</div>
                    <div class="stat-sub">${stats.pendingFarmerLoads} loads</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Recent Loads</div>
                ${this.renderRecentLoads(stats.recentLoads)}
            </div>

            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">Loads by Status</div>
                    ${this.renderStatusBreakdown(stats.statusBreakdown)}
                </div>
                <div class="card">
                    <div class="card-header">Quick Actions</div>
                    <div class="quick-actions">
                        <button class="btn btn-primary" onclick="Loads.showNewForm()">➕ New Load</button>
                        <button class="btn btn-secondary" onclick="Payments.showMillPaymentForm()">💰 Record Mill Payment</button>
                        <button class="btn btn-secondary" onclick="Payments.showFarmerPayoutForm()">💸 Pay Farmer</button>
                        <button class="btn btn-secondary" onclick="Reports.show()">📊 View Reports</button>
                    </div>
                </div>
            </div>
        `;
    },

    async getDashboardStats() {
        const today = Utils.getToday();
        const monthStart = today.slice(0, 8) + '01';

        // Today's stats
        const todayLoads = this.state.loads.filter(l => l.date === today);
        const todayBags = todayLoads.reduce((sum, l) => sum + (l.net_bags || 0), 0);

        // Month stats
        const monthLoads = this.state.loads.filter(l => l.date >= monthStart);
        const monthProfit = monthLoads.reduce((sum, l) => {
            const profit = CalcEngine.calculateProfit(l);
            return sum + profit.netProfit;
        }, 0);

        // Pending payments
        const pendingMillLoads = this.state.loads.filter(l =>
            l.mill_payment_status !== 'FULL'
        );
        const pendingFromMills = pendingMillLoads.reduce((sum, l) =>
            sum + (l.mill_receivable - (l.mill_paid_amount || 0)), 0
        );

        const pendingFarmerLoads = this.state.loads.filter(l =>
            l.farmer_payment_status !== 'FULL'
        );
        const pendingToFarmers = pendingFarmerLoads.reduce((sum, l) =>
            sum + (l.farmer_payable - (l.farmer_paid_amount || 0)), 0
        );

        // Status breakdown
        const statusBreakdown = {};
        this.state.loads.forEach(l => {
            statusBreakdown[l.status] = (statusBreakdown[l.status] || 0) + 1;
        });

        // Recent loads
        const recentLoads = [...this.state.loads]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        return {
            todayLoads: todayLoads.length,
            todayBags,
            monthProfit,
            pendingFromMills,
            pendingMillLoads: pendingMillLoads.length,
            pendingToFarmers,
            pendingFarmerLoads: pendingFarmerLoads.length,
            statusBreakdown,
            recentLoads
        };
    },

    renderRecentLoads(loads) {
        if (!loads || loads.length === 0) {
            return '<p class="no-data">No loads yet. Click "New Load" to get started!</p>';
        }

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Load #</th>
                            <th>Date</th>
                            <th>Farmer</th>
                            <th>Mill</th>
                            <th>Type</th>
                            <th>Bags</th>
                            <th>Farmer ₹</th>
                            <th>Mill ₹</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loads.map(load => this.renderLoadRow(load)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderLoadRow(load) {
        const farmer = this.state.farmers.find(f => f.id === load.farmer_id);
        const mill = this.state.mills.find(m => m.id === load.mill_id);

        return `
            <tr>
                <td><strong>${load.load_number || 'N/A'}</strong></td>
                <td>${Utils.formatDate(load.date)}</td>
                <td>${farmer ? farmer.name : 'Unknown'}</td>
                <td>${mill ? mill.name : 'Unknown'}</td>
                <td><span class="badge badge-${load.transaction_type === 'FARMER_LOADING' ? 'info' : 'secondary'}">${load.transaction_type}</span></td>
                <td>${load.net_bags || 0}</td>
                <td>${CalcEngine.formatCurrency(load.farmer_payable)}</td>
                <td>${CalcEngine.formatCurrency(load.mill_receivable)}</td>
                <td><span class="badge badge-${Utils.getStatusColor(load.status)}">${Utils.formatStatus(load.status)}</span></td>
            </tr>
        `;
    },

    renderStatusBreakdown(breakdown) {
        const entries = Object.entries(breakdown);
        if (entries.length === 0) {
            return '<p class="no-data">No loads yet</p>';
        }

        return `
            <div class="status-list">
                ${entries.map(([status, count]) => `
                    <div class="status-item">
                        <span class="badge badge-${Utils.getStatusColor(status)}">${Utils.formatStatus(status)}</span>
                        <span class="count">${count}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    showSettings() {
        const content = document.getElementById('content');
        const s = this.state.settings;

        content.innerHTML = `
            <div class="card">
                <div class="card-header">Global Settings</div>
                <form id="settings-form" class="form-grid">
                    <div class="form-group">
                        <label>Organization Name</label>
                        <input type="text" name="organization_name" value="${s.organization_name}" required>
                    </div>

                    <div class="form-group">
                        <label>Bag Weight (Kg)</label>
                        <input type="number" name="bag_weight_kg" value="${s.bag_weight_kg}" required min="0" step="0.1">
                    </div>

                    <div class="form-group">
                        <label>Case 1: Deduction per Bag (Kg)</label>
                        <input type="number" name="case1_deduct_per_bag_kg" value="${s.case1_deduct_per_bag_kg}" required min="0" step="0.1">
                    </div>

                    <div class="form-group">
                        <label>Case 2: Deduction per Ton (Kg)</label>
                        <input type="number" name="case2_deduct_per_ton_kg" value="${s.case2_deduct_per_ton_kg}" required min="0" step="0.1">
                    </div>

                    <div class="form-group">
                        <label>Commission per Bag (₹)</label>
                        <input type="number" name="commission_per_bag" value="${s.commission_per_bag}" required min="0">
                    </div>

                    <div class="form-group">
                        <label>Companion per Bag (₹)</label>
                        <input type="number" name="companion_per_bag" value="${s.companion_per_bag}" required min="0">
                    </div>

                    <div class="form-group">
                        <label>Credit Cut Percent (%)</label>
                        <input type="number" name="credit_cut_percent" value="${s.credit_cut_percent}" required min="0" max="100" step="0.1">
                    </div>

                    <div class="form-group">
                        <label>Credit Cut Days</label>
                        <input type="number" name="credit_cut_days" value="${s.credit_cut_days}" required min="0">
                    </div>

                    <div class="form-group">
                        <label>Default Commission Policy</label>
                        <select name="default_commission_policy" required>
                            <option value="FARMER" ${s.default_commission_policy === 'FARMER' ? 'selected' : ''}>Farmer Pays</option>
                            <option value="MILL" ${s.default_commission_policy === 'MILL' ? 'selected' : ''}>Mill Pays</option>
                            <option value="SPLIT" ${s.default_commission_policy === 'SPLIT' ? 'selected' : ''}>Split</option>
                            <option value="NONE" ${s.default_commission_policy === 'NONE' ? 'selected' : ''}>None</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Default Split Percent (Farmer %)</label>
                        <input type="number" name="default_split_percent" value="${s.default_split_percent}" required min="0" max="100">
                    </div>

                    <div class="form-group">
                        <label>Payout Rounding (₹)</label>
                        <select name="payout_rounding" required>
                            <option value="1" ${s.payout_rounding === 1 ? 'selected' : ''}>₹1</option>
                            <option value="10" ${s.payout_rounding === 10 ? 'selected' : ''}>₹10</option>
                            <option value="100" ${s.payout_rounding === 100 ? 'selected' : ''}>₹100</option>
                        </select>
                    </div>

                    <div class="form-group full-width">
                        <button type="submit" class="btn btn-success">💾 Save Settings</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings(e.target);
        });
    },

    async saveSettings(form) {
        try {
            const formData = new FormData(form);
            const settings = {
                id: 1,
                organization_name: formData.get('organization_name'),
                bag_weight_kg: parseFloat(formData.get('bag_weight_kg')),
                case1_deduct_per_bag_kg: parseFloat(formData.get('case1_deduct_per_bag_kg')),
                case2_deduct_per_ton_kg: parseFloat(formData.get('case2_deduct_per_ton_kg')),
                commission_per_bag: parseFloat(formData.get('commission_per_bag')),
                companion_per_bag: parseFloat(formData.get('companion_per_bag')),
                credit_cut_percent: parseFloat(formData.get('credit_cut_percent')),
                credit_cut_days: parseInt(formData.get('credit_cut_days')),
                default_commission_policy: formData.get('default_commission_policy'),
                default_split_percent: parseInt(formData.get('default_split_percent')),
                payout_rounding: parseInt(formData.get('payout_rounding'))
            };

            await DB.update('settings', 1, settings);
            await this.loadSettings();
            Utils.showToast('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            Utils.showToast('Failed to save settings', 'error');
        }
    },

    openModal(title, content) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `<h2>${title}</h2>${content}`;
        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('modal').classList.remove('active');
    },

    async backup() {
        try {
            const data = await DB.exportDatabase();
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `rice-trade-backup-${Utils.getToday()}.json`;
            link.click();

            URL.revokeObjectURL(url);
            Utils.showToast('Backup created successfully!', 'success');
        } catch (error) {
            console.error('Backup error:', error);
            Utils.showToast('Failed to create backup', 'error');
        }
    },

    async restore() {
        if (!confirm('This will replace all current data. Are you sure?')) {
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                const text = await file.text();
                const data = JSON.parse(text);

                await DB.importDatabase(data);
                await this.loadAllData();
                await this.loadSettings();

                Utils.showToast('Data restored successfully! Refreshing...', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch (error) {
                console.error('Restore error:', error);
                Utils.showToast('Failed to restore data', 'error');
            }
        };

        input.click();
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
