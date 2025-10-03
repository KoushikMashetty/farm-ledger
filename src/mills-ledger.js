// Mill Ledger and Payment Recording
const MillsLedger = {
    async showLedger(millId) {
        const mill = await DB.get('mills', millId);
        if (!mill) {
            Utils.showToast('Mill not found', 'error');
            return;
        }

        const loads = App.state.loads.filter(l => l.mill_id === millId);
        const payments = await DB.getAll('mill_payments');
        const millPayments = payments.filter(p => p.mill_id === millId);

        // Calculate totals
        const totalReceivable = loads.reduce((sum, l) => sum + (l.mill_receivable || 0), 0);
        const totalReceived = loads.reduce((sum, l) => sum + (l.mill_paid_amount || 0), 0);
        const pendingAmount = totalReceivable - totalReceived;

        // Get pending loads
        const pendingLoads = loads.filter(l => l.mill_payment_status !== 'FULL');

        const ledger = `
            <div style="max-width: 1200px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #1e40af; margin-bottom: 0.5rem;">TOTAL LOADS</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #1e3a8a;">${loads.length}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #78350f; margin-bottom: 0.5rem;">TOTAL TO COLLECT</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #78350f;">${CalcEngine.formatCurrency(totalReceivable)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #065f46; margin-bottom: 0.5rem;">TOTAL RECEIVED</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #065f46;">${CalcEngine.formatCurrency(totalReceived)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 1.5rem; border-radius: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #991b1b; margin-bottom: 0.5rem;">PENDING</div>
                        <div style="font-size: 2rem; font-weight: 700; color: #991b1b;">${CalcEngine.formatCurrency(pendingAmount)}</div>
                    </div>
                </div>

                ${pendingLoads.length > 0 ? `
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                    <strong style="color: #78350f;">⚠️ ${pendingLoads.length} Load(s) Pending Payment</strong>
                    <div style="font-size: 0.85rem; color: #92400e; margin-top: 0.25rem;">
                        Mark individual loads as paid below.
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
                                <th>Farmer</th>
                                <th>Bags</th>
                                <th>To Collect</th>
                                <th>Received</th>
                                <th>Pending</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${loads.map(load => {
                                const farmer = App.state.farmers.find(f => f.id === load.farmer_id);
                                const pending = load.mill_receivable - (load.mill_paid_amount || 0);
                                const canRecord = pending > 0;

                                return `
                                    <tr style="${canRecord ? 'background: #fef3c7;' : ''}">
                                        <td>${Utils.formatDate(load.date)}</td>
                                        <td><strong>${load.load_number}</strong></td>
                                        <td>${farmer ? farmer.name : 'Unknown'}</td>
                                        <td>${load.net_bags}</td>
                                        <td>${CalcEngine.formatCurrency(load.mill_receivable)}</td>
                                        <td>${CalcEngine.formatCurrency(load.mill_paid_amount || 0)}</td>
                                        <td><strong style="color: ${pending > 0 ? '#dc2626' : '#059669'};">${CalcEngine.formatCurrency(pending)}</strong></td>
                                        <td><span class="badge badge-${load.mill_payment_status === 'FULL' ? 'success' : 'warning'}">${load.mill_payment_status}</span></td>
                                        <td>
                                            ${canRecord ? `<button class="btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" onclick="MillsLedger.recordPayment(${millId}, ${load.id})">Record Payment</button>` : '✅'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                ${millPayments.length > 0 ? `
                    <h3 style="color: #667eea; margin: 2rem 0 1rem;">💰 Payment History</h3>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Load #</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Reference</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${millPayments.flatMap(payment => {
                                    const allocations = App.state.loads.filter(l => l.id === payment.load_id);
                                    return allocations.map(load => `
                                        <tr>
                                            <td>${Utils.formatDate(payment.payment_date)}</td>
                                            <td>${load ? load.load_number : 'N/A'}</td>
                                            <td><strong>${CalcEngine.formatCurrency(payment.amount)}</strong></td>
                                            <td>${payment.payment_method || 'CASH'}</td>
                                            <td>${payment.reference_number || '-'}</td>
                                            <td>${payment.notes || '-'}</td>
                                        </tr>
                                    `);
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

        App.openModal(`Mill Ledger - ${mill.name}`, ledger);
    },

    async recordPayment(millId, loadId) {
        const load = await DB.get('loads', loadId);
        const mill = await DB.get('mills', millId);

        if (!load || !mill) {
            Utils.showToast('Load or mill not found', 'error');
            return;
        }

        const pending = load.mill_receivable - (load.mill_paid_amount || 0);
        if (pending <= 0) {
            Utils.showToast('No pending amount for this load', 'info');
            return;
        }

        const today = Utils.getToday();

        const form = `
            <form id="mill-payment-form" class="form-grid">
                <div class="form-group full-width" style="background: #f0f9ff; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div><strong>Mill:</strong> ${mill.name}</div>
                    <div><strong>Load:</strong> ${load.load_number}</div>
                    <div><strong>Date:</strong> ${Utils.formatDate(load.date)}</div>
                </div>

                <div class="form-group">
                    <label>Payment Received Date *</label>
                    <input type="date" name="payment_date" value="${today}" required max="${today}">
                </div>

                <div class="form-group">
                    <label>Amount to Collect</label>
                    <input type="number" name="total_receivable" value="${load.mill_receivable}" readonly style="background: #f9fafb;">
                </div>

                <div class="form-group">
                    <label>Amount Received *</label>
                    <input type="number" name="amount" value="${pending}" required min="1" max="${pending}" step="0.01" style="font-weight: 700; font-size: 1.1rem;">
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
                    <button type="submit" class="btn btn-success">💰 Record Payment</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Record Mill Payment', form);

        document.getElementById('mill-payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processPayment(e.target, millId, loadId);
        });
    },

    async processPayment(form, millId, loadId) {
        try {
            const formData = new FormData(form);

            const payment = {
                mill_id: millId,
                load_id: loadId,
                payment_date: formData.get('payment_date'),
                amount: parseFloat(formData.get('amount')),
                payment_method: formData.get('payment_method'),
                reference_number: formData.get('reference_number') || null,
                notes: formData.get('notes') || null,
                allocation_method: 'MANUAL'
            };

            // Save payment record
            await DB.add('mill_payments', payment);

            // Update load
            const load = await DB.get('loads', loadId);
            const newPaidAmount = (load.mill_paid_amount || 0) + payment.amount;
            const isFull = newPaidAmount >= load.mill_receivable;

            await DB.update('loads', loadId, {
                mill_paid_amount: newPaidAmount,
                mill_payment_status: isFull ? 'FULL' : 'PARTIAL',
                mill_paid_date: payment.payment_date,
                status: isFull ? 'MILL_PAID_FULL' : 'MILL_PAID_PARTIAL'
            });

            await App.loadAllData();
            Utils.showToast('Mill payment recorded successfully!', 'success');
            App.closeModal();
            this.showLedger(millId);
        } catch (error) {
            console.error('Error recording payment:', error);
            Utils.showToast('Failed to record payment: ' + error.message, 'error');
        }
    }
};
