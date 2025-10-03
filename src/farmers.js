// Farmer Management Module
const Farmers = {
    currentSearch: '',

    async show() {
        await this.render();
    },

    async render() {
        const farmers = this.currentSearch
            ? await DB.search('farmers', ['name', 'village', 'phone'], this.currentSearch)
            : await DB.getAll('farmers');

        const activeFarmers = farmers.filter(f => f.active === 1);

        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span>Farmers Management</span>
                    <div class="header-actions">
                        <input type="text" id="farmer-search" placeholder="Search farmers..." class="search-input">
                        <button class="btn btn-primary" onclick="Farmers.showNewForm()">➕ Add Farmer</button>
                    </div>
                </div>
                ${this.renderTable(activeFarmers)}
            </div>
        `;

        // Setup search
        const searchInput = document.getElementById('farmer-search');
        searchInput.value = this.currentSearch;
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.currentSearch = e.target.value;
            this.render();
        }, 300));
    },

    renderTable(farmers) {
        if (farmers.length === 0) {
            return '<p class="no-data">No farmers found. Click "Add Farmer" to create one.</p>';
        }

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Village</th>
                            <th>Phone</th>
                            <th>Bank Account</th>
                            <th>Default Rate</th>
                            <th>Total Loads</th>
                            <th>Outstanding</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${farmers.map(f => this.renderRow(f)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(farmer) {
        // Calculate actual outstanding from loads
        const farmerLoads = App.state.loads.filter(l => l.farmer_id === farmer.id);
        const totalPayable = farmerLoads.reduce((sum, l) => sum + (l.farmer_payable || 0), 0);
        const totalPaid = farmerLoads.reduce((sum, l) => sum + (l.farmer_paid_amount || 0), 0);
        const outstanding = totalPayable - totalPaid;

        return `
            <tr style="cursor: pointer;" onclick="Farmers.showLedger(${farmer.id})">
                <td><strong>${Utils.escapeHtml(farmer.name)}</strong></td>
                <td>${Utils.escapeHtml(farmer.village)}</td>
                <td>${farmer.phone || '-'}</td>
                <td>${farmer.bank_account || '-'}</td>
                <td>${farmer.default_rate ? CalcEngine.formatCurrency(farmer.default_rate) : '-'}</td>
                <td>${farmerLoads.length}</td>
                <td><strong style="color: ${outstanding > 0 ? '#dc2626' : '#059669'};">${CalcEngine.formatCurrency(outstanding)}</strong></td>
                <td class="actions" onclick="event.stopPropagation()">
                    <button class="btn-icon" onclick="Farmers.showLedger(${farmer.id})" title="View Ledger">📊</button>
                    <button class="btn-icon" onclick="Farmers.showEditForm(${farmer.id})" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="Farmers.deleteFarmer(${farmer.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    },

    showNewForm() {
        const form = `
            <form id="farmer-form" class="form-grid">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" name="name" required>
                </div>

                <div class="form-group">
                    <label>Village *</label>
                    <input type="text" name="village" required>
                </div>

                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" pattern="[0-9]{10}">
                </div>

                <div class="form-group">
                    <label>Bank Account</label>
                    <input type="text" name="bank_account">
                </div>

                <div class="form-group">
                    <label>Bank IFSC</label>
                    <input type="text" name="bank_ifsc">
                </div>

                <div class="form-group">
                    <label>Default Rate (₹/bag)</label>
                    <input type="number" name="default_rate" min="0">
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>

                <div class="form-group full-width">
                    <label>Tags (comma-separated)</label>
                    <input type="text" name="tags" placeholder="e.g., regular, premium">
                </div>

                <div class="form-group full-width">
                    <button type="submit" class="btn btn-success">💾 Save Farmer</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Add New Farmer', form);

        document.getElementById('farmer-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveFarmer(e.target);
        });
    },

    async showEditForm(id) {
        const farmer = await DB.get('farmers', id);
        if (!farmer) {
            Utils.showToast('Farmer not found', 'error');
            return;
        }

        const form = `
            <form id="farmer-form" class="form-grid">
                <input type="hidden" name="id" value="${farmer.id}">

                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" name="name" value="${Utils.escapeHtml(farmer.name)}" required>
                </div>

                <div class="form-group">
                    <label>Village *</label>
                    <input type="text" name="village" value="${Utils.escapeHtml(farmer.village)}" required>
                </div>

                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" value="${farmer.phone || ''}" pattern="[0-9]{10}">
                </div>

                <div class="form-group">
                    <label>Bank Account</label>
                    <input type="text" name="bank_account" value="${farmer.bank_account || ''}">
                </div>

                <div class="form-group">
                    <label>Bank IFSC</label>
                    <input type="text" name="bank_ifsc" value="${farmer.bank_ifsc || ''}">
                </div>

                <div class="form-group">
                    <label>Default Rate (₹/bag)</label>
                    <input type="number" name="default_rate" value="${farmer.default_rate || ''}" min="0">
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="2">${farmer.notes || ''}</textarea>
                </div>

                <div class="form-group full-width">
                    <label>Tags (comma-separated)</label>
                    <input type="text" name="tags" value="${farmer.tags || ''}" placeholder="e.g., regular, premium">
                </div>

                <div class="form-group full-width">
                    <button type="submit" class="btn btn-success">💾 Update Farmer</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Edit Farmer', form);

        document.getElementById('farmer-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveFarmer(e.target, id);
        });
    },

    async saveFarmer(form, id = null) {
        try {
            const formData = new FormData(form);
            const farmer = {
                name: formData.get('name'),
                village: formData.get('village'),
                phone: formData.get('phone') || null,
                bank_account: formData.get('bank_account') || null,
                bank_ifsc: formData.get('bank_ifsc') || null,
                default_rate: formData.get('default_rate') ? parseFloat(formData.get('default_rate')) : null,
                notes: formData.get('notes') || null,
                tags: formData.get('tags') || null,
                total_loads: 0,
                total_bags: 0,
                total_paid: 0,
                outstanding_balance: 0
            };

            if (id) {
                await DB.update('farmers', id, farmer);
                Utils.showToast('Farmer updated successfully!', 'success');
            } else {
                await DB.add('farmers', farmer);
                Utils.showToast('Farmer added successfully!', 'success');
            }

            await App.loadAllData();
            App.closeModal();
            this.render();
        } catch (error) {
            console.error('Error saving farmer:', error);
            Utils.showToast('Failed to save farmer', 'error');
        }
    },

    async deleteFarmer(id) {
        if (!await Utils.confirm('Are you sure you want to delete this farmer?')) {
            return;
        }

        try {
            await DB.delete('farmers', id);
            Utils.showToast('Farmer deleted successfully!', 'success');
            await App.loadAllData();
            this.render();
        } catch (error) {
            console.error('Error deleting farmer:', error);
            Utils.showToast('Failed to delete farmer', 'error');
        }
    },

    async showLedger(farmerId) {
        const farmer = await DB.get('farmers', farmerId);
        if (!farmer) {
            Utils.showToast('Farmer not found', 'error');
            return;
        }

        const loads = App.state.loads.filter(l => l.farmer_id === farmerId);
        const payments = await DB.getAll('farmer_payments');
        const farmerPayments = payments.filter(p => p.farmer_id === farmerId);

        // Calculate totals
        const totalPayable = loads.reduce((sum, l) => sum + (l.farmer_payable || 0), 0);
        const totalPaid = loads.reduce((sum, l) => sum + (l.farmer_paid_amount || 0), 0);
        const pendingAmount = totalPayable - totalPaid;

        // Get pending loads (where mill has paid but farmer not paid yet)
        const pendingLoads = loads.filter(l =>
            l.mill_payment_status === 'FULL' && l.farmer_payment_status !== 'FULL'
        );

        const ledger = `
            <div style="max-width: 1000px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #1e40af; margin-bottom: 0.5rem;">TOTAL LOADS</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #1e3a8a;">${loads.length}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #78350f; margin-bottom: 0.5rem;">TOTAL PAYABLE</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #78350f;">${CalcEngine.formatCurrency(totalPayable)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #065f46; margin-bottom: 0.5rem;">TOTAL PAID</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #065f46;">${CalcEngine.formatCurrency(totalPaid)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #991b1b; margin-bottom: 0.5rem;">PENDING</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #991b1b;">${CalcEngine.formatCurrency(pendingAmount)}</div>
                    </div>
                </div>

                ${pendingLoads.length > 0 ? `
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                    <strong style="color: #78350f;">⚠️ ${pendingLoads.length} Load(s) Ready for Payment</strong>
                    <div style="font-size: 0.85rem; color: #92400e; margin-top: 0.25rem;">
                        Mill payment received. You can pay farmer now.
                        <button class="btn btn-primary" style="margin-left: 1rem; padding: 0.5rem 1rem; font-size: 0.85rem;"
                                onclick="Farmers.showPayoutForm(${farmerId})">💸 Pay Farmer</button>
                    </div>
                </div>
                ` : ''}

                <h3 style="color: #667eea; margin-bottom: 1rem;">📦 All Loads</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Load #</th>
                                <th>Mill</th>
                                <th>Bags</th>
                                <th>Payable</th>
                                <th>Mill Paid</th>
                                <th>Farmer Paid</th>
                                <th>Pending</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${loads.map(load => {
                                const mill = App.state.mills.find(m => m.id === load.mill_id);
                                const pending = load.farmer_payable - (load.farmer_paid_amount || 0);
                                const canPay = load.mill_payment_status === 'FULL' && pending > 0;

                                return `
                                    <tr style="${canPay ? 'background: #fef3c7;' : ''}">
                                        <td>${Utils.formatDate(load.date)}</td>
                                        <td><strong>${load.load_number}</strong></td>
                                        <td>${mill ? mill.name : 'Unknown'}</td>
                                        <td>${load.net_bags}</td>
                                        <td>${CalcEngine.formatCurrency(load.farmer_payable)}</td>
                                        <td><span class="badge badge-${load.mill_payment_status === 'FULL' ? 'success' : 'warning'}">${load.mill_payment_status}</span></td>
                                        <td><span class="badge badge-${load.farmer_payment_status === 'FULL' ? 'success' : 'warning'}">${load.farmer_payment_status}</span></td>
                                        <td><strong style="color: ${pending > 0 ? '#dc2626' : '#059669'};">${CalcEngine.formatCurrency(pending)}</strong></td>
                                        <td>
                                            ${canPay ? `<button class="btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" onclick="Farmers.payForLoad(${farmerId}, ${load.id})">Pay Now</button>` : '-'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                ${farmerPayments.length > 0 ? `
                    <h3 style="color: #667eea; margin: 2rem 0 1rem;">💰 Payment History</h3>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Load #</th>
                                    <th>Gross Amount</th>
                                    <th>Credit Cut</th>
                                    <th>Net Paid</th>
                                    <th>Method</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${farmerPayments.map(payment => {
                                    const load = loads.find(l => l.id === payment.load_id);
                                    return `
                                        <tr>
                                            <td>${Utils.formatDate(payment.payment_date)}</td>
                                            <td>${load ? load.load_number : 'N/A'}</td>
                                            <td>${CalcEngine.formatCurrency(payment.gross_amount)}</td>
                                            <td style="color: #059669;">${payment.credit_cut_amount > 0 ? '-' : ''}${CalcEngine.formatCurrency(payment.credit_cut_amount)}</td>
                                            <td><strong>${CalcEngine.formatCurrency(payment.net_amount)}</strong></td>
                                            <td>${payment.payment_method || 'CASH'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                <div style="margin-top: 2rem;">
                    <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
                </div>
            </div>
        `;

        App.openModal(`Farmer Ledger - ${farmer.name}`, ledger);
    },

    async payForLoad(farmerId, loadId) {
        const load = await DB.get('loads', loadId);
        const farmer = await DB.get('farmers', farmerId);

        if (!load || !farmer) {
            Utils.showToast('Load or farmer not found', 'error');
            return;
        }

        if (load.mill_payment_status !== 'FULL') {
            Utils.showToast('Cannot pay farmer until mill payment is received', 'warning');
            return;
        }

        const pending = load.farmer_payable - (load.farmer_paid_amount || 0);
        if (pending <= 0) {
            Utils.showToast('No pending amount for this load', 'info');
            return;
        }

        // Calculate credit cut eligibility
        const today = Utils.getToday();
        const creditCut = CalcEngine.calculateCreditCut(load.date, today, pending, App.state.settings);

        const form = `
            <form id="payout-form" class="form-grid">
                <div class="form-group full-width" style="background: #f0f9ff; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div><strong>Farmer:</strong> ${farmer.name}</div>
                    <div><strong>Load:</strong> ${load.load_number}</div>
                    <div><strong>Date:</strong> ${Utils.formatDate(load.date)}</div>
                </div>

                <div class="form-group">
                    <label>Payment Date *</label>
                    <input type="date" name="payment_date" value="${today}" required max="${today}">
                </div>

                <div class="form-group">
                    <label>Gross Amount</label>
                    <input type="number" name="gross_amount" value="${pending}" readonly style="background: #f9fafb;">
                </div>

                <div class="form-group full-width" style="background: ${creditCut.eligible ? '#d1fae5' : '#fef3c7'}; padding: 1rem; border-radius: 0.5rem;">
                    <strong>${creditCut.eligible ? '✅' : '⚠️'} Credit Cut (${App.state.settings.credit_cut_percent}% if paid within ${App.state.settings.credit_cut_days} days)</strong>
                    <div style="font-size: 0.9rem; margin-top: 0.5rem;">
                        Days since load: ${creditCut.daysDiff} days<br>
                        ${creditCut.eligible ?
                            `<span style="color: #065f46;">✅ Eligible for ${App.state.settings.credit_cut_percent}% discount: ${CalcEngine.formatCurrency(creditCut.creditCut)}</span>` :
                            `<span style="color: #92400e;">❌ Not eligible (more than ${App.state.settings.credit_cut_days} days)</span>`
                        }
                    </div>
                </div>

                <div class="form-group">
                    <label>Credit Cut Amount</label>
                    <input type="number" name="credit_cut_amount" value="${creditCut.creditCut}" readonly style="background: #f9fafb;">
                </div>

                <div class="form-group">
                    <label>Net Payment Amount *</label>
                    <input type="number" name="net_amount" value="${creditCut.netPayment}" required readonly style="background: #d1fae5; font-weight: 700; font-size: 1.1rem;">
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

                <div class="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>

                <div class="form-group full-width" style="display: flex; gap: 1rem;">
                    <button type="submit" class="btn btn-success">💸 Pay Farmer ${CalcEngine.formatCurrency(creditCut.netPayment)}</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Pay Farmer', form);

        document.getElementById('payout-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processPayout(e.target, farmerId, loadId);
        });
    },

    async processPayout(form, farmerId, loadId) {
        try {
            const formData = new FormData(form);

            const payment = {
                farmer_id: farmerId,
                load_id: loadId,
                payment_date: formData.get('payment_date'),
                gross_amount: parseFloat(formData.get('gross_amount')),
                credit_cut_amount: parseFloat(formData.get('credit_cut_amount')),
                net_amount: parseFloat(formData.get('net_amount')),
                payment_method: formData.get('payment_method'),
                reference_number: formData.get('reference_number') || null,
                notes: formData.get('notes') || null
            };

            // Save payment record
            await DB.add('farmer_payments', payment);

            // Update load
            const load = await DB.get('loads', loadId);
            await DB.update('loads', loadId, {
                farmer_paid_amount: (load.farmer_paid_amount || 0) + payment.net_amount,
                farmer_payment_status: 'FULL',
                farmer_paid_date: payment.payment_date,
                credit_cut_amount: payment.credit_cut_amount,
                status: 'SETTLED'
            });

            await App.loadAllData();
            Utils.showToast('Farmer paid successfully!', 'success');
            App.closeModal();
            this.showLedger(farmerId);
        } catch (error) {
            console.error('Error processing payout:', error);
            Utils.showToast('Failed to process payout: ' + error.message, 'error');
        }
    }
};
