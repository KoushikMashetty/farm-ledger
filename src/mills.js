// Mill Management Module
const Mills = {
    currentSearch: '',

    async show() {
        await this.render();
    },

    async render() {
        const mills = this.currentSearch
            ? await DB.search('mills', ['name', 'village', 'contact_person', 'phone'], this.currentSearch)
            : await DB.getAll('mills');

        const activeMills = mills.filter(m => m.active === 1);

        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span>Mills Management</span>
                    <div class="header-actions">
                        <input type="text" id="mill-search" placeholder="Search mills..." class="search-input">
                        <button class="btn btn-primary" onclick="Mills.showNewForm()">➕ Add Mill</button>
                    </div>
                </div>
                ${this.renderTable(activeMills)}
            </div>
        `;

        const searchInput = document.getElementById('mill-search');
        searchInput.value = this.currentSearch;
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.currentSearch = e.target.value;
            this.render();
        }, 300));
    },

    renderTable(mills) {
        if (mills.length === 0) {
            return '<p class="no-data">No mills found. Click "Add Mill" to create one.</p>';
        }

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Village</th>
                            <th>Contact Person</th>
                            <th>Phone</th>
                            <th>Default Rate</th>
                            <th>Commission Policy</th>
                            <th>Total Loads</th>
                            <th>Outstanding</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mills.map(m => this.renderRow(m)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(mill) {
        // Calculate real-time outstanding
        const millLoads = App.state.loads.filter(l => l.mill_id === mill.id);
        const totalReceivable = millLoads.reduce((sum, l) => sum + (l.mill_receivable || 0), 0);
        const totalReceived = millLoads.reduce((sum, l) => sum + (l.mill_paid_amount || 0), 0);
        const outstanding = totalReceivable - totalReceived;

        return `
            <tr style="cursor: pointer;" onclick="MillsLedger.showLedger(${mill.id})">
                <td><strong>${Utils.escapeHtml(mill.name)}</strong></td>
                <td>${Utils.escapeHtml(mill.village)}</td>
                <td>${mill.contact_person || '-'}</td>
                <td>${mill.phone || '-'}</td>
                <td>${mill.default_rate ? CalcEngine.formatCurrency(mill.default_rate) : '-'}</td>
                <td><span class="badge badge-info">${mill.commission_policy || 'Default'}</span></td>
                <td>${millLoads.length}</td>
                <td><strong style="color: ${outstanding > 0 ? '#dc2626' : '#059669'};">${CalcEngine.formatCurrency(outstanding)}</strong></td>
                <td class="actions" onclick="event.stopPropagation()">
                    <button class="btn-icon" onclick="MillsLedger.showLedger(${mill.id})" title="View Ledger">📒</button>
                    <button class="btn-icon" onclick="Mills.showEditForm(${mill.id})" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="Mills.deleteMill(${mill.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    },

    showNewForm() {
        const form = `
            <form id="mill-form" class="form-grid">
                <div class="form-group">
                    <label>Mill Name *</label>
                    <input type="text" name="name" required>
                </div>

                <div class="form-group">
                    <label>Village *</label>
                    <input type="text" name="village" required>
                </div>

                <div class="form-group">
                    <label>Contact Person</label>
                    <input type="text" name="contact_person">
                </div>

                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" pattern="[0-9]{10}">
                </div>

                <div class="form-group full-width">
                    <label>Address</label>
                    <textarea name="address" rows="2"></textarea>
                </div>

                <div class="form-group">
                    <label>GSTIN</label>
                    <input type="text" name="gstin">
                </div>

                <div class="form-group">
                    <label>Default Rate (₹/bag)</label>
                    <input type="number" name="default_rate" min="0">
                </div>

                <div class="form-group">
                    <label>Payment Terms</label>
                    <input type="text" name="payment_terms" placeholder="e.g., 15 days, COD">
                </div>

                <div class="form-group">
                    <label>Commission Policy</label>
                    <select name="commission_policy">
                        <option value="">Use Default</option>
                        <option value="FARMER">Farmer Pays</option>
                        <option value="MILL">Mill Pays</option>
                        <option value="SPLIT">Split</option>
                        <option value="NONE">None</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Split Percent (if Split)</label>
                    <input type="number" name="commission_split_percent" min="0" max="100" value="50">
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>

                <div class="form-group full-width">
                    <label>Tags (comma-separated)</label>
                    <input type="text" name="tags" placeholder="e.g., trusted, premium">
                </div>

                <div class="form-group full-width">
                    <button type="submit" class="btn btn-success">💾 Save Mill</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Add New Mill', form);

        document.getElementById('mill-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveMill(e.target);
        });
    },

    async showEditForm(id) {
        const mill = await DB.get('mills', id);
        if (!mill) {
            Utils.showToast('Mill not found', 'error');
            return;
        }

        const form = `
            <form id="mill-form" class="form-grid">
                <input type="hidden" name="id" value="${mill.id}">

                <div class="form-group">
                    <label>Mill Name *</label>
                    <input type="text" name="name" value="${Utils.escapeHtml(mill.name)}" required>
                </div>

                <div class="form-group">
                    <label>Village *</label>
                    <input type="text" name="village" value="${Utils.escapeHtml(mill.village)}" required>
                </div>

                <div class="form-group">
                    <label>Contact Person</label>
                    <input type="text" name="contact_person" value="${mill.contact_person || ''}">
                </div>

                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" value="${mill.phone || ''}" pattern="[0-9]{10}">
                </div>

                <div class="form-group full-width">
                    <label>Address</label>
                    <textarea name="address" rows="2">${mill.address || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>GSTIN</label>
                    <input type="text" name="gstin" value="${mill.gstin || ''}">
                </div>

                <div class="form-group">
                    <label>Default Rate (₹/bag)</label>
                    <input type="number" name="default_rate" value="${mill.default_rate || ''}" min="0">
                </div>

                <div class="form-group">
                    <label>Payment Terms</label>
                    <input type="text" name="payment_terms" value="${mill.payment_terms || ''}">
                </div>

                <div class="form-group">
                    <label>Commission Policy</label>
                    <select name="commission_policy">
                        <option value="">Use Default</option>
                        <option value="FARMER" ${mill.commission_policy === 'FARMER' ? 'selected' : ''}>Farmer Pays</option>
                        <option value="MILL" ${mill.commission_policy === 'MILL' ? 'selected' : ''}>Mill Pays</option>
                        <option value="SPLIT" ${mill.commission_policy === 'SPLIT' ? 'selected' : ''}>Split</option>
                        <option value="NONE" ${mill.commission_policy === 'NONE' ? 'selected' : ''}>None</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Split Percent (if Split)</label>
                    <input type="number" name="commission_split_percent" value="${mill.commission_split_percent || 50}" min="0" max="100">
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="2">${mill.notes || ''}</textarea>
                </div>

                <div class="form-group full-width">
                    <label>Tags (comma-separated)</label>
                    <input type="text" name="tags" value="${mill.tags || ''}">
                </div>

                <div class="form-group full-width">
                    <button type="submit" class="btn btn-success">💾 Update Mill</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Edit Mill', form);

        document.getElementById('mill-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveMill(e.target, id);
        });
    },

    async saveMill(form, id = null) {
        try {
            const formData = new FormData(form);
            const mill = {
                name: formData.get('name'),
                village: formData.get('village'),
                contact_person: formData.get('contact_person') || null,
                phone: formData.get('phone') || null,
                address: formData.get('address') || null,
                gstin: formData.get('gstin') || null,
                default_rate: formData.get('default_rate') ? parseFloat(formData.get('default_rate')) : null,
                payment_terms: formData.get('payment_terms') || null,
                commission_policy: formData.get('commission_policy') || null,
                commission_split_percent: formData.get('commission_split_percent') ? parseInt(formData.get('commission_split_percent')) : null,
                notes: formData.get('notes') || null,
                tags: formData.get('tags') || null,
                total_loads: 0,
                total_bags: 0,
                total_due: 0,
                total_paid: 0,
                outstanding_balance: 0
            };

            if (id) {
                await DB.update('mills', id, mill);
                Utils.showToast('Mill updated successfully!', 'success');
            } else {
                await DB.add('mills', mill);
                Utils.showToast('Mill added successfully!', 'success');
            }

            await App.loadAllData();
            App.closeModal();
            this.render();
        } catch (error) {
            console.error('Error saving mill:', error);
            Utils.showToast('Failed to save mill', 'error');
        }
    },

    async deleteMill(id) {
        if (!await Utils.confirm('Are you sure you want to delete this mill?')) {
            return;
        }

        try {
            await DB.delete('mills', id);
            Utils.showToast('Mill deleted successfully!', 'success');
            await App.loadAllData();
            this.render();
        } catch (error) {
            console.error('Error deleting mill:', error);
            Utils.showToast('Failed to delete mill', 'error');
        }
    }
};
