// Vehicle Management Module
const Vehicles = {
    async show() {
        await this.render();
    },

    async render() {
        const vehicles = await DB.getAll('vehicles');
        const activeVehicles = vehicles.filter(v => v.active === 1);

        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span>Vehicles Management</span>
                    <button class="btn btn-primary" onclick="Vehicles.showNewForm()">➕ Add Vehicle</button>
                </div>
                ${this.renderTable(activeVehicles)}
            </div>
        `;
    },

    renderTable(vehicles) {
        if (vehicles.length === 0) {
            return '<p class="no-data">No vehicles found. Click "Add Vehicle" to create one.</p>';
        }

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Vehicle Number</th>
                            <th>Type</th>
                            <th>Capacity (Kg)</th>
                            <th>Driver Name</th>
                            <th>Driver Phone</th>
                            <th>Total Trips</th>
                            <th>Total Bags</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vehicles.map(v => this.renderRow(v)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(vehicle) {
        return `
            <tr>
                <td><strong>${Utils.escapeHtml(vehicle.number)}</strong></td>
                <td><span class="badge badge-secondary">${vehicle.type || 'TRUCK'}</span></td>
                <td>${vehicle.capacity_kg ? CalcEngine.formatNumber(vehicle.capacity_kg) : '-'}</td>
                <td>${vehicle.driver_name || '-'}</td>
                <td>${vehicle.driver_phone || '-'}</td>
                <td>${vehicle.total_trips || 0}</td>
                <td>${vehicle.total_bags || 0}</td>
                <td class="actions">
                    <button class="btn-icon" onclick="Vehicles.showEditForm(${vehicle.id})" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="Vehicles.deleteVehicle(${vehicle.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    },

    showNewForm() {
        const form = `
            <form id="vehicle-form" class="form-grid">
                <div class="form-group">
                    <label>Vehicle Number *</label>
                    <input type="text" name="number" required placeholder="e.g., HR38AB1234">
                </div>

                <div class="form-group">
                    <label>Vehicle Type</label>
                    <select name="type">
                        <option value="TRUCK">Truck</option>
                        <option value="TRACTOR">Tractor</option>
                        <option value="MINI_TRUCK">Mini Truck</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Capacity (Kg)</label>
                    <input type="number" name="capacity_kg" min="0">
                </div>

                <div class="form-group">
                    <label>Driver Name</label>
                    <input type="text" name="driver_name">
                </div>

                <div class="form-group">
                    <label>Driver Phone</label>
                    <input type="tel" name="driver_phone" pattern="[0-9]{10}">
                </div>

                <div class="form-group">
                    <label>Driver License</label>
                    <input type="text" name="driver_license">
                </div>

                <div class="form-group full-width">
                    <button type="submit" class="btn btn-success">💾 Save Vehicle</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Add New Vehicle', form);

        document.getElementById('vehicle-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveVehicle(e.target);
        });
    },

    async showEditForm(id) {
        const vehicle = await DB.get('vehicles', id);
        if (!vehicle) {
            Utils.showToast('Vehicle not found', 'error');
            return;
        }

        const form = `
            <form id="vehicle-form" class="form-grid">
                <input type="hidden" name="id" value="${vehicle.id}">

                <div class="form-group">
                    <label>Vehicle Number *</label>
                    <input type="text" name="number" value="${Utils.escapeHtml(vehicle.number)}" required>
                </div>

                <div class="form-group">
                    <label>Vehicle Type</label>
                    <select name="type">
                        <option value="TRUCK" ${vehicle.type === 'TRUCK' ? 'selected' : ''}>Truck</option>
                        <option value="TRACTOR" ${vehicle.type === 'TRACTOR' ? 'selected' : ''}>Tractor</option>
                        <option value="MINI_TRUCK" ${vehicle.type === 'MINI_TRUCK' ? 'selected' : ''}>Mini Truck</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Capacity (Kg)</label>
                    <input type="number" name="capacity_kg" value="${vehicle.capacity_kg || ''}" min="0">
                </div>

                <div class="form-group">
                    <label>Driver Name</label>
                    <input type="text" name="driver_name" value="${vehicle.driver_name || ''}">
                </div>

                <div class="form-group">
                    <label>Driver Phone</label>
                    <input type="tel" name="driver_phone" value="${vehicle.driver_phone || ''}" pattern="[0-9]{10}">
                </div>

                <div class="form-group">
                    <label>Driver License</label>
                    <input type="text" name="driver_license" value="${vehicle.driver_license || ''}">
                </div>

                <div class="form-group full-width">
                    <button type="submit" class="btn btn-success">💾 Update Vehicle</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Edit Vehicle', form);

        document.getElementById('vehicle-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveVehicle(e.target, id);
        });
    },

    async saveVehicle(form, id = null) {
        try {
            const formData = new FormData(form);
            const vehicle = {
                number: formData.get('number'),
                type: formData.get('type'),
                capacity_kg: formData.get('capacity_kg') ? parseFloat(formData.get('capacity_kg')) : null,
                driver_name: formData.get('driver_name') || null,
                driver_phone: formData.get('driver_phone') || null,
                driver_license: formData.get('driver_license') || null,
                total_trips: 0,
                total_bags: 0
            };

            if (id) {
                await DB.update('vehicles', id, vehicle);
                Utils.showToast('Vehicle updated successfully!', 'success');
            } else {
                await DB.add('vehicles', vehicle);
                Utils.showToast('Vehicle added successfully!', 'success');
            }

            await App.loadAllData();
            App.closeModal();
            this.render();
        } catch (error) {
            console.error('Error saving vehicle:', error);
            Utils.showToast('Failed to save vehicle', 'error');
        }
    },

    async deleteVehicle(id) {
        if (!await Utils.confirm('Are you sure you want to delete this vehicle?')) {
            return;
        }

        try {
            await DB.delete('vehicles', id);
            Utils.showToast('Vehicle deleted successfully!', 'success');
            await App.loadAllData();
            this.render();
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            Utils.showToast('Failed to delete vehicle', 'error');
        }
    }
};
