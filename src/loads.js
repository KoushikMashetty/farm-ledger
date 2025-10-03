// Load Management Module
const Loads = {
    currentSearch: '',
    currentFilter: '',

    async show() {
        await this.render();
    },

    async render() {
        let loads = await DB.getAll('loads');

        // Apply search
        if (this.currentSearch) {
            loads = loads.filter(l => {
                const farmer = App.state.farmers.find(f => f.id === l.farmer_id);
                const mill = App.state.mills.find(m => m.id === l.mill_id);
                const term = this.currentSearch.toLowerCase();

                return (l.load_number && l.load_number.toLowerCase().includes(term)) ||
                       (farmer && farmer.name.toLowerCase().includes(term)) ||
                       (mill && mill.name.toLowerCase().includes(term));
            });
        }

        // Apply filter
        if (this.currentFilter) {
            loads = loads.filter(l => l.status === this.currentFilter);
        }

        // Sort by date descending
        loads.sort((a, b) => new Date(b.date) - new Date(a.date));

        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span>Loads Management</span>
                    <div class="header-actions">
                        <input type="text" id="load-search" placeholder="Search loads..." class="search-input">
                        <select id="status-filter" class="search-input">
                            <option value="">All Status</option>
                            <option value="CREATED">Created</option>
                            <option value="DISPATCHED">Dispatched</option>
                            <option value="RECEIVED">Received</option>
                            <option value="SETTLED">Settled</option>
                        </select>
                        <button class="btn btn-primary" onclick="Loads.showNewForm()">➕ New Load</button>
                    </div>
                </div>
                ${this.renderTable(loads)}
            </div>
        `;

        // Setup search
        const searchInput = document.getElementById('load-search');
        searchInput.value = this.currentSearch;
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.currentSearch = e.target.value;
            this.render();
        }, 300));

        // Setup filter
        const filterSelect = document.getElementById('status-filter');
        filterSelect.value = this.currentFilter;
        filterSelect.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.render();
        });
    },

    renderTable(loads) {
        if (loads.length === 0) {
            return '<p class="no-data">No loads found. Click "New Load" to create one.</p>';
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
                            <th>Gross Kg</th>
                            <th>Net Bags</th>
                            <th>Farmer ₹</th>
                            <th>Mill ₹</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loads.map(l => this.renderRow(l)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(load) {
        const farmer = App.state.farmers.find(f => f.id === load.farmer_id);
        const mill = App.state.mills.find(m => m.id === load.mill_id);

        return `
            <tr>
                <td><strong>${load.load_number || 'N/A'}</strong></td>
                <td>${Utils.formatDate(load.date)}</td>
                <td>${farmer ? farmer.name : 'Unknown'}</td>
                <td>${mill ? mill.name : 'Unknown'}</td>
                <td><span class="badge badge-${load.transaction_type === 'FARMER_LOADING' ? 'info' : 'secondary'}">${load.transaction_type === 'FARMER_LOADING' ? 'Farmer Loading' : 'Direct Delivery'}</span></td>
                <td>${CalcEngine.formatNumber(load.gross_kg)}</td>
                <td>${load.net_bags || 0}</td>
                <td>${CalcEngine.formatCurrency(load.farmer_payable)}</td>
                <td>${CalcEngine.formatCurrency(load.mill_receivable)}</td>
                <td><span class="badge badge-${Utils.getStatusColor(load.status)}">${Utils.formatStatus(load.status)}</span></td>
                <td class="actions">
                    <button class="btn-icon" onclick="Loads.viewDetails(${load.id})" title="View">👁️</button>
                    <button class="btn-icon" onclick="Loads.printLoadSlip(${load.id})" title="Print Load Slip">🖨️</button>
                    <button class="btn-icon" onclick="Loads.deleteLoad(${load.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    },

    showNewForm() {
        LoadsForm.showNewForm();
    },

    _oldShowNewForm() {
        const today = Utils.getToday();
        const farmers = App.state.farmers.filter(f => f.active === 1);
        const mills = App.state.mills.filter(m => m.active === 1);
        const vehicles = App.state.vehicles.filter(v => v.active === 1);

        if (farmers.length === 0 || mills.length === 0 || vehicles.length === 0) {
            Utils.showToast('Please add farmers, mills, and vehicles first', 'warning');
            return;
        }

        const form = `
            <form id="load-form" class="form-grid">
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" name="date" value="${today}" required max="${today}">
                </div>

                <div class="form-group">
                    <label>Transaction Type *</label>
                    <select name="transaction_type" required onchange="Loads.updateFormLabels()">
                        <option value="FARMER_LOADING">Farmer Loading (2kg/bag deduction)</option>
                        <option value="DIRECT_DELIVERY">Direct Delivery (5kg/ton deduction)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Farmer *</label>
                    <select name="farmer_id" required onchange="Loads.updateFarmerDefaults()">
                        <option value="">Select Farmer</option>
                        ${farmers.map(f => `<option value="${f.id}" data-rate="${f.default_rate || ''}">${f.name} - ${f.village}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Mill *</label>
                    <select name="mill_id" required onchange="Loads.updateMillDefaults()">
                        <option value="">Select Mill</option>
                        ${mills.map(m => `<option value="${m.id}" data-rate="${m.default_rate || ''}" data-policy="${m.commission_policy || ''}" data-split="${m.commission_split_percent || 50}">${m.name} - ${m.village}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Vehicle *</label>
                    <select name="vehicle_id" required>
                        <option value="">Select Vehicle</option>
                        ${vehicles.map(v => `<option value="${v.id}">${v.number} (${v.type})</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Gross Weight (Kg) *</label>
                    <input type="number" name="gross_kg" required min="0" step="0.01" oninput="Loads.recalculate()">
                </div>

                <div class="form-group">
                    <label id="tare-label">Tare Weight (Kg)</label>
                    <input type="number" name="tare_kg" value="0" min="0" step="0.01" oninput="Loads.recalculate()">
                </div>

                <div class="form-group">
                    <label>Declared Bags *</label>
                    <input type="number" name="declared_bags" required min="1" oninput="Loads.recalculate()">
                </div>

                <div class="form-group">
                    <label>Buy Rate (₹/bag) *</label>
                    <input type="number" name="buy_rate_per_bag" required min="0" oninput="Loads.recalculate()">
                </div>

                <div class="form-group">
                    <label>Sell Rate (₹/bag) *</label>
                    <input type="number" name="sell_rate_per_bag" required min="0" oninput="Loads.recalculate()">
                </div>

                <div class="form-group">
                    <label>Commission Policy *</label>
                    <select name="commission_policy" required onchange="Loads.toggleSplitPercent(); Loads.recalculate();">
                        <option value="FARMER">Farmer Pays</option>
                        <option value="MILL">Mill Pays</option>
                        <option value="SPLIT">Split</option>
                        <option value="NONE">None</option>
                    </select>
                </div>

                <div class="form-group" id="split-percent-group" style="display: none;">
                    <label>Farmer Split %</label>
                    <input type="number" name="commission_split_percent" value="50" min="0" max="100" oninput="Loads.recalculate()">
                </div>

                <h3 class="full-width" style="margin-top: 1rem; color: var(--primary);">Expenses</h3>

                <div class="form-group">
                    <label>Labour (₹)</label>
                    <input type="number" name="labour" value="0" min="0" oninput="Loads.recalculate()">
                </div>

                <div class="form-group">
                    <label>Labour Paid By</label>
                    <select name="labour_payer" onchange="Loads.recalculate()">
                        <option value="MILL">Mill</option>
                        <option value="FARMER">Farmer</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Companion (₹, auto-calc)</label>
                    <input type="number" name="companion" id="companion-input" min="0" oninput="Loads.recalculate()">
                </div>

                <div class="form-group">
                    <label>Companion Paid By</label>
                    <select name="companion_payer" onchange="Loads.recalculate()">
                        <option value="FARMER">Farmer</option>
                        <option value="MILL">Mill</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Weight Fee (₹)</label>
                    <input type="number" name="weight_fee" value="0" min="0" oninput="Loads.recalculate()">
                </div>

                <div class="form-group">
                    <label>Weight Fee Paid By</label>
                    <select name="weight_fee_payer" onchange="Loads.recalculate()">
                        <option value="MILL">Mill</option>
                        <option value="FARMER">Farmer</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Vehicle Rent (₹)</label>
                    <input type="number" name="vehicle_rent" value="0" min="0" oninput="Loads.recalculate()">
                </div>

                <div class="form-group">
                    <label>Vehicle Rent Paid By</label>
                    <select name="vehicle_rent_payer" onchange="Loads.recalculate()">
                        <option value="MILL">Mill</option>
                        <option value="FARMER">Farmer</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>

                <div id="calc-preview" class="full-width" style="background: #f0f9ff; padding: 1.5rem; border-radius: 0.5rem; border: 2px solid #3b82f6;">
                    <h3 style="color: #1e40af; margin-bottom: 1rem;">📊 Live Calculation Preview</h3>
                    <div id="calc-details"></div>
                </div>

                <div class="form-group full-width">
                    <button type="submit" class="btn btn-success">💾 Save Load</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Create New Load', form);

        document.getElementById('load-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveLoad(e.target);
        });

        // Initial calculation
        setTimeout(() => this.recalculate(), 100);
    },

    updateFormLabels() {
        const form = document.getElementById('load-form');
        if (!form) return;

        const transactionType = form.transaction_type.value;
        const tareLabel = document.getElementById('tare-label');

        if (transactionType === 'DIRECT_DELIVERY') {
            tareLabel.textContent = 'Tare Weight (Kg) *';
            form.tare_kg.required = true;
        } else {
            tareLabel.textContent = 'Tare Weight (Kg)';
            form.tare_kg.required = false;
        }
    },

    updateFarmerDefaults() {
        const form = document.getElementById('load-form');
        if (!form) return;

        const selectedOption = form.farmer_id.options[form.farmer_id.selectedIndex];
        const defaultRate = selectedOption.getAttribute('data-rate');

        if (defaultRate && !form.buy_rate_per_bag.value) {
            form.buy_rate_per_bag.value = defaultRate;
            this.recalculate();
        }
    },

    updateMillDefaults() {
        const form = document.getElementById('load-form');
        if (!form) return;

        const selectedOption = form.mill_id.options[form.mill_id.selectedIndex];
        const defaultRate = selectedOption.getAttribute('data-rate');
        const policy = selectedOption.getAttribute('data-policy');
        const split = selectedOption.getAttribute('data-split');

        if (defaultRate && !form.sell_rate_per_bag.value) {
            form.sell_rate_per_bag.value = defaultRate;
        }

        if (policy) {
            form.commission_policy.value = policy;
            this.toggleSplitPercent();
        }

        if (split && policy === 'SPLIT') {
            form.commission_split_percent.value = split;
        }

        this.recalculate();
    },

    toggleSplitPercent() {
        const form = document.getElementById('load-form');
        if (!form) return;

        const policy = form.commission_policy.value;
        const splitGroup = document.getElementById('split-percent-group');

        if (splitGroup) {
            splitGroup.style.display = policy === 'SPLIT' ? 'block' : 'none';
        }
    },

    recalculate() {
        const form = document.getElementById('load-form');
        if (!form) return;

        const formData = new FormData(form);

        // Validate required fields
        if (!formData.get('gross_kg') || !formData.get('declared_bags') ||
            !formData.get('buy_rate_per_bag') || !formData.get('sell_rate_per_bag')) {
            document.getElementById('calc-details').innerHTML = '<p style="color: #6b7280;">Fill in the required fields to see calculations...</p>';
            return;
        }

        const loadData = {
            transaction_type: formData.get('transaction_type'),
            gross_kg: parseFloat(formData.get('gross_kg')),
            tare_kg: parseFloat(formData.get('tare_kg')) || 0,
            declared_bags: parseInt(formData.get('declared_bags')),
            buy_rate_per_bag: parseFloat(formData.get('buy_rate_per_bag')),
            sell_rate_per_bag: parseFloat(formData.get('sell_rate_per_bag')),
            commission_policy: formData.get('commission_policy'),
            commission_split_percent: parseInt(formData.get('commission_split_percent')) || 50,
            labour: parseFloat(formData.get('labour')) || 0,
            companion: parseFloat(formData.get('companion')) || 0,
            weight_fee: parseFloat(formData.get('weight_fee')) || 0,
            vehicle_rent: parseFloat(formData.get('vehicle_rent')) || 0,
            labour_payer: formData.get('labour_payer'),
            companion_payer: formData.get('companion_payer'),
            weight_fee_payer: formData.get('weight_fee_payer'),
            vehicle_rent_payer: formData.get('vehicle_rent_payer'),
            date: formData.get('date')
        };

        try {
            const calculated = CalcEngine.computeLoad(App.state.settings, loadData);

            // Auto-fill companion if not manually entered
            const companionInput = document.getElementById('companion-input');
            if (companionInput && !companionInput.value) {
                companionInput.value = calculated.companion;
            }

            document.getElementById('calc-details').innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280;">Load Number</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #1e40af;">${calculated.load_number}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280;">Net Weight</div>
                        <div style="font-size: 1.25rem; font-weight: 700;">${calculated.net_kg} kg</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280;">Net Bags</div>
                        <div style="font-size: 1.25rem; font-weight: 700;">${calculated.net_bags}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280;">Commission</div>
                        <div style="font-size: 1.25rem; font-weight: 700;">${CalcEngine.formatCurrency(calculated.commission_amount)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280;">Farmer Payable</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #059669;">${CalcEngine.formatCurrency(calculated.farmer_payable)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280;">Mill Receivable</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #dc2626;">${CalcEngine.formatCurrency(calculated.mill_receivable)}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            document.getElementById('calc-details').innerHTML = `<p style="color: #ef4444;">Error: ${error.message}</p>`;
        }
    },

    async saveLoad(form) {
        try {
            const formData = new FormData(form);

            const loadData = {
                transaction_type: formData.get('transaction_type'),
                gross_kg: parseFloat(formData.get('gross_kg')),
                tare_kg: parseFloat(formData.get('tare_kg')) || 0,
                declared_bags: parseInt(formData.get('declared_bags')),
                buy_rate_per_bag: parseFloat(formData.get('buy_rate_per_bag')),
                sell_rate_per_bag: parseFloat(formData.get('sell_rate_per_bag')),
                commission_policy: formData.get('commission_policy'),
                commission_split_percent: parseInt(formData.get('commission_split_percent')) || 50,
                labour: parseFloat(formData.get('labour')) || 0,
                companion: parseFloat(formData.get('companion')) || 0,
                weight_fee: parseFloat(formData.get('weight_fee')) || 0,
                vehicle_rent: parseFloat(formData.get('vehicle_rent')) || 0,
                freight_advance: parseFloat(formData.get('freight_advance')) || 0,
                gumastha_rusul: parseFloat(formData.get('gumastha_rusul')) || 0,
                cash_driver: parseFloat(formData.get('cash_driver')) || 0,
                hamali: parseFloat(formData.get('hamali')) || 0,
                other_expenses: parseFloat(formData.get('other_expenses')) || 0,
                labour_payer: formData.get('labour_payer'),
                companion_payer: formData.get('companion_payer'),
                weight_fee_payer: formData.get('weight_fee_payer'),
                vehicle_rent_payer: formData.get('vehicle_rent_payer'),
                freight_advance_payer: formData.get('freight_advance_payer'),
                gumastha_rusul_payer: formData.get('gumastha_rusul_payer'),
                cash_driver_payer: formData.get('cash_driver_payer'),
                hamali_payer: formData.get('hamali_payer'),
                date: formData.get('date')
            };

            // Validate
            const validation = CalcEngine.validateLoad(loadData);
            if (!validation.valid) {
                Utils.showToast(validation.errors[0], 'error');
                return;
            }

            // Calculate
            const calculated = CalcEngine.computeLoad(App.state.settings, loadData);

            // Prepare load object for database
            const load = {
                ...loadData,
                ...calculated,
                date: formData.get('date'),
                farmer_id: parseInt(formData.get('farmer_id')),
                mill_id: parseInt(formData.get('mill_id')),
                vehicle_id: parseInt(formData.get('vehicle_id')),
                notes: formData.get('notes') || null,
                status: 'CREATED',
                mill_payment_status: 'PENDING',
                farmer_payment_status: 'PENDING',
                mill_paid_amount: 0,
                farmer_paid_amount: 0,
                credit_cut_amount: 0
            };

            await DB.add('loads', load);
            await App.loadAllData();

            Utils.showToast('Load created successfully!', 'success');
            App.closeModal();
            this.render();
        } catch (error) {
            console.error('Error saving load:', error);
            Utils.showToast('Failed to save load: ' + error.message, 'error');
        }
    },

    async viewDetails(id) {
        const load = await DB.get('loads', id);
        if (!load) {
            Utils.showToast('Load not found', 'error');
            return;
        }

        const farmer = App.state.farmers.find(f => f.id === load.farmer_id);
        const mill = App.state.mills.find(m => m.id === load.mill_id);
        const vehicle = App.state.vehicles.find(v => v.id === load.vehicle_id);

        const details = `
            <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="form-group">
                    <label>Load Number</label>
                    <div style="font-weight: 600; font-size: 1.1rem;">${load.load_number}</div>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <div>${Utils.formatDate(load.date)}</div>
                </div>
                <div class="form-group">
                    <label>Farmer</label>
                    <div>${farmer ? farmer.name : 'Unknown'}</div>
                </div>
                <div class="form-group">
                    <label>Mill</label>
                    <div>${mill ? mill.name : 'Unknown'}</div>
                </div>
                <div class="form-group">
                    <label>Vehicle</label>
                    <div>${vehicle ? vehicle.number : 'Unknown'}</div>
                </div>
                <div class="form-group">
                    <label>Transaction Type</label>
                    <div>${load.transaction_type === 'FARMER_LOADING' ? 'Farmer Loading' : 'Direct Delivery'}</div>
                </div>
                <div class="form-group">
                    <label>Gross Weight</label>
                    <div>${CalcEngine.formatNumber(load.gross_kg)} kg</div>
                </div>
                <div class="form-group">
                    <label>Net Weight</label>
                    <div>${CalcEngine.formatNumber(load.net_kg)} kg</div>
                </div>
                <div class="form-group">
                    <label>Net Bags</label>
                    <div>${load.net_bags}</div>
                </div>
                <div class="form-group">
                    <label>Commission</label>
                    <div>${CalcEngine.formatCurrency(load.commission_amount)}</div>
                </div>
                <div class="form-group">
                    <label>Farmer Payable</label>
                    <div style="font-weight: 700; color: #059669; font-size: 1.25rem;">${CalcEngine.formatCurrency(load.farmer_payable)}</div>
                </div>
                <div class="form-group">
                    <label>Mill Receivable</label>
                    <div style="font-weight: 700; color: #dc2626; font-size: 1.25rem;">${CalcEngine.formatCurrency(load.mill_receivable)}</div>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <div><span class="badge badge-${Utils.getStatusColor(load.status)}">${Utils.formatStatus(load.status)}</span></div>
                </div>
                ${load.notes ? `
                <div class="form-group full-width">
                    <label>Notes</label>
                    <div>${Utils.escapeHtml(load.notes)}</div>
                </div>
                ` : ''}
            </div>
            <div style="margin-top: 1.5rem;">
                <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            </div>
        `;

        App.openModal('Load Details - ' + load.load_number, details);
    },

    async deleteLoad(id) {
        if (!await Utils.confirm('Are you sure you want to delete this load?')) {
            return;
        }

        try {
            await DB.hardDelete('loads', id);
            Utils.showToast('Load deleted successfully!', 'success');
            await App.loadAllData();
            this.render();
        } catch (error) {
            console.error('Error deleting load:', error);
            Utils.showToast('Failed to delete load', 'error');
        }
    },

    async printLoadSlip(loadId) {
        const load = await DB.get('loads', loadId);
        if (!load) {
            Utils.showToast('Load not found', 'error');
            return;
        }

        const farmer = App.state.farmers.find(f => f.id === load.farmer_id);
        const mill = App.state.mills.find(m => m.id === load.mill_id);
        const vehicle = App.state.vehicles.find(v => v.id === load.vehicle_id);
        const settings = App.state.settings;

        // Get ADD/LESS breakdown
        const breakdown = CalcEngine.generateInvoiceBreakdown(load);

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Load Slip - ${load.load_number}</title>
                <style>
                    @page { size: A4; margin: 10mm; }
                    body {
                        font-family: 'Courier New', monospace;
                        padding: 10px;
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 18px;
                        text-transform: uppercase;
                    }
                    .header .office-name {
                        font-size: 14px;
                        margin: 5px 0;
                        font-weight: bold;
                    }
                    .dates {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 15px;
                        font-weight: bold;
                    }
                    .load-number {
                        text-align: right;
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 15px;
                    }
                    table, th, td {
                        border: 1px solid #000;
                    }
                    th, td {
                        padding: 6px;
                        text-align: left;
                    }
                    th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                    }
                    .main-table th {
                        font-size: 11px;
                    }
                    .section {
                        margin: 15px 0;
                    }
                    .section-title {
                        font-weight: bold;
                        text-decoration: underline;
                        margin-bottom: 8px;
                        font-size: 13px;
                    }
                    .calculation-table {
                        width: 50%;
                        margin-left: auto;
                    }
                    .calculation-table td {
                        padding: 4px 8px;
                    }
                    .calculation-table .label {
                        font-weight: bold;
                    }
                    .calculation-table .amount {
                        text-align: right;
                        font-family: monospace;
                    }
                    .total-row {
                        border-top: 2px solid #000;
                        font-weight: bold;
                        font-size: 13px;
                    }
                    .handwritten-area {
                        margin-top: 30px;
                        min-height: 60px;
                        border: 1px dashed #999;
                        padding: 10px;
                    }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <!-- Header -->
                <div class="header">
                    <div class="office-name">${settings.organization_name || 'RICE TRADE SUPPLY OFFICE'}</div>
                    <div>${mill ? mill.village || '' : ''}</div>
                </div>

                <!-- Dates and Load Number -->
                <div class="dates">
                    <div>DELIVERY DATE: ${Utils.formatDate(load.date)}</div>
                    <div>BILL DATE: ${Utils.formatDate(load.date)}</div>
                </div>
                <div class="load-number">LOAD NO: ${load.load_number}</div>

                <!-- Main Load Details Table -->
                <table class="main-table">
                    <thead>
                        <tr>
                            <th>Sl No</th>
                            <th>Date</th>
                            <th>Lorry No.</th>
                            <th>Bags</th>
                            <th>Gross Qtls</th>
                            <th>Net Wt Bags</th>
                            <th>Bag Rate</th>
                            <th>Qtl Rate</th>
                            <th>Freight Adv</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>${Utils.formatDate(load.date)}</td>
                            <td>${vehicle ? vehicle.number : '-'}</td>
                            <td>${load.declared_bags}</td>
                            <td>${(load.gross_kg / 100).toFixed(2)}</td>
                            <td>${load.net_bags}</td>
                            <td>${CalcEngine.formatCurrency(load.sell_rate_per_bag)}</td>
                            <td>${CalcEngine.formatCurrency(load.sell_rate_per_bag * (100 / settings.bag_weight_kg))}</td>
                            <td>${CalcEngine.formatCurrency(load.freight_advance || 0)}</td>
                            <td><strong>${CalcEngine.formatCurrency(load.mill_gross_amount)}</strong></td>
                        </tr>
                    </tbody>
                </table>

                <!-- Two Column Layout for ADD and LESS -->
                <div style="display: flex; gap: 20px;">
                    <!-- ADD DETAILS Section -->
                    <div style="flex: 1;">
                        <div class="section">
                            <div class="section-title">ADD: DETAILS :</div>
                            <table class="calculation-table" style="width: 100%; margin-left: 0;">
                                ${breakdown.addItems.length > 0 ? breakdown.addItems.map(item => `
                                    <tr>
                                        <td class="label">${item.label}</td>
                                        <td class="amount">${CalcEngine.formatCurrency(item.amount)}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="2">-</td></tr>'}
                                ${breakdown.totalAdd > 0 ? `
                                    <tr class="total-row">
                                        <td class="label"></td>
                                        <td class="amount">${CalcEngine.formatCurrency(breakdown.totalAdd)}</td>
                                    </tr>
                                ` : ''}
                            </table>
                        </div>

                        <!-- LESS DETAILS Section -->
                        <div class="section">
                            <div class="section-title">LESS: DETAILS :</div>
                            <table class="calculation-table" style="width: 100%; margin-left: 0;">
                                ${breakdown.lessItems.length > 0 ? breakdown.lessItems.map(item => `
                                    <tr>
                                        <td class="label">${item.label}</td>
                                        <td class="amount">${CalcEngine.formatCurrency(item.amount)}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="2">-</td></tr>'}
                                ${breakdown.totalLess > 0 ? `
                                    <tr class="total-row">
                                        <td class="label">TOTAL</td>
                                        <td class="amount">${CalcEngine.formatCurrency(breakdown.totalLess)}</td>
                                    </tr>
                                ` : ''}
                            </table>
                        </div>
                    </div>

                    <!-- Final Calculation Section -->
                    <div style="flex: 1;">
                        <table class="calculation-table" style="width: 100%; margin-left: 0;">
                            <tr>
                                <td class="label">Add:</td>
                                <td class="amount">${CalcEngine.formatCurrency(breakdown.totalAdd)}</td>
                            </tr>
                            <tr style="border-bottom: 2px solid #000;">
                                <td class="label"></td>
                                <td class="amount"><strong>${CalcEngine.formatCurrency(breakdown.amountAfterAdd)}</strong></td>
                            </tr>
                            <tr>
                                <td class="label">Less:</td>
                                <td class="amount">${CalcEngine.formatCurrency(breakdown.totalLess)}</td>
                            </tr>
                            <tr class="total-row">
                                <td class="label">Total:</td>
                                <td class="amount"><strong>${CalcEngine.formatCurrency(breakdown.finalAmount)}</strong></td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Additional Information -->
                <div style="margin-top: 20px; border-top: 1px solid #999; padding-top: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <div><strong>Farmer:</strong> ${farmer ? farmer.name : 'Unknown'}</div>
                        <div><strong>Mill:</strong> ${mill ? mill.name : 'Unknown'}</div>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <div><strong>Transaction Type:</strong> ${load.transaction_type === 'FARMER_LOADING' ? 'Farmer Loading' : 'Direct Delivery'}</div>
                        <div><strong>Commission Policy:</strong> ${load.commission_policy}</div>
                    </div>
                </div>

                <!-- Notes Area (if any) -->
                ${load.notes ? `
                <div class="handwritten-area">
                    <strong>Notes:</strong> ${load.notes}
                </div>
                ` : ''}

                <!-- Signature Area -->
                <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                    <div style="border-top: 1px solid #000; padding-top: 5px; width: 200px; text-align: center;">
                        Authorized Signature
                    </div>
                    <div style="border-top: 1px solid #000; padding-top: 5px; width: 200px; text-align: center;">
                        Receiver Signature
                    </div>
                </div>

                <!-- Print Buttons (will be hidden in print) -->
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 30px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;">
                        🖨️ Print Load Slip
                    </button>
                    <button onclick="window.close()" style="padding: 10px 30px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                        Close
                    </button>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
};
