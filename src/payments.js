// Payment Management Module
const Payments = {
    currentMillSearch: '',
    currentFarmerSearch: '',

    // ============ MILL PAYMENTS ============
    currentMillFilter: 'ALL', // ALL, PENDING, PARTIAL, FULL
    currentViewMode: 'payments', // payments, pending_loads

    async showMillPayments() {
        await this.renderMillPayments();
    },

    async renderMillPayments() {
        const payments = await DB.getAll('mill_payments');
        const filteredPayments = this.currentMillSearch
            ? await this.filterMillPayments(payments, this.currentMillSearch)
            : payments;

        // Sort by date descending
        filteredPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

        // Calculate overall totals from all loads
        const allLoads = App.state.loads;
        const totalReceivable = allLoads.reduce((sum, l) => sum + (l.mill_receivable || 0), 0);
        const totalReceived = allLoads.reduce((sum, l) => sum + (l.mill_paid_amount || 0), 0);
        const totalPending = totalReceivable - totalReceived;

        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span>Mill Payments</span>
                    <div class="header-actions">
                        <input type="text" id="mill-payment-search" placeholder="Search by mill, ref#..." class="search-input">
                        <button class="btn btn-primary" onclick="Payments.showMillPaymentForm()">➕ Record Payment</button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #1e40af; margin-bottom: 0.5rem;">TOTAL RECEIVABLE</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #1e3a8a;">${CalcEngine.formatCurrency(totalReceivable)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #065f46; margin-bottom: 0.5rem;">TOTAL RECEIVED</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #065f46;">${CalcEngine.formatCurrency(totalReceived)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #991b1b; margin-bottom: 0.5rem;">TOTAL PENDING</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #991b1b;">${CalcEngine.formatCurrency(totalPending)}</div>
                    </div>
                </div>

                <!-- View Toggle -->
                <div style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem;">
                    <button class="btn ${this.currentViewMode === 'payments' ? 'btn-primary' : 'btn-secondary'}" onclick="Payments.switchView('payments')">
                        💰 Payment History (${filteredPayments.length})
                    </button>
                    <button class="btn ${this.currentViewMode === 'pending_loads' ? 'btn-primary' : 'btn-secondary'}" onclick="Payments.switchView('pending_loads')">
                        📦 Pending Loads by Mill
                    </button>
                </div>

                ${this.currentViewMode === 'payments'
                    ? this.renderMillPaymentsTable(filteredPayments)
                    : this.renderPendingLoadsByMill()
                }
            </div>
        `;

        const searchInput = document.getElementById('mill-payment-search');
        searchInput.value = this.currentMillSearch;
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.currentMillSearch = e.target.value;
            this.renderMillPayments();
        }, 300));
    },

    switchView(mode) {
        this.currentViewMode = mode;
        this.renderMillPayments();
    },

    renderPendingLoadsByMill() {
        // Group loads by mill
        const millGroups = {};
        App.state.loads.forEach(load => {
            if (!millGroups[load.mill_id]) {
                millGroups[load.mill_id] = [];
            }
            millGroups[load.mill_id].push(load);
        });

        // Filter mills based on current filter
        const millsWithLoads = Object.entries(millGroups).map(([millId, loads]) => {
            const mill = App.state.mills.find(m => m.id === parseInt(millId));

            // Filter loads based on payment status
            let filteredLoads = loads;
            if (this.currentMillFilter === 'PENDING') {
                filteredLoads = loads.filter(l => l.mill_payment_status === 'PENDING');
            } else if (this.currentMillFilter === 'PARTIAL') {
                filteredLoads = loads.filter(l => l.mill_payment_status === 'PARTIAL');
            } else if (this.currentMillFilter === 'FULL') {
                filteredLoads = loads.filter(l => l.mill_payment_status === 'FULL');
            }

            const totalReceivable = filteredLoads.reduce((sum, l) => sum + (l.mill_receivable || 0), 0);
            const totalReceived = filteredLoads.reduce((sum, l) => sum + (l.mill_paid_amount || 0), 0);
            const pending = totalReceivable - totalReceived;
            const pendingCount = filteredLoads.filter(l => l.mill_payment_status !== 'FULL').length;

            return {
                mill,
                loads: filteredLoads,
                totalReceivable,
                totalReceived,
                pending,
                pendingCount
            };
        }).filter(mg => mg.loads.length > 0);

        // Sort by pending amount (highest first)
        millsWithLoads.sort((a, b) => b.pending - a.pending);

        return `
            <!-- Filter Options -->
            <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <label style="font-weight: 600; margin-right: 0.5rem; align-self: center;">Filter:</label>
                <button class="btn btn-sm ${this.currentMillFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}"
                        onclick="Payments.setMillFilter('ALL')">
                    All Loads
                </button>
                <button class="btn btn-sm ${this.currentMillFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}"
                        onclick="Payments.setMillFilter('PENDING')">
                    Pending Only
                </button>
                <button class="btn btn-sm ${this.currentMillFilter === 'PARTIAL' ? 'btn-primary' : 'btn-secondary'}"
                        onclick="Payments.setMillFilter('PARTIAL')">
                    Partial Only
                </button>
                <button class="btn btn-sm ${this.currentMillFilter === 'FULL' ? 'btn-primary' : 'btn-secondary'}"
                        onclick="Payments.setMillFilter('FULL')">
                    Paid Full
                </button>
            </div>

            ${millsWithLoads.length === 0
                ? '<p class="no-data">No loads found for the selected filter.</p>'
                : millsWithLoads.map(mg => this.renderMillLoadGroup(mg)).join('')
            }
        `;
    },

    setMillFilter(filter) {
        this.currentMillFilter = filter;
        this.renderMillPayments();
    },

    renderMillLoadGroup(millGroup) {
        const { mill, loads, totalReceivable, totalReceived, pending, pendingCount } = millGroup;

        return `
            <div style="border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; background: #fff;">
                <!-- Mill Header -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h3 style="margin: 0; color: #667eea; font-size: 1.25rem;">${mill ? mill.name : 'Unknown Mill'}</h3>
                        <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.9rem;">
                            ${mill && mill.village ? mill.village : ''}
                            ${mill && mill.phone ? '• ' + mill.phone : ''}
                        </p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary btn-sm" onclick="Payments.printMillLoads(${mill.id})">
                            🖨️ Print Loads
                        </button>
                        ${pendingCount > 0 ? `
                        <button class="btn btn-success btn-sm" onclick="Payments.showMillPaymentFormForMill(${mill.id})">
                            💰 Record Payment
                        </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Mill Summary -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem; background: #f9fafb; padding: 1rem; border-radius: 0.5rem;">
                    <div>
                        <div style="font-size: 0.7rem; color: #666; text-transform: uppercase;">Loads</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #1e3a8a;">${loads.length}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.7rem; color: #666; text-transform: uppercase;">Total Receivable</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #1e40af;">${CalcEngine.formatCurrency(totalReceivable)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.7rem; color: #666; text-transform: uppercase;">Total Received</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #059669;">${CalcEngine.formatCurrency(totalReceived)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.7rem; color: #666; text-transform: uppercase;">Pending</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: ${pending > 0 ? '#dc2626' : '#059669'};">${CalcEngine.formatCurrency(pending)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.7rem; color: #666; text-transform: uppercase;">Pending Loads</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: ${pendingCount > 0 ? '#dc2626' : '#059669'};">${pendingCount}</div>
                    </div>
                </div>

                <!-- Loads Table -->
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Load #</th>
                                <th>Farmer</th>
                                <th>Bags</th>
                                <th>Receivable</th>
                                <th>Received</th>
                                <th>Pending</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${loads.map(load => {
                                const farmer = App.state.farmers.find(f => f.id === load.farmer_id);
                                const loadPending = load.mill_receivable - (load.mill_paid_amount || 0);
                                const canRecord = loadPending > 0;

                                return `
                                    <tr style="${canRecord ? 'background: #fef3c7;' : ''}">
                                        <td>${Utils.formatDate(load.date)}</td>
                                        <td><strong>${load.load_number}</strong></td>
                                        <td>${farmer ? farmer.name : 'Unknown'}</td>
                                        <td>${load.net_bags}</td>
                                        <td>${CalcEngine.formatCurrency(load.mill_receivable)}</td>
                                        <td>${CalcEngine.formatCurrency(load.mill_paid_amount || 0)}</td>
                                        <td><strong style="color: ${loadPending > 0 ? '#dc2626' : '#059669'};">${CalcEngine.formatCurrency(loadPending)}</strong></td>
                                        <td><span class="badge badge-${load.mill_payment_status === 'FULL' ? 'success' : load.mill_payment_status === 'PARTIAL' ? 'warning' : 'error'}">${load.mill_payment_status}</span></td>
                                        <td>
                                            ${canRecord ? `<button class="btn btn-primary btn-sm" onclick="MillsLedger.recordPayment(${mill.id}, ${load.id})">Pay</button>` : '✅'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    showMillPaymentFormForMill(millId) {
        const mill = App.state.mills.find(m => m.id === millId);
        if (!mill) {
            Utils.showToast('Mill not found', 'error');
            return;
        }

        // Pre-select this mill in the payment form
        this.showMillPaymentForm();

        // Wait for form to render then select the mill
        setTimeout(() => {
            const millSelect = document.getElementById('mill-select');
            if (millSelect) {
                millSelect.value = millId;
            }
        }, 100);
    },

    printMillLoads(millId) {
        const mill = App.state.mills.find(m => m.id === millId);
        if (!mill) {
            Utils.showToast('Mill not found', 'error');
            return;
        }

        const millLoads = App.state.loads.filter(l => l.mill_id === millId);

        // Filter based on current filter
        let filteredLoads = millLoads;
        if (this.currentMillFilter === 'PENDING') {
            filteredLoads = millLoads.filter(l => l.mill_payment_status === 'PENDING');
        } else if (this.currentMillFilter === 'PARTIAL') {
            filteredLoads = millLoads.filter(l => l.mill_payment_status === 'PARTIAL');
        } else if (this.currentMillFilter === 'FULL') {
            filteredLoads = millLoads.filter(l => l.mill_payment_status === 'FULL');
        }

        const totalReceivable = filteredLoads.reduce((sum, l) => sum + (l.mill_receivable || 0), 0);
        const totalReceived = filteredLoads.reduce((sum, l) => sum + (l.mill_paid_amount || 0), 0);
        const totalPending = totalReceivable - totalReceived;

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Mill Loads - ${mill.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
                    .info { margin-bottom: 20px; background: #f9fafb; padding: 15px; border-radius: 5px; }
                    .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
                    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
                    .summary-card { background: #f0f9ff; padding: 15px; border-radius: 5px; text-align: center; }
                    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
                    .summary-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #667eea; color: white; }
                    tr:nth-child(even) { background-color: #f9fafb; }
                    .pending { background-color: #fef3c7 !important; }
                    .total-row { background-color: #e0e7ff !important; font-weight: bold; }
                    .status-pending { color: #dc2626; font-weight: bold; }
                    .status-partial { color: #f59e0b; font-weight: bold; }
                    .status-full { color: #059669; font-weight: bold; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Mill Payment Loads Report</h1>

                <div class="info">
                    <div class="info-row"><strong>Mill Name:</strong> ${mill.name}</div>
                    <div class="info-row"><strong>Village:</strong> ${mill.village || '-'}</div>
                    <div class="info-row"><strong>Contact:</strong> ${mill.contact_person || '-'} ${mill.phone ? '• ' + mill.phone : ''}</div>
                    <div class="info-row"><strong>Print Date:</strong> ${Utils.formatDate(Utils.getToday())}</div>
                    <div class="info-row"><strong>Filter:</strong> ${this.currentMillFilter}</div>
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <div class="summary-label">Total Receivable</div>
                        <div class="summary-value">${CalcEngine.formatCurrency(totalReceivable)}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Total Received</div>
                        <div class="summary-value" style="color: #059669;">${CalcEngine.formatCurrency(totalReceived)}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Total Pending</div>
                        <div class="summary-value" style="color: #dc2626;">${CalcEngine.formatCurrency(totalPending)}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Load Number</th>
                            <th>Farmer</th>
                            <th>Bags</th>
                            <th>Receivable</th>
                            <th>Received</th>
                            <th>Pending</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLoads.map((load, index) => {
                            const farmer = App.state.farmers.find(f => f.id === load.farmer_id);
                            const pending = load.mill_receivable - (load.mill_paid_amount || 0);
                            const isPending = pending > 0;

                            return `
                                <tr class="${isPending ? 'pending' : ''}">
                                    <td>${index + 1}</td>
                                    <td>${Utils.formatDate(load.date)}</td>
                                    <td><strong>${load.load_number}</strong></td>
                                    <td>${farmer ? farmer.name : 'Unknown'}</td>
                                    <td>${load.net_bags}</td>
                                    <td>${CalcEngine.formatCurrency(load.mill_receivable)}</td>
                                    <td>${CalcEngine.formatCurrency(load.mill_paid_amount || 0)}</td>
                                    <td><strong class="status-${pending > 0 ? 'pending' : 'full'}">${CalcEngine.formatCurrency(pending)}</strong></td>
                                    <td class="status-${load.mill_payment_status.toLowerCase()}">${load.mill_payment_status}</td>
                                </tr>
                            `;
                        }).join('')}
                        <tr class="total-row">
                            <td colspan="5">TOTAL (${filteredLoads.length} loads)</td>
                            <td>${CalcEngine.formatCurrency(totalReceivable)}</td>
                            <td>${CalcEngine.formatCurrency(totalReceived)}</td>
                            <td>${CalcEngine.formatCurrency(totalPending)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 30px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                        🖨️ Print This Report
                    </button>
                    <button onclick="window.close()" style="padding: 10px 30px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">
                        Close
                    </button>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        printWindow.document.write(printContent);
        printWindow.document.close();
    },

    async filterMillPayments(payments, query) {
        const lowerQuery = query.toLowerCase();
        return payments.filter(p => {
            const mill = App.state.mills.find(m => m.id === p.mill_id);
            const millName = mill ? mill.name.toLowerCase() : '';
            const refNum = (p.reference_number || '').toLowerCase();
            const notes = (p.notes || '').toLowerCase();
            return millName.includes(lowerQuery) || refNum.includes(lowerQuery) || notes.includes(lowerQuery);
        });
    },

    renderMillPaymentsTable(payments) {
        if (payments.length === 0) {
            return '<p class="no-data">No mill payments recorded. Record payments from the Mill Ledger or use the "Record Payment" button above.</p>';
        }

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Payment Date</th>
                            <th>Mill</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Reference #</th>
                            <th>Load(s)</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(p => this.renderMillPaymentRow(p)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderMillPaymentRow(payment) {
        const mill = App.state.mills.find(m => m.id === payment.mill_id);
        const millName = mill ? mill.name : 'Unknown Mill';

        // Find all loads for this payment (using load_id if available)
        const relatedLoads = payment.load_id
            ? App.state.loads.filter(l => l.id === payment.load_id)
            : [];

        const loadNumbers = relatedLoads.map(l => l.load_number).join(', ') || '-';

        return `
            <tr>
                <td><strong>${Utils.formatDate(payment.payment_date)}</strong></td>
                <td>${Utils.escapeHtml(millName)}</td>
                <td><strong style="color: #059669;">${CalcEngine.formatCurrency(payment.amount)}</strong></td>
                <td><span class="badge badge-info">${payment.payment_method || 'CASH'}</span></td>
                <td>${payment.reference_number || '-'}</td>
                <td style="font-size: 0.85rem;">${loadNumbers}</td>
                <td style="font-size: 0.85rem;">${payment.notes || '-'}</td>
                <td class="actions">
                    <button class="btn-icon" onclick="Payments.viewMillPaymentDetails(${payment.id})" title="View Details">👁️</button>
                    <button class="btn-icon" onclick="Payments.deleteMillPayment(${payment.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    },

    showMillPaymentForm() {
        // Get mills with outstanding balances
        const millsWithBalance = App.state.mills.map(mill => {
            const millLoads = App.state.loads.filter(l => l.mill_id === mill.id);
            const totalReceivable = millLoads.reduce((sum, l) => sum + (l.mill_receivable || 0), 0);
            const totalReceived = millLoads.reduce((sum, l) => sum + (l.mill_paid_amount || 0), 0);
            const outstanding = totalReceivable - totalReceived;
            return { ...mill, outstanding, hasBalance: outstanding > 0 };
        }).filter(m => m.hasBalance);

        if (millsWithBalance.length === 0) {
            Utils.showToast('No mills have outstanding payments', 'info');
            return;
        }

        const today = Utils.getToday();
        const form = `
            <form id="mill-payment-form" class="form-grid">
                <div class="form-group">
                    <label>Select Mill *</label>
                    <select name="mill_id" id="mill-select" required>
                        <option value="">Choose a mill...</option>
                        ${millsWithBalance.map(m => `
                            <option value="${m.id}">${m.name} - Outstanding: ${CalcEngine.formatCurrency(m.outstanding)}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Payment Date *</label>
                    <input type="date" name="payment_date" value="${today}" required max="${today}">
                </div>

                <div class="form-group">
                    <label>Amount Received *</label>
                    <input type="number" name="amount" required min="1" step="0.01" style="font-weight: 700; font-size: 1.1rem;">
                </div>

                <div class="form-group">
                    <label>Payment Method *</label>
                    <select name="payment_method" required>
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">Cheque</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Reference Number</label>
                    <input type="text" name="reference_number" placeholder="UTR/Cheque #">
                </div>

                <div class="form-group">
                    <label>Allocation Method *</label>
                    <select name="allocation_method" required>
                        <option value="FIFO">FIFO (First In First Out)</option>
                        <option value="PROPORTIONAL">Proportional</option>
                        <option value="MANUAL">Manual (Select Loads)</option>
                    </select>
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>

                <div class="form-group full-width" style="display: flex; gap: 1rem;">
                    <button type="submit" class="btn btn-success">💰 Record Payment</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Record Mill Payment', form);

        document.getElementById('mill-payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processGeneralMillPayment(e.target);
        });
    },

    async processGeneralMillPayment(form) {
        try {
            const formData = new FormData(form);
            const millId = parseInt(formData.get('mill_id'));
            const amount = parseFloat(formData.get('amount'));
            const allocationMethod = formData.get('allocation_method');

            // Get pending loads for this mill
            const pendingLoads = App.state.loads
                .filter(l => l.mill_id === millId && l.mill_payment_status !== 'FULL')
                .sort((a, b) => new Date(a.date) - new Date(b.date)); // FIFO

            if (pendingLoads.length === 0) {
                Utils.showToast('No pending loads found for this mill', 'error');
                return;
            }

            // Allocate payment to loads
            let remainingAmount = amount;
            for (const load of pendingLoads) {
                if (remainingAmount <= 0) break;

                const pending = load.mill_receivable - (load.mill_paid_amount || 0);
                const allocatedAmount = Math.min(remainingAmount, pending);

                // Create payment record for this load
                const payment = {
                    mill_id: millId,
                    load_id: load.id,
                    payment_date: formData.get('payment_date'),
                    amount: allocatedAmount,
                    payment_method: formData.get('payment_method'),
                    reference_number: formData.get('reference_number') || null,
                    notes: formData.get('notes') || null,
                    allocation_method: allocationMethod
                };

                await DB.add('mill_payments', payment);

                // Update load
                const newPaidAmount = (load.mill_paid_amount || 0) + allocatedAmount;
                const isFull = newPaidAmount >= load.mill_receivable;

                await DB.update('loads', load.id, {
                    mill_paid_amount: newPaidAmount,
                    mill_payment_status: isFull ? 'FULL' : 'PARTIAL',
                    mill_paid_date: formData.get('payment_date'),
                    status: isFull ? 'MILL_PAID_FULL' : 'MILL_PAID_PARTIAL'
                });

                remainingAmount -= allocatedAmount;
            }

            await App.loadAllData();
            Utils.showToast('Mill payment recorded and allocated successfully!', 'success');
            App.closeModal();
            this.renderMillPayments();
        } catch (error) {
            console.error('Error recording payment:', error);
            Utils.showToast('Failed to record payment: ' + error.message, 'error');
        }
    },

    async viewMillPaymentDetails(paymentId) {
        const payment = await DB.get('mill_payments', paymentId);
        if (!payment) {
            Utils.showToast('Payment not found', 'error');
            return;
        }

        const mill = await DB.get('mills', payment.mill_id);
        const load = payment.load_id ? await DB.get('loads', payment.load_id) : null;

        const details = `
            <div style="max-width: 600px;">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Payment Date</label>
                        <div style="font-weight: 600;">${Utils.formatDate(payment.payment_date)}</div>
                    </div>

                    <div class="form-group">
                        <label>Mill</label>
                        <div style="font-weight: 600;">${mill ? mill.name : 'Unknown'}</div>
                    </div>

                    <div class="form-group">
                        <label>Amount</label>
                        <div style="font-weight: 700; font-size: 1.2rem; color: #059669;">${CalcEngine.formatCurrency(payment.amount)}</div>
                    </div>

                    <div class="form-group">
                        <label>Payment Method</label>
                        <div><span class="badge badge-info">${payment.payment_method || 'CASH'}</span></div>
                    </div>

                    <div class="form-group">
                        <label>Reference Number</label>
                        <div>${payment.reference_number || '-'}</div>
                    </div>

                    <div class="form-group">
                        <label>Allocation Method</label>
                        <div>${payment.allocation_method || 'FIFO'}</div>
                    </div>

                    ${load ? `
                    <div class="form-group">
                        <label>Load Number</label>
                        <div style="font-weight: 600;">${load.load_number}</div>
                    </div>
                    ` : ''}

                    ${payment.notes ? `
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <div>${payment.notes}</div>
                    </div>
                    ` : ''}

                    <div class="form-group">
                        <label>Created At</label>
                        <div style="font-size: 0.85rem; color: #666;">${Utils.formatDate(payment.created_at)}</div>
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                </div>
            </div>
        `;

        App.openModal('Payment Details', details);
    },

    async deleteMillPayment(paymentId) {
        if (!await Utils.confirm('Are you sure you want to delete this payment? This will affect load payment status.')) {
            return;
        }

        try {
            const payment = await DB.get('mill_payments', paymentId);
            if (!payment) return;

            // Reverse the payment on the load
            if (payment.load_id) {
                const load = await DB.get('loads', payment.load_id);
                if (load) {
                    const newPaidAmount = Math.max(0, (load.mill_paid_amount || 0) - payment.amount);
                    const isFull = newPaidAmount >= load.mill_receivable;
                    const isPending = newPaidAmount === 0;

                    await DB.update('loads', load.id, {
                        mill_paid_amount: newPaidAmount,
                        mill_payment_status: isPending ? 'PENDING' : (isFull ? 'FULL' : 'PARTIAL'),
                        status: isPending ? 'MILL_PAYMENT_PENDING' : (isFull ? 'MILL_PAID_FULL' : 'MILL_PAID_PARTIAL')
                    });
                }
            }

            await DB.delete('mill_payments', paymentId);
            await App.loadAllData();
            Utils.showToast('Payment deleted successfully!', 'success');
            this.renderMillPayments();
        } catch (error) {
            console.error('Error deleting payment:', error);
            Utils.showToast('Failed to delete payment', 'error');
        }
    },

    // ============ FARMER PAYOUTS ============
    async showFarmerPayouts() {
        await this.renderFarmerPayouts();
    },

    async renderFarmerPayouts() {
        const payouts = await DB.getAll('farmer_payments');
        const filteredPayouts = this.currentFarmerSearch
            ? await this.filterFarmerPayouts(payouts, this.currentFarmerSearch)
            : payouts;

        // Sort by date descending
        filteredPayouts.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

        // Calculate totals
        const totalGross = filteredPayouts.reduce((sum, p) => sum + p.gross_amount, 0);
        const totalCreditCut = filteredPayouts.reduce((sum, p) => sum + (p.credit_cut_amount || 0), 0);
        const totalNet = filteredPayouts.reduce((sum, p) => sum + p.net_amount, 0);

        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span>Farmer Payouts (${filteredPayouts.length})</span>
                    <div class="header-actions">
                        <input type="text" id="farmer-payout-search" placeholder="Search by farmer, invoice#..." class="search-input">
                        <button class="btn btn-primary" onclick="Payments.showFarmerPayoutForm()">➕ Pay Farmer</button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #1e40af; margin-bottom: 0.5rem;">GROSS PAID</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #1e3a8a;">${CalcEngine.formatCurrency(totalGross)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #78350f; margin-bottom: 0.5rem;">CREDIT CUT SAVINGS</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #78350f;">${CalcEngine.formatCurrency(totalCreditCut)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #065f46; margin-bottom: 0.5rem;">NET PAID</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #065f46;">${CalcEngine.formatCurrency(totalNet)}</div>
                    </div>
                </div>

                ${this.renderFarmerPayoutsTable(filteredPayouts)}
            </div>
        `;

        const searchInput = document.getElementById('farmer-payout-search');
        searchInput.value = this.currentFarmerSearch;
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.currentFarmerSearch = e.target.value;
            this.renderFarmerPayouts();
        }, 300));
    },

    async filterFarmerPayouts(payouts, query) {
        const lowerQuery = query.toLowerCase();
        return payouts.filter(p => {
            const farmer = App.state.farmers.find(f => f.id === p.farmer_id);
            const farmerName = farmer ? farmer.name.toLowerCase() : '';
            const invoice = (p.invoice_number || '').toLowerCase();
            const notes = (p.notes || '').toLowerCase();
            return farmerName.includes(lowerQuery) || invoice.includes(lowerQuery) || notes.includes(lowerQuery);
        });
    },

    renderFarmerPayoutsTable(payouts) {
        if (payouts.length === 0) {
            return '<p class="no-data">No farmer payouts recorded. Use the "Pay Farmer" button to record a payout.</p>';
        }

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Payment Date</th>
                            <th>Farmer</th>
                            <th>Load #</th>
                            <th>Gross Amount</th>
                            <th>Credit Cut</th>
                            <th>Net Paid</th>
                            <th>Method</th>
                            <th>Invoice #</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payouts.map(p => this.renderFarmerPayoutRow(p)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderFarmerPayoutRow(payout) {
        const farmer = App.state.farmers.find(f => f.id === payout.farmer_id);
        const farmerName = farmer ? farmer.name : 'Unknown Farmer';
        const load = App.state.loads.find(l => l.id === payout.load_id);
        const loadNumber = load ? load.load_number : '-';

        return `
            <tr>
                <td><strong>${Utils.formatDate(payout.payment_date)}</strong></td>
                <td>${Utils.escapeHtml(farmerName)}</td>
                <td style="font-size: 0.85rem;">${loadNumber}</td>
                <td>${CalcEngine.formatCurrency(payout.gross_amount)}</td>
                <td><strong style="color: #f59e0b;">${payout.credit_cut_amount > 0 ? '-' : ''}${CalcEngine.formatCurrency(payout.credit_cut_amount || 0)}</strong></td>
                <td><strong style="color: #059669;">${CalcEngine.formatCurrency(payout.net_amount)}</strong></td>
                <td><span class="badge badge-info">${payout.payment_method || 'CASH'}</span></td>
                <td style="font-size: 0.85rem;">${payout.invoice_number || '-'}</td>
                <td class="actions">
                    <button class="btn-icon" onclick="Payments.viewFarmerPayoutDetails(${payout.id})" title="View Details">👁️</button>
                    <button class="btn-icon" onclick="Payments.deleteFarmerPayout(${payout.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    },

    showFarmerPayoutForm() {
        // Get farmers with unpaid loads
        const farmersWithUnpaidLoads = App.state.farmers.map(farmer => {
            const unpaidLoads = App.state.loads.filter(l =>
                l.farmer_id === farmer.id && l.farmer_payment_status !== 'FULL'
            );
            return { ...farmer, unpaidLoads, hasUnpaid: unpaidLoads.length > 0 };
        }).filter(f => f.hasUnpaid);

        if (farmersWithUnpaidLoads.length === 0) {
            Utils.showToast('No farmers have unpaid loads', 'info');
            return;
        }

        const today = Utils.getToday();
        const form = `
            <form id="farmer-payout-form" class="form-grid">
                <div class="form-group">
                    <label>Select Farmer *</label>
                    <select name="farmer_id" id="farmer-select" required onchange="Payments.onFarmerSelectChange()">
                        <option value="">Choose a farmer...</option>
                        ${farmersWithUnpaidLoads.map(f => `
                            <option value="${f.id}">${f.name} (${f.unpaidLoads.length} unpaid loads)</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Select Load *</label>
                    <select name="load_id" id="load-select" required disabled onchange="Payments.onLoadSelectChange()">
                        <option value="">Select farmer first...</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Payment Date *</label>
                    <input type="date" name="payment_date" id="payment-date" value="${today}" required max="${today}" onchange="Payments.onPaymentDateChange()">
                </div>

                <div class="form-group">
                    <label>Gross Amount</label>
                    <input type="number" name="gross_amount" id="gross-amount" readonly style="background: #f9fafb;">
                </div>

                <div class="form-group">
                    <label>Credit Cut (Early Payment Discount)</label>
                    <input type="number" name="credit_cut_amount" id="credit-cut" readonly style="background: #fef3c7; color: #f59e0b; font-weight: 600;">
                </div>

                <div class="form-group">
                    <label>Net Amount to Pay *</label>
                    <input type="number" name="net_amount" id="net-amount" readonly required style="font-weight: 700; font-size: 1.1rem; background: #f9fafb; color: #059669;">
                </div>

                <div id="credit-cut-info" style="display: none;" class="form-group full-width"></div>

                <div class="form-group">
                    <label>Payment Method *</label>
                    <select name="payment_method" required>
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">Cheque</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Reference Number</label>
                    <input type="text" name="reference_number" placeholder="UTR/Cheque #">
                </div>

                <div class="form-group">
                    <label>Invoice Number</label>
                    <input type="text" name="invoice_number" placeholder="Auto-generated if empty">
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>

                <div class="form-group full-width" style="display: flex; gap: 1rem;">
                    <button type="submit" class="btn btn-success">💰 Pay Farmer</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Pay Farmer', form);

        document.getElementById('farmer-payout-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processFarmerPayout(e.target);
        });

        // Store unpaid loads data for the form
        this.farmersWithUnpaidLoads = farmersWithUnpaidLoads;
    },

    onFarmerSelectChange() {
        const farmerSelect = document.getElementById('farmer-select');
        const loadSelect = document.getElementById('load-select');
        const farmerId = parseInt(farmerSelect.value);

        if (!farmerId) {
            loadSelect.disabled = true;
            loadSelect.innerHTML = '<option value="">Select farmer first...</option>';
            return;
        }

        const farmer = this.farmersWithUnpaidLoads.find(f => f.id === farmerId);
        if (!farmer) return;

        loadSelect.disabled = false;
        loadSelect.innerHTML = `
            <option value="">Choose a load...</option>
            ${farmer.unpaidLoads.map(l => `
                <option value="${l.id}" data-payable="${l.farmer_payable}" data-load-date="${l.date}">
                    ${l.load_number} - ${Utils.formatDate(l.date)} - ${CalcEngine.formatCurrency(l.farmer_payable)}
                </option>
            `).join('')}
        `;
    },

    async onLoadSelectChange() {
        const loadSelect = document.getElementById('load-select');
        const paymentDateInput = document.getElementById('payment-date');

        if (!loadSelect.value) return;

        const selectedOption = loadSelect.options[loadSelect.selectedIndex];
        const payable = parseFloat(selectedOption.getAttribute('data-payable'));
        const loadDate = selectedOption.getAttribute('data-load-date');

        document.getElementById('gross-amount').value = payable;

        // Recalculate credit cut based on current payment date
        await this.updateCreditCutCalculation(loadDate, paymentDateInput.value, payable);
    },

    async onPaymentDateChange() {
        const loadSelect = document.getElementById('load-select');
        const paymentDateInput = document.getElementById('payment-date');

        if (!loadSelect.value) return;

        const selectedOption = loadSelect.options[loadSelect.selectedIndex];
        const payable = parseFloat(selectedOption.getAttribute('data-payable'));
        const loadDate = selectedOption.getAttribute('data-load-date');

        await this.updateCreditCutCalculation(loadDate, paymentDateInput.value, payable);
    },

    async updateCreditCutCalculation(loadDate, paymentDate, payable) {
        const settings = await DB.getSettings();
        const creditCutInfo = CalcEngine.calculateCreditCut(loadDate, paymentDate, payable, settings);

        document.getElementById('credit-cut').value = creditCutInfo.creditCut;
        document.getElementById('net-amount').value = creditCutInfo.netPayment;

        const infoDiv = document.getElementById('credit-cut-info');
        if (creditCutInfo.eligible) {
            infoDiv.style.display = 'block';
            infoDiv.innerHTML = `
                <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 1rem; border-radius: 0.5rem;">
                    <strong style="color: #065f46;">✅ Credit Cut Eligible!</strong>
                    <div style="font-size: 0.85rem; color: #047857; margin-top: 0.25rem;">
                        Payment within ${creditCutInfo.daysDiff} days. ${settings.credit_cut_percent}% discount applied.
                    </div>
                </div>
            `;
        } else {
            infoDiv.style.display = 'block';
            infoDiv.innerHTML = `
                <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 1rem; border-radius: 0.5rem;">
                    <strong style="color: #991b1b;">❌ Credit Cut Not Eligible</strong>
                    <div style="font-size: 0.85rem; color: #b91c1c; margin-top: 0.25rem;">
                        Payment after ${settings.credit_cut_days} days (${creditCutInfo.daysDiff} days elapsed). No discount applied.
                    </div>
                </div>
            `;
        }
    },

    async processFarmerPayout(form) {
        try {
            const formData = new FormData(form);
            const loadId = parseInt(formData.get('load_id'));
            const farmerId = parseInt(formData.get('farmer_id'));

            const load = await DB.get('loads', loadId);
            if (!load) {
                Utils.showToast('Load not found', 'error');
                return;
            }

            const grossAmount = parseFloat(formData.get('gross_amount'));
            const creditCutAmount = parseFloat(formData.get('credit_cut_amount')) || 0;
            const netAmount = parseFloat(formData.get('net_amount'));

            // Generate invoice number if not provided
            let invoiceNumber = formData.get('invoice_number');
            if (!invoiceNumber) {
                const dateStr = formData.get('payment_date').replace(/-/g, '');
                const random = Math.floor(Math.random() * 900) + 100;
                invoiceNumber = `INV-${dateStr}-${random}`;
            }

            const payout = {
                farmer_id: farmerId,
                load_id: loadId,
                payment_date: formData.get('payment_date'),
                gross_amount: grossAmount,
                credit_cut_amount: creditCutAmount,
                net_amount: netAmount,
                payment_method: formData.get('payment_method'),
                reference_number: formData.get('reference_number') || null,
                notes: formData.get('notes') || null,
                invoice_number: invoiceNumber
            };

            await DB.add('farmer_payments', payout);

            // Update load
            await DB.update('loads', loadId, {
                farmer_paid_amount: netAmount,
                farmer_payment_status: 'FULL',
                farmer_paid_date: formData.get('payment_date'),
                credit_cut_amount: creditCutAmount,
                status: 'FARMER_PAID_FULL'
            });

            await App.loadAllData();
            Utils.showToast('Farmer payout recorded successfully!', 'success');
            App.closeModal();
            this.renderFarmerPayouts();
        } catch (error) {
            console.error('Error recording payout:', error);
            Utils.showToast('Failed to record payout: ' + error.message, 'error');
        }
    },

    async viewFarmerPayoutDetails(payoutId) {
        const payout = await DB.get('farmer_payments', payoutId);
        if (!payout) {
            Utils.showToast('Payout not found', 'error');
            return;
        }

        const farmer = await DB.get('farmers', payout.farmer_id);
        const load = await DB.get('loads', payout.load_id);

        const details = `
            <div style="max-width: 600px;">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Payment Date</label>
                        <div style="font-weight: 600;">${Utils.formatDate(payout.payment_date)}</div>
                    </div>

                    <div class="form-group">
                        <label>Farmer</label>
                        <div style="font-weight: 600;">${farmer ? farmer.name : 'Unknown'}</div>
                    </div>

                    <div class="form-group">
                        <label>Load Number</label>
                        <div style="font-weight: 600;">${load ? load.load_number : '-'}</div>
                    </div>

                    <div class="form-group">
                        <label>Gross Amount</label>
                        <div style="font-weight: 600;">${CalcEngine.formatCurrency(payout.gross_amount)}</div>
                    </div>

                    <div class="form-group">
                        <label>Credit Cut Discount</label>
                        <div style="font-weight: 600; color: #f59e0b;">${payout.credit_cut_amount > 0 ? '-' : ''}${CalcEngine.formatCurrency(payout.credit_cut_amount || 0)}</div>
                    </div>

                    <div class="form-group">
                        <label>Net Amount Paid</label>
                        <div style="font-weight: 700; font-size: 1.2rem; color: #059669;">${CalcEngine.formatCurrency(payout.net_amount)}</div>
                    </div>

                    <div class="form-group">
                        <label>Payment Method</label>
                        <div><span class="badge badge-info">${payout.payment_method || 'CASH'}</span></div>
                    </div>

                    <div class="form-group">
                        <label>Reference Number</label>
                        <div>${payout.reference_number || '-'}</div>
                    </div>

                    <div class="form-group">
                        <label>Invoice Number</label>
                        <div style="font-weight: 600;">${payout.invoice_number || '-'}</div>
                    </div>

                    ${payout.notes ? `
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <div>${payout.notes}</div>
                    </div>
                    ` : ''}

                    <div class="form-group">
                        <label>Created At</label>
                        <div style="font-size: 0.85rem; color: #666;">${Utils.formatDate(payout.created_at)}</div>
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                </div>
            </div>
        `;

        App.openModal('Payout Details', details);
    },

    async deleteFarmerPayout(payoutId) {
        if (!await Utils.confirm('Are you sure you want to delete this payout? This will affect load payment status.')) {
            return;
        }

        try {
            const payout = await DB.get('farmer_payments', payoutId);
            if (!payout) return;

            // Reverse the payment on the load
            const load = await DB.get('loads', payout.load_id);
            if (load) {
                await DB.update('loads', load.id, {
                    farmer_paid_amount: 0,
                    farmer_payment_status: 'PENDING',
                    credit_cut_amount: 0,
                    status: 'FARMER_PAYMENT_PENDING'
                });
            }

            await DB.delete('farmer_payments', payoutId);
            await App.loadAllData();
            Utils.showToast('Payout deleted successfully!', 'success');
            this.renderFarmerPayouts();
        } catch (error) {
            console.error('Error deleting payout:', error);
            Utils.showToast('Failed to delete payout', 'error');
        }
    }
};
