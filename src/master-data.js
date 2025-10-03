// Master Data Table & Backup Module
const MasterData = {
    currentView: 'all', // all, loads, farmers, mills, vehicles, payments

    async show() {
        await this.render();
    },

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span>Master Data & Backup</span>
                    <div class="header-actions">
                        <button class="btn btn-success" onclick="MasterData.exportToGoogleSheets()">
                            📊 Export to Google Sheets
                        </button>
                        <button class="btn btn-primary" onclick="MasterData.exportToCSV()">
                            📁 Export to CSV
                        </button>
                        <button class="btn btn-secondary" onclick="MasterData.exportToJSON()">
                            💾 Backup JSON
                        </button>
                        <button class="btn btn-info" onclick="MasterData.exportSingleTable()">
                            📄 Export Current View
                        </button>
                    </div>
                </div>

                <!-- View Selector -->
                <div style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn ${this.currentView === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="MasterData.switchView('all')">
                        📋 All Data
                    </button>
                    <button class="btn ${this.currentView === 'loads' ? 'btn-primary' : 'btn-secondary'}" onclick="MasterData.switchView('loads')">
                        📦 Loads
                    </button>
                    <button class="btn ${this.currentView === 'farmers' ? 'btn-primary' : 'btn-secondary'}" onclick="MasterData.switchView('farmers')">
                        👨‍🌾 Farmers
                    </button>
                    <button class="btn ${this.currentView === 'mills' ? 'btn-primary' : 'btn-secondary'}" onclick="MasterData.switchView('mills')">
                        🏭 Mills
                    </button>
                    <button class="btn ${this.currentView === 'vehicles' ? 'btn-primary' : 'btn-secondary'}" onclick="MasterData.switchView('vehicles')">
                        🚚 Vehicles
                    </button>
                    <button class="btn ${this.currentView === 'payments' ? 'btn-primary' : 'btn-secondary'}" onclick="MasterData.switchView('payments')">
                        💰 Payments
                    </button>
                </div>

                <!-- Summary Cards -->
                ${await this.renderSummary()}

                <!-- Data Tables -->
                ${await this.renderDataTables()}
            </div>
        `;
    },

    switchView(view) {
        this.currentView = view;
        this.render();
    },

    async renderSummary() {
        const loads = App.state.loads;
        const farmers = App.state.farmers;
        const mills = App.state.mills;
        const vehicles = App.state.vehicles;
        const millPayments = await DB.getAll('mill_payments');
        const farmerPayments = await DB.getAll('farmer_payments');

        const totalMillReceivable = loads.reduce((sum, l) => sum + (l.mill_receivable || 0), 0);
        const totalMillReceived = loads.reduce((sum, l) => sum + (l.mill_paid_amount || 0), 0);
        const totalFarmerPayable = loads.reduce((sum, l) => sum + (l.farmer_payable || 0), 0);
        const totalFarmerPaid = loads.reduce((sum, l) => sum + (l.farmer_paid_amount || 0), 0);

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 1.5rem; border-radius: 0.75rem;">
                    <div style="font-size: 0.75rem; color: #1e40af; margin-bottom: 0.5rem;">TOTAL LOADS</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #1e3a8a;">${loads.length}</div>
                </div>
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 1.5rem; border-radius: 0.75rem;">
                    <div style="font-size: 0.75rem; color: #78350f; margin-bottom: 0.5rem;">TOTAL FARMERS</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #78350f;">${farmers.length}</div>
                </div>
                <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 1.5rem; border-radius: 0.75rem;">
                    <div style="font-size: 0.75rem; color: #065f46; margin-bottom: 0.5rem;">TOTAL MILLS</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #065f46;">${mills.length}</div>
                </div>
                <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 1.5rem; border-radius: 0.75rem;">
                    <div style="font-size: 0.75rem; color: #991b1b; margin-bottom: 0.5rem;">TOTAL VEHICLES</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #991b1b;">${vehicles.length}</div>
                </div>
                <div style="background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); padding: 1.5rem; border-radius: 0.75rem;">
                    <div style="font-size: 0.75rem; color: #3730a3; margin-bottom: 0.5rem;">MILL RECEIVABLE</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #3730a3;">${CalcEngine.formatCurrency(totalMillReceivable)}</div>
                </div>
                <div style="background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); padding: 1.5rem; border-radius: 0.75rem;">
                    <div style="font-size: 0.75rem; color: #831843; margin-bottom: 0.5rem;">FARMER PAYABLE</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #831843;">${CalcEngine.formatCurrency(totalFarmerPayable)}</div>
                </div>
            </div>
        `;
    },

    async renderDataTables() {
        switch (this.currentView) {
            case 'all':
                return await this.renderAllData();
            case 'loads':
                return this.renderLoadsTable();
            case 'farmers':
                return this.renderFarmersTable();
            case 'mills':
                return this.renderMillsTable();
            case 'vehicles':
                return this.renderVehiclesTable();
            case 'payments':
                return await this.renderPaymentsTable();
            default:
                return await this.renderAllData();
        }
    },

    async renderAllData() {
        return `
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <div>
                    <h3 style="color: #667eea; margin-bottom: 1rem;">📦 Recent Loads (Last 10)</h3>
                    ${this.renderLoadsTable(10)}
                </div>
                <div>
                    <h3 style="color: #667eea; margin-bottom: 1rem;">👨‍🌾 Farmers</h3>
                    ${this.renderFarmersTable(10)}
                </div>
                <div>
                    <h3 style="color: #667eea; margin-bottom: 1rem;">🏭 Mills</h3>
                    ${this.renderMillsTable(10)}
                </div>
                <div>
                    <h3 style="color: #667eea; margin-bottom: 1rem;">🚚 Vehicles</h3>
                    ${this.renderVehiclesTable()}
                </div>
            </div>
        `;
    },

    renderLoadsTable(limit = null) {
        let loads = [...App.state.loads].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (limit) loads = loads.slice(0, limit);

        if (loads.length === 0) {
            return '<p class="no-data">No loads found.</p>';
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
                            <th>Vehicle</th>
                            <th>Bags</th>
                            <th>Farmer Payable</th>
                            <th>Mill Receivable</th>
                            <th>Mill Status</th>
                            <th>Farmer Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loads.map(load => {
                            const farmer = App.state.farmers.find(f => f.id === load.farmer_id);
                            const mill = App.state.mills.find(m => m.id === load.mill_id);
                            const vehicle = App.state.vehicles.find(v => v.id === load.vehicle_id);
                            return `
                                <tr>
                                    <td><strong>${load.load_number}</strong></td>
                                    <td>${Utils.formatDate(load.date)}</td>
                                    <td>${farmer ? farmer.name : 'Unknown'}</td>
                                    <td>${mill ? mill.name : 'Unknown'}</td>
                                    <td>${vehicle ? vehicle.number : 'Unknown'}</td>
                                    <td>${load.net_bags}</td>
                                    <td>${CalcEngine.formatCurrency(load.farmer_payable)}</td>
                                    <td>${CalcEngine.formatCurrency(load.mill_receivable)}</td>
                                    <td><span class="badge badge-${load.mill_payment_status === 'FULL' ? 'success' : 'warning'}">${load.mill_payment_status}</span></td>
                                    <td><span class="badge badge-${load.farmer_payment_status === 'FULL' ? 'success' : 'warning'}">${load.farmer_payment_status}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderFarmersTable(limit = null) {
        let farmers = [...App.state.farmers];
        if (limit) farmers = farmers.slice(0, limit);

        if (farmers.length === 0) {
            return '<p class="no-data">No farmers found.</p>';
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
                            <th>IFSC</th>
                            <th>Default Rate</th>
                            <th>Total Loads</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${farmers.map(f => {
                            const loads = App.state.loads.filter(l => l.farmer_id === f.id);
                            return `
                                <tr>
                                    <td><strong>${Utils.escapeHtml(f.name)}</strong></td>
                                    <td>${Utils.escapeHtml(f.village)}</td>
                                    <td>${f.phone || '-'}</td>
                                    <td>${f.bank_account || '-'}</td>
                                    <td>${f.bank_ifsc || '-'}</td>
                                    <td>${f.default_rate ? CalcEngine.formatCurrency(f.default_rate) : '-'}</td>
                                    <td>${loads.length}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderMillsTable(limit = null) {
        let mills = [...App.state.mills];
        if (limit) mills = mills.slice(0, limit);

        if (mills.length === 0) {
            return '<p class="no-data">No mills found.</p>';
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
                            <th>GSTIN</th>
                            <th>Default Rate</th>
                            <th>Commission Policy</th>
                            <th>Total Loads</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mills.map(m => {
                            const loads = App.state.loads.filter(l => l.mill_id === m.id);
                            return `
                                <tr>
                                    <td><strong>${Utils.escapeHtml(m.name)}</strong></td>
                                    <td>${Utils.escapeHtml(m.village)}</td>
                                    <td>${m.contact_person || '-'}</td>
                                    <td>${m.phone || '-'}</td>
                                    <td>${m.gstin || '-'}</td>
                                    <td>${m.default_rate ? CalcEngine.formatCurrency(m.default_rate) : '-'}</td>
                                    <td>${m.commission_policy || 'Default'}</td>
                                    <td>${loads.length}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderVehiclesTable() {
        const vehicles = App.state.vehicles;

        if (vehicles.length === 0) {
            return '<p class="no-data">No vehicles found.</p>';
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
                            <th>Driver License</th>
                            <th>Total Trips</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vehicles.map(v => {
                            const loads = App.state.loads.filter(l => l.vehicle_id === v.id);
                            return `
                                <tr>
                                    <td><strong>${Utils.escapeHtml(v.number)}</strong></td>
                                    <td>${v.type}</td>
                                    <td>${v.capacity_kg ? CalcEngine.formatNumber(v.capacity_kg) : '-'}</td>
                                    <td>${v.driver_name || '-'}</td>
                                    <td>${v.driver_phone || '-'}</td>
                                    <td>${v.driver_license || '-'}</td>
                                    <td>${loads.length}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderPaymentsTable() {
        const millPayments = await DB.getAll('mill_payments');
        const farmerPayments = await DB.getAll('farmer_payments');

        return `
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <div>
                    <h3 style="color: #667eea; margin-bottom: 1rem;">💰 Mill Payments</h3>
                    ${this.renderMillPaymentsTable(millPayments)}
                </div>
                <div>
                    <h3 style="color: #667eea; margin-bottom: 1rem;">💸 Farmer Payouts</h3>
                    ${this.renderFarmerPaymentsTable(farmerPayments)}
                </div>
            </div>
        `;
    },

    renderMillPaymentsTable(payments) {
        if (payments.length === 0) {
            return '<p class="no-data">No mill payments found.</p>';
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
                            <th>Load #</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(p => {
                            const mill = App.state.mills.find(m => m.id === p.mill_id);
                            const load = p.load_id ? App.state.loads.find(l => l.id === p.load_id) : null;
                            return `
                                <tr>
                                    <td>${Utils.formatDate(p.payment_date)}</td>
                                    <td>${mill ? mill.name : 'Unknown'}</td>
                                    <td><strong>${CalcEngine.formatCurrency(p.amount)}</strong></td>
                                    <td>${p.payment_method || 'CASH'}</td>
                                    <td>${p.reference_number || '-'}</td>
                                    <td>${load ? load.load_number : '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderFarmerPaymentsTable(payments) {
        if (payments.length === 0) {
            return '<p class="no-data">No farmer payouts found.</p>';
        }

        return `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Payment Date</th>
                            <th>Farmer</th>
                            <th>Gross Amount</th>
                            <th>Credit Cut</th>
                            <th>Net Paid</th>
                            <th>Method</th>
                            <th>Invoice #</th>
                            <th>Load #</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(p => {
                            const farmer = App.state.farmers.find(f => f.id === p.farmer_id);
                            const load = App.state.loads.find(l => l.id === p.load_id);
                            return `
                                <tr>
                                    <td>${Utils.formatDate(p.payment_date)}</td>
                                    <td>${farmer ? farmer.name : 'Unknown'}</td>
                                    <td>${CalcEngine.formatCurrency(p.gross_amount)}</td>
                                    <td><strong style="color: #f59e0b;">${p.credit_cut_amount > 0 ? '-' : ''}${CalcEngine.formatCurrency(p.credit_cut_amount || 0)}</strong></td>
                                    <td><strong>${CalcEngine.formatCurrency(p.net_amount)}</strong></td>
                                    <td>${p.payment_method || 'CASH'}</td>
                                    <td>${p.invoice_number || '-'}</td>
                                    <td>${load ? load.load_number : '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Export to CSV
    async exportToCSV() {
        try {
            console.log('Starting CSV export...');
            const data = await this.prepareExportData();
            console.log('Export data prepared:', data);

            // Validate data object
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid export data structure');
            }

            // Create separate CSV files for each entity
            const csvFiles = {};

            for (const [tableName, records] of Object.entries(data)) {
                console.log(`Processing table: ${tableName}, records:`, records);

                // Skip settings object (it's a single object, not an array)
                if (tableName === 'settings') {
                    console.log('Skipping settings');
                    continue;
                }

                // Validate records
                if (!records) {
                    console.log(`${tableName}: records is null/undefined`);
                    continue;
                }

                // Skip empty arrays
                if (!Array.isArray(records)) {
                    console.log(`${tableName}: not an array, type:`, typeof records);
                    continue;
                }

                if (records.length === 0) {
                    console.log(`${tableName}: empty array`);
                    continue;
                }

                // Validate first record
                const firstRecord = records[0];
                if (!firstRecord || typeof firstRecord !== 'object') {
                    console.log(`${tableName}: invalid first record`, firstRecord);
                    continue;
                }

                try {
                    const headers = Object.keys(firstRecord);
                    console.log(`${tableName} headers:`, headers);

                    const csvRows = [headers.join(',')];

                    records.forEach((record, index) => {
                        if (!record || typeof record !== 'object') {
                            console.warn(`${tableName}: Invalid record at index ${index}`, record);
                            return;
                        }

                        const values = headers.map(header => {
                            const value = record[header];

                            // Handle null/undefined
                            if (value === null || value === undefined) {
                                return '';
                            }

                            // Convert to string and escape
                            let strValue = String(value);

                            // Escape quotes
                            strValue = strValue.replace(/"/g, '""');

                            // Wrap in quotes if contains comma, newline, or quote
                            if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
                                return `"${strValue}"`;
                            }

                            return strValue;
                        });
                        csvRows.push(values.join(','));
                    });

                    csvFiles[tableName] = csvRows.join('\n');
                    console.log(`${tableName}: CSV created, rows:`, csvRows.length);

                } catch (tableError) {
                    console.error(`Error processing table ${tableName}:`, tableError);
                }
            }

            // Check if any files to export
            if (Object.keys(csvFiles).length === 0) {
                console.log('No CSV files generated');
                Utils.showToast('No data available to export', 'warning');
                return;
            }

            console.log(`Generated ${Object.keys(csvFiles).length} CSV files`);

            // Download each CSV with a small delay between downloads
            let delay = 0;
            for (const [tableName, csvContent] of Object.entries(csvFiles)) {
                setTimeout(() => {
                    try {
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        console.log(`Downloaded: ${tableName}.csv`);
                    } catch (downloadError) {
                        console.error(`Error downloading ${tableName}:`, downloadError);
                    }
                }, delay);
                delay += 500; // 500ms delay between downloads
            }

            Utils.showToast(`Exporting ${Object.keys(csvFiles).length} CSV files...`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            console.error('Error stack:', error.stack);
            Utils.showToast('Failed to export CSV: ' + error.message, 'error');
        }
    },

    // Export to JSON (Full Backup)
    async exportToJSON() {
        try {
            const data = await this.prepareExportData();

            const backup = {
                version: '1.0',
                exported_at: new Date().toISOString(),
                organization: App.state.settings ? App.state.settings.organization_name : 'Unknown',
                data: this.sanitizeDataForJSON(data)
            };

            const jsonString = JSON.stringify(backup, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rice_trade_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            Utils.showToast('Backup created successfully!', 'success');
        } catch (error) {
            console.error('Backup error:', error);
            Utils.showToast('Failed to create backup: ' + error.message, 'error');
        }
    },

    // Sanitize data to remove undefined values (JSON doesn't support undefined)
    sanitizeDataForJSON(data) {
        return JSON.parse(JSON.stringify(data, (key, value) => {
            // Convert undefined to null
            if (value === undefined) {
                return null;
            }
            return value;
        }));
    },

    // Export to Google Sheets
    async exportToGoogleSheets() {
        try {
            const data = await this.prepareExportData();

            // Create a formatted data structure for Google Sheets
            let sheetsContent = 'Rice Trade Business Data Export\n';
            sheetsContent += `Generated: ${new Date().toLocaleString()}\n\n`;

            // For now, create a text representation that can be copied
            // In a real implementation, you would integrate with Google Sheets API
            const formattedData = {
                'LOADS': this.formatTableForSheets(data.loads),
                'FARMERS': this.formatTableForSheets(data.farmers),
                'MILLS': this.formatTableForSheets(data.mills),
                'VEHICLES': this.formatTableForSheets(data.vehicles),
                'MILL_PAYMENTS': this.formatTableForSheets(data.mill_payments),
                'FARMER_PAYMENTS': this.formatTableForSheets(data.farmer_payments)
            };

            // Show modal with instructions
            const instructions = `
                <div style="max-width: 800px;">
                    <h3 style="color: #667eea; margin-bottom: 1rem;">📊 Google Sheets Export</h3>

                    <div style="background: #f0f9ff; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                        <h4 style="margin-top: 0;">Instructions:</h4>
                        <ol style="margin: 0;">
                            <li>Click "Download CSV Files" below to download all data tables</li>
                            <li>Open Google Sheets</li>
                            <li>Go to File → Import</li>
                            <li>Upload each CSV file to create separate sheets</li>
                            <li>Organize sheets in a single spreadsheet</li>
                        </ol>
                    </div>

                    <div style="background: #fef3c7; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                        <strong>💡 Pro Tip:</strong> Save the spreadsheet to Google Drive for automatic cloud backup!
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <button class="btn btn-success" onclick="MasterData.exportToCSV(); App.closeModal();">
                            📥 Download CSV Files
                        </button>
                        <button class="btn btn-secondary" onclick="App.closeModal()">
                            Close
                        </button>
                    </div>

                    <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                        <h4>Data Summary:</h4>
                        <ul style="margin: 0;">
                            <li>Loads: ${data.loads.length} records</li>
                            <li>Farmers: ${data.farmers.length} records</li>
                            <li>Mills: ${data.mills.length} records</li>
                            <li>Vehicles: ${data.vehicles.length} records</li>
                            <li>Mill Payments: ${data.mill_payments.length} records</li>
                            <li>Farmer Payments: ${data.farmer_payments.length} records</li>
                        </ul>
                    </div>
                </div>
            `;

            App.openModal('Export to Google Sheets', instructions);

        } catch (error) {
            console.error('Google Sheets export error:', error);
            Utils.showToast('Failed to prepare Google Sheets export: ' + error.message, 'error');
        }
    },

    formatTableForSheets(records) {
        if (records.length === 0) return [];

        const headers = Object.keys(records[0]);
        const rows = records.map(record => Object.values(record));

        return [headers, ...rows];
    },

    async prepareExportData() {
        try {
            const millPayments = await DB.getAll('mill_payments');
            const farmerPayments = await DB.getAll('farmer_payments');

            return {
                loads: Array.isArray(App.state.loads) ? App.state.loads : [],
                farmers: Array.isArray(App.state.farmers) ? App.state.farmers : [],
                mills: Array.isArray(App.state.mills) ? App.state.mills : [],
                vehicles: Array.isArray(App.state.vehicles) ? App.state.vehicles : [],
                mill_payments: Array.isArray(millPayments) ? millPayments : [],
                farmer_payments: Array.isArray(farmerPayments) ? farmerPayments : [],
                settings: App.state.settings || {}
            };
        } catch (error) {
            console.error('Error preparing export data:', error);
            throw new Error('Failed to prepare export data: ' + error.message);
        }
    },

    // Export single table based on current view (simpler, safer)
    async exportSingleTable() {
        try {
            let tableName = '';
            let records = [];

            switch (this.currentView) {
                case 'loads':
                    tableName = 'loads';
                    records = App.state.loads || [];
                    break;
                case 'farmers':
                    tableName = 'farmers';
                    records = App.state.farmers || [];
                    break;
                case 'mills':
                    tableName = 'mills';
                    records = App.state.mills || [];
                    break;
                case 'vehicles':
                    tableName = 'vehicles';
                    records = App.state.vehicles || [];
                    break;
                case 'payments':
                    tableName = 'all_payments';
                    const millPayments = await DB.getAll('mill_payments') || [];
                    const farmerPayments = await DB.getAll('farmer_payments') || [];
                    records = [...millPayments, ...farmerPayments];
                    break;
                default:
                    Utils.showToast('Please select a specific view to export', 'info');
                    return;
            }

            if (!Array.isArray(records) || records.length === 0) {
                Utils.showToast('No data to export in current view', 'warning');
                return;
            }

            // Create CSV
            const headers = Object.keys(records[0]);
            const csvRows = [headers.join(',')];

            records.forEach(record => {
                const values = headers.map(header => {
                    const value = record[header];
                    if (value === null || value === undefined) return '';
                    let str = String(value).replace(/"/g, '""');
                    return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
                });
                csvRows.push(values.join(','));
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            Utils.showToast(`Exported ${records.length} ${tableName} records`, 'success');
        } catch (error) {
            console.error('Single export error:', error);
            Utils.showToast('Failed to export: ' + error.message, 'error');
        }
    }
};
