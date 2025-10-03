let AppState = {
    currentTab: 'dashboard',
    settings: null,
    farmers: [],
    mills: [],
    vehicles: [],
    loads: [],
    advances: [],
    receipts: [],
    payouts: []
};

async function init() {
    await DB.init();
    await DB.seedData();
    await loadSettings();
    await loadAllData();
    
    setupEventListeners();
    showDashboard();
    
    const loads = await DB.getAll('loads');
    if (loads.length <= 2) {
        document.getElementById('quickstart-banner').classList.remove('hidden');
    }
}

async function loadSettings() {
    AppState.settings = await DB.get('settings', 'default');
}

async function loadAllData() {
    AppState.farmers = await DB.getAll('farmers');
    AppState.mills = await DB.getAll('mills');
    AppState.vehicles = await DB.getAll('vehicles');
    AppState.loads = await DB.getAll('loads');
    AppState.advances = await DB.getAll('advances');
    AppState.receipts = await DB.getAll('receipts');
    AppState.payouts = await DB.getAll('payouts');
}

function setupEventListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });
    
    document.getElementById('dismiss-banner')?.addEventListener('click', () => {
        document.getElementById('quickstart-banner').classList.add('hidden');
    });
    
    document.querySelector('.close')?.addEventListener('click', closeModal);
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    AppState.currentTab = tabName;
    
    switch(tabName) {
        case 'dashboard': showDashboard(); break;
        case 'loads': showLoads(); break;
        case 'farmers': showFarmers(); break;
        case 'mills': showMills(); break;
        case 'advances': showAdvances(); break;
        case 'receipts': showReceipts(); break;
        case 'payouts': showPayouts(); break;
        case 'reports': showReports(); break;
        case 'settings': showSettings(); break;
        case 'backup': showBackup(); break;
    }
}

function showDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayLoads = AppState.loads.filter(l => l.date === today).length;
    
    const month = new Date().toISOString().slice(0, 7);
    const monthLoads = AppState.loads.filter(l => l.date.startsWith(month));
    
    let monthProfit = 0;
    monthLoads.forEach(load => {
        const computed = load.computed || {};
        monthProfit += (computed.commissionAmount || 0);
        monthProfit += (computed.financeChargesPerLoad || 0);
        monthProfit -= (computed.companyExpensesTotal || 0);
    });
    
    let pendingFromMills = 0;
    AppState.loads.forEach(load => {
        if (load.millPaymentStatus !== 'Complete') {
            pendingFromMills += (load.computed?.millReceivable || 0);
        }
    });
    
    let pendingToFarmers = 0;
    AppState.loads.forEach(load => {
        if (load.farmerPaymentStatus !== 'Complete') {
            pendingToFarmers += (load.computed?.farmerPayable || 0);
        }
    });
    
    document.getElementById('content').innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-label">Today's Loads</div>
                <div class="stat-value">${todayLoads}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Month Profit</div>
                <div class="stat-value">${CalcEngine.formatCurrency(monthProfit)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pending from Mills</div>
                <div class="stat-value">${CalcEngine.formatCurrency(pendingFromMills)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pending to Farmers</div>
                <div class="stat-value">${CalcEngine.formatCurrency(pendingToFarmers)}</div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">Recent Loads</div>
            ${renderLoadsTable(AppState.loads.slice(-5).reverse())}
        </div>
    `;
}

function showLoads() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date().toISOString().slice(0, 8) + '01';

    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">
                Loads Management
                <button class="btn btn-primary" onclick="showNewLoadForm()" style="float: right;">+ New Load</button>
            </div>
            <div class="form-group" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <label>From Date</label>
                    <input type="date" id="loads-from-date" value="${firstDayOfMonth}">
                </div>
                <div>
                    <label>To Date</label>
                    <input type="date" id="loads-to-date" value="${today}">
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button class="btn btn-primary" onclick="filterLoads()">Filter</button>
                    <button class="btn" onclick="clearLoadsFilter()" style="margin-left: 0.5rem;">Clear</button>
                </div>
            </div>
            <div id="loads-table-container">
                ${renderLoadsTable([...AppState.loads].reverse())}
            </div>
        </div>
    `;
}

function filterLoads() {
    const fromDate = document.getElementById('loads-from-date').value;
    const toDate = document.getElementById('loads-to-date').value;
    const filteredLoads = AppState.loads.filter(l => l.date >= fromDate && l.date <= toDate);
    document.getElementById('loads-table-container').innerHTML = renderLoadsTable([...filteredLoads].reverse());
}

function clearLoadsFilter() {
    document.getElementById('loads-table-container').innerHTML = renderLoadsTable([...AppState.loads].reverse());
}

function renderLoadsTable(loads) {
    if (loads.length === 0) {
        return '<p>No loads yet. Click "New Load" to add one.</p>';
    }

    return `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Farmer</th>
                    <th>Mill</th>
                    <th>Mill POC</th>
                    <th>Case</th>
                    <th>Gross Kg</th>
                    <th>Net Kg</th>
                    <th>Farmer ₹</th>
                    <th>Mill ₹</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${loads.map(load => {
                    const farmer = AppState.farmers.find(f => f.id === load.farmerId);
                    const mill = AppState.mills.find(m => m.id === load.millId);
                    const computed = load.computed || {};

                    return `
                        <tr>
                            <td>${load.date}</td>
                            <td>${farmer?.name || 'Unknown'}</td>
                            <td>${mill?.name || 'Unknown'}</td>
                            <td>${mill?.pointOfContact || 'N/A'}</td>
                            <td>${load.case}</td>
                            <td>${CalcEngine.formatNumber(load.grossKg)}</td>
                            <td>${CalcEngine.formatNumber(computed.netKg)}</td>
                            <td>${CalcEngine.formatCurrency(computed.farmerPayable)}</td>
                            <td>${CalcEngine.formatCurrency(computed.millReceivable)}</td>
                            <td><span class="badge badge-info">${load.status}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}
async function showNewLoadForm() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    
    const today = new Date().toISOString().split('T')[0];
    
    modalBody.innerHTML = `
        <h2>New Load</h2>
        <form id="load-form" onsubmit="saveLoad(event)">
            <div class="form-group">
                <label>Date</label>
                <input type="date" name="date" value="${today}" required>
            </div>
            
            <div class="form-group">
                <label>Farmer</label>
                <select name="farmerId" required>
                    <option value="">Select Farmer</option>
                    ${AppState.farmers.map(f => `<option value="${f.id}">${f.name} - ${f.village}</option>`).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>Mill</label>
                <select name="millId" required onchange="updateCommissionPolicy(this.value); updateMillPOC(this.value)">
                    <option value="">Select Mill</option>
                    ${AppState.mills.map(m => `<option value="${m.id}">${m.name} - ${m.village}</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Mill Point of Contact</label>
                <input type="text" id="mill-poc-display" readonly style="background-color: #f0f0f0;">
            </div>
            
            <div class="form-group">
                <label>Vehicle</label>
                <select name="vehicleId" required>
                    <option value="">Select Vehicle</option>
                    ${AppState.vehicles.map(v => `<option value="${v.id}">${v.number}</option>`).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>Movement</label>
                <select name="movement" required>
                    <option value="LOADING">Loading</option>
                    <option value="DELIVERY">Delivery</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Gross Weight (Kg)</label>
                <input type="number" name="grossKg" required min="0" oninput="recalculateLoad()">
            </div>
            
            <div class="form-group">
                <label>Declared Bags</label>
                <input type="number" name="declaredBags" required min="0" oninput="recalculateLoad()">
            </div>
            
            <div class="form-group">
                <label>Case Type</label>
                <select name="case" required onchange="recalculateLoad()">
                    <option value="CASE1">Case 1 (Per Bag Deduction)</option>
                    <option value="CASE2">Case 2 (Per Ton Deduction)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Buy Rate (₹ per bag)</label>
                <input type="number" name="buyRatePerBag" required min="0" oninput="recalculateLoad()">
            </div>
            
            <div class="form-group">
                <label>Sell Rate (₹ per bag)</label>
                <input type="number" name="sellRatePerBag" required min="0" oninput="recalculateLoad()">
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" name="useDeclaredForCommission" onchange="recalculateLoad()">
                    Use declared bags for commission calculation
                </label>
            </div>
            
            <div class="form-group">
                <label>Commission Policy</label>
                <select name="policy" id="policy-select" required onchange="toggleSplitPct(); recalculateLoad();">
                    <option value="FARMER">Farmer Pays</option>
                    <option value="MILL">Mill Pays</option>
                    <option value="SPLIT">Split</option>
                    <option value="NONE">None</option>
                </select>
            </div>
            
            <div class="form-group" id="split-pct-group" style="display: none;">
                <label>Farmer Split % (rest to mill)</label>
                <input type="number" name="splitPct" value="50" min="0" max="100" oninput="recalculateLoad()">
            </div>
            
            <h3>Expenses</h3>
            
            <div class="expense-routing">
                <label>Labour (₹)</label>
                <input type="number" name="labour" value="0" min="0" oninput="recalculateLoad()">
                <label>Paid by:</label>
                <select name="labourRoute" onchange="recalculateLoad()">
                    <option value="FARMER">Farmer</option>
                    <option value="MILL" selected>Mill</option>
                    <option value="COMPANY">Company</option>
                </select>
            </div>
            
            <div class="expense-routing">
                <label>Companion (₹, auto-calculated)</label>
                <input type="number" name="companion" id="companion-input" min="0" oninput="recalculateLoad()">
                <label>Paid by:</label>
                <select name="companionRoute" onchange="recalculateLoad()">
                    <option value="FARMER" selected>Farmer</option>
                    <option value="MILL">Mill</option>
                    <option value="COMPANY">Company</option>
                </select>
            </div>
            
            <div class="expense-routing">
                <label>Weight Fee (₹)</label>
                <input type="number" name="weightFee" value="0" min="0" oninput="recalculateLoad()">
                <label>Paid by:</label>
                <select name="weightFeeRoute" onchange="recalculateLoad()">
                    <option value="FARMER">Farmer</option>
                    <option value="MILL" selected>Mill</option>
                    <option value="COMPANY">Company</option>
                </select>
            </div>
            
            <div class="expense-routing">
                <label>Vehicle Rent (₹)</label>
                <input type="number" name="vehicleRent" value="0" min="0" oninput="recalculateLoad()">
                <label>Paid by:</label>
                <select name="vehicleRentRoute" onchange="recalculateLoad()">
                    <option value="FARMER">Farmer</option>
                    <option value="MILL" selected>Mill</option>
                    <option value="COMPANY">Company</option>
                </select>
            </div>
            
            <div id="calc-preview" class="calc-panel"></div>
            
            <button type="submit" class="btn btn-primary">Save Load</button>
        </form>
    `;
    
    modal.classList.add('active');
    setTimeout(() => recalculateLoad(), 100);
}

function updateCommissionPolicy(millId) {
    if (!millId) return;

    const mill = AppState.mills.find(m => m.id == millId);
    if (mill && mill.commissionDefault) {
        const policySelect = document.querySelector('[name="policy"]');
        const splitPctInput = document.querySelector('[name="splitPct"]');

        policySelect.value = mill.commissionDefault;
        if (mill.commissionSplitPercent) {
            splitPctInput.value = mill.commissionSplitPercent;
        }

        toggleSplitPct();
        recalculateLoad();
    }
}

function updateMillPOC(millId) {
    if (!millId) {
        document.getElementById('mill-poc-display').value = '';
        return;
    }

    const mill = AppState.mills.find(m => m.id == millId);
    if (mill) {
        document.getElementById('mill-poc-display').value = mill.pointOfContact || 'N/A';
    }
}

function toggleSplitPct() {
    const policy = document.querySelector('[name="policy"]')?.value;
    const splitGroup = document.getElementById('split-pct-group');
    if (splitGroup) {
        splitGroup.style.display = policy === 'SPLIT' ? 'block' : 'none';
    }
}

function recalculateLoad() {
    const form = document.getElementById('load-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const loadDraft = {
        grossKg: parseFloat(formData.get('grossKg')) || 0,
        declaredBags: parseInt(formData.get('declaredBags')) || 0,
        case: formData.get('case') || 'CASE1',
        buyRatePerBag: parseFloat(formData.get('buyRatePerBag')) || 0,
        sellRatePerBag: parseFloat(formData.get('sellRatePerBag')) || 0,
        useDeclaredForCommission: formData.get('useDeclaredForCommission') === 'on',
        policy: formData.get('policy') || 'FARMER',
        splitPct: parseInt(formData.get('splitPct')) || 50,
        date: formData.get('date'),
        farmerId: parseInt(formData.get('farmerId')),
        expenses: {
            labour: parseFloat(formData.get('labour')) || 0,
            companion: parseFloat(formData.get('companion')) || 0,
            weightFee: parseFloat(formData.get('weightFee')) || 0,
            vehicleRent: parseFloat(formData.get('vehicleRent')) || 0,
            route: {
                labour: formData.get('labourRoute') || 'MILL',
                companion: formData.get('companionRoute') || 'FARMER',
                weightFee: formData.get('weightFeeRoute') || 'MILL',
                vehicleRent: formData.get('vehicleRentRoute') || 'MILL'
            }
        }
    };
    
    const farmerAdvances = AppState.advances.filter(a => a.farmerId === loadDraft.farmerId);
    const computed = CalcEngine.computeSettlement(AppState.settings, loadDraft, farmerAdvances);
    
    const companionInput = document.getElementById('companion-input');
    if (companionInput && !companionInput.value) {
        companionInput.value = computed.expenseItems.companion;
    }
    
    const previewEl = document.getElementById('calc-preview');
    if (previewEl) {
        previewEl.innerHTML = `
            <h3>Live Calculation</h3>
            <div class="calc-row"><span>Deduction:</span><span>${computed.deductionKg} kg</span></div>
            <div class="calc-row"><span>Net Weight:</span><span>${computed.netKg} kg</span></div>
            <div class="calc-row"><span>Amount Bags:</span><span>${computed.amountBags}</span></div>
            <div class="calc-row"><span>Commission Bags:</span><span>${computed.commissionBags}</span></div>
            <div class="calc-row"><span>Commission:</span><span>${CalcEngine.formatCurrency(computed.commissionAmount)}</span></div>
            <div class="calc-row"><span>Farmer Expenses:</span><span>${CalcEngine.formatCurrency(computed.farmerExpensesTotal)}</span></div>
            <div class="calc-row"><span>Mill Expenses:</span><span>${CalcEngine.formatCurrency(computed.millExpensesTotal)}</span></div>
            <div class="calc-row"><span>Company Expenses:</span><span>${CalcEngine.formatCurrency(computed.companyExpensesTotal)}</span></div>
            <div class="calc-row"><span>Finance Charges:</span><span>${CalcEngine.formatCurrency(computed.financeChargesPerLoad)}</span></div>
            <div class="calc-row"><strong>Farmer Payable:</strong><strong>${CalcEngine.formatCurrency(computed.farmerPayable)}</strong></div>
            <div class="calc-row"><strong>Mill Receivable:</strong><strong>${CalcEngine.formatCurrency(computed.millReceivable)}</strong></div>
        `;
    }
}

async function saveLoad(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const load = {
        date: formData.get('date'),
        farmerId: parseInt(formData.get('farmerId')),
        millId: parseInt(formData.get('millId')),
        vehicleId: parseInt(formData.get('vehicleId')),
        movement: formData.get('movement'),
        grossKg: parseFloat(formData.get('grossKg')),
        declaredBags: parseInt(formData.get('declaredBags')),
        case: formData.get('case'),
        buyRatePerBag: parseFloat(formData.get('buyRatePerBag')),
        sellRatePerBag: parseFloat(formData.get('sellRatePerBag')),
        useDeclaredForCommission: formData.get('useDeclaredForCommission') === 'on',
        policy: formData.get('policy'),
        splitPct: parseInt(formData.get('splitPct')) || 50,
        expenses: {
            labour: parseFloat(formData.get('labour')) || 0,
            companion: parseFloat(formData.get('companion')) || 0,
            weightFee: parseFloat(formData.get('weightFee')) || 0,
            vehicleRent: parseFloat(formData.get('vehicleRent')) || 0,
            route: {
                labour: formData.get('labourRoute'),
                companion: formData.get('companionRoute'),
                weightFee: formData.get('weightFeeRoute'),
                vehicleRent: formData.get('vehicleRentRoute')
            }
        },
        status: 'Registered',
        farmerPaymentStatus: 'Pending',
        millPaymentStatus: 'Pending'
    };
    
    const farmerAdvances = AppState.advances.filter(a => a.farmerId === load.farmerId);
    load.computed = CalcEngine.computeSettlement(AppState.settings, load, farmerAdvances);
    
    await DB.add('loads', load);
    await loadAllData();
    
    closeModal();
    showLoads();
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function showFarmers() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date().toISOString().slice(0, 8) + '01';

    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">Farmers</div>
            <div class="form-group" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <label>From Date</label>
                    <input type="date" id="farmers-from-date" value="${firstDayOfMonth}">
                </div>
                <div>
                    <label>To Date</label>
                    <input type="date" id="farmers-to-date" value="${today}">
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button class="btn btn-primary" onclick="filterFarmers()">Filter</button>
                    <button class="btn" onclick="clearFarmersFilter()" style="margin-left: 0.5rem;">Clear</button>
                </div>
            </div>
            <div id="farmers-table-container">
                ${renderFarmersTable(AppState.farmers, AppState.loads)}
            </div>
        </div>
    `;
}

function renderFarmersTable(farmers, loads) {
    return `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Village</th>
                    <th>Phone</th>
                    <th>Total Loads</th>
                    <th>Outstanding</th>
                </tr>
            </thead>
            <tbody>
                ${farmers.map(farmer => {
                    const farmerLoads = loads.filter(l => l.farmerId === farmer.id && l.farmerPaymentStatus !== 'Complete');
                    const allFarmerLoads = loads.filter(l => l.farmerId === farmer.id);
                    const outstanding = farmerLoads.reduce((sum, load) => sum + (load.computed?.farmerPayable || 0), 0);

                    return `
                        <tr>
                            <td>${farmer.name}</td>
                            <td>${farmer.village}</td>
                            <td>${farmer.phone}</td>
                            <td>${allFarmerLoads.length}</td>
                            <td>${CalcEngine.formatCurrency(outstanding)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function filterFarmers() {
    const fromDate = document.getElementById('farmers-from-date').value;
    const toDate = document.getElementById('farmers-to-date').value;
    const filteredLoads = AppState.loads.filter(l => l.date >= fromDate && l.date <= toDate);
    document.getElementById('farmers-table-container').innerHTML = renderFarmersTable(AppState.farmers, filteredLoads);
}

function clearFarmersFilter() {
    document.getElementById('farmers-table-container').innerHTML = renderFarmersTable(AppState.farmers, AppState.loads);
}

function showMills() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date().toISOString().slice(0, 8) + '01';

    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">Mills</div>
            <div class="form-group" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <label>From Date</label>
                    <input type="date" id="mills-from-date" value="${firstDayOfMonth}">
                </div>
                <div>
                    <label>To Date</label>
                    <input type="date" id="mills-to-date" value="${today}">
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button class="btn btn-primary" onclick="filterMills()">Filter</button>
                    <button class="btn" onclick="clearMillsFilter()" style="margin-left: 0.5rem;">Clear</button>
                </div>
            </div>
            <div id="mills-table-container">
                ${renderMillsTable(AppState.mills, AppState.loads)}
            </div>
        </div>
    `;
}

function renderMillsTable(mills, loads) {
    return `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Village</th>
                    <th>Phone</th>
                    <th>Point of Contact</th>
                    <th>Total Loads</th>
                    <th>Outstanding</th>
                </tr>
            </thead>
            <tbody>
                ${mills.map(mill => {
                    const millLoads = loads.filter(l => l.millId === mill.id && l.millPaymentStatus !== 'Complete');
                    const allMillLoads = loads.filter(l => l.millId === mill.id);
                    const outstanding = millLoads.reduce((sum, load) => sum + (load.computed?.millReceivable || 0), 0);

                    return `
                        <tr>
                            <td>${mill.name}</td>
                            <td>${mill.village}</td>
                            <td>${mill.phone}</td>
                            <td>${mill.pointOfContact || 'N/A'}</td>
                            <td>${allMillLoads.length}</td>
                            <td>${CalcEngine.formatCurrency(outstanding)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function filterMills() {
    const fromDate = document.getElementById('mills-from-date').value;
    const toDate = document.getElementById('mills-to-date').value;
    const filteredLoads = AppState.loads.filter(l => l.date >= fromDate && l.date <= toDate);
    document.getElementById('mills-table-container').innerHTML = renderMillsTable(AppState.mills, filteredLoads);
}

function clearMillsFilter() {
    document.getElementById('mills-table-container').innerHTML = renderMillsTable(AppState.mills, AppState.loads);
}

function showAdvances() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date().toISOString().slice(0, 8) + '01';

    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">
                Advances
                <button class="btn btn-primary" onclick="showNewAdvanceForm()" style="float: right;">+ New Advance</button>
            </div>
            <div class="form-group" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <label>From Date</label>
                    <input type="date" id="advances-from-date" value="${firstDayOfMonth}">
                </div>
                <div>
                    <label>To Date</label>
                    <input type="date" id="advances-to-date" value="${today}">
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button class="btn btn-primary" onclick="filterAdvances()">Filter</button>
                    <button class="btn" onclick="clearAdvancesFilter()" style="margin-left: 0.5rem;">Clear</button>
                </div>
            </div>
            <div id="advances-table-container">
                ${renderAdvancesTable(AppState.advances)}
            </div>
        </div>
    `;
}

function renderAdvancesTable(advances) {
    return `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Farmer</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${advances.map(advance => {
                    const farmer = AppState.farmers.find(f => f.id === advance.farmerId);
                    return `
                        <tr>
                            <td>${advance.date}</td>
                            <td>${farmer?.name || 'Unknown'}</td>
                            <td>${CalcEngine.formatCurrency(advance.amount)}</td>
                            <td><span class="badge badge-warning">Active</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function filterAdvances() {
    const fromDate = document.getElementById('advances-from-date').value;
    const toDate = document.getElementById('advances-to-date').value;
    const filteredAdvances = AppState.advances.filter(a => a.date >= fromDate && a.date <= toDate);
    document.getElementById('advances-table-container').innerHTML = renderAdvancesTable(filteredAdvances);
}

function clearAdvancesFilter() {
    document.getElementById('advances-table-container').innerHTML = renderAdvancesTable(AppState.advances);
}

async function showNewAdvanceForm() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const today = new Date().toISOString().split('T')[0];
    
    modalBody.innerHTML = `
        <h2>New Advance</h2>
        <form onsubmit="saveAdvance(event)">
            <div class="form-group">
                <label>Date</label>
                <input type="date" name="date" value="${today}" required>
            </div>
            <div class="form-group">
                <label>Farmer</label>
                <select name="farmerId" required>
                    <option value="">Select Farmer</option>
                    ${AppState.farmers.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Amount (₹)</label>
                <input type="number" name="amount" required min="0">
            </div>
            <button type="submit" class="btn btn-primary">Save Advance</button>
        </form>
    `;
    
    modal.classList.add('active');
}

async function saveAdvance(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    await DB.add('advances', {
        date: formData.get('date'),
        farmerId: parseInt(formData.get('farmerId')),
        amount: parseFloat(formData.get('amount'))
    });
    
    await loadAllData();
    closeModal();
    showAdvances();
}

function showReceipts() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date().toISOString().slice(0, 8) + '01';

    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">Mill Payments</div>
            <div class="form-group" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <label>From Date</label>
                    <input type="date" id="receipts-from-date" value="${firstDayOfMonth}">
                </div>
                <div>
                    <label>To Date</label>
                    <input type="date" id="receipts-to-date" value="${today}">
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button class="btn btn-primary" onclick="filterReceipts()">Filter</button>
                    <button class="btn" onclick="clearReceiptsFilter()" style="margin-left: 0.5rem;">Clear</button>
                </div>
            </div>
            <div id="receipts-table-container">
                ${renderReceiptsTable(AppState.loads)}
            </div>
        </div>
    `;
}

function renderReceiptsTable(loads) {
    const pendingLoads = loads.filter(l => l.millPaymentStatus !== 'Complete');
    const completedLoads = loads.filter(l => l.millPaymentStatus === 'Complete');

    const totalPending = pendingLoads.reduce((sum, load) => sum + (load.computed?.millReceivable || 0), 0);
    const totalCompleted = completedLoads.reduce((sum, load) => sum + (load.computed?.millReceivable || 0), 0);

    return `
        <div style="margin-bottom: 1.5rem;">
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-label">Pending Payments</div>
                    <div class="stat-value">${CalcEngine.formatCurrency(totalPending)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Completed Payments</div>
                    <div class="stat-value">${CalcEngine.formatCurrency(totalCompleted)}</div>
                </div>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Mill</th>
                    <th>Point of Contact</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${loads.map(load => {
                    const mill = AppState.mills.find(m => m.id === load.millId);
                    return `
                        <tr>
                            <td>${load.date}</td>
                            <td>${mill?.name || 'Unknown'}</td>
                            <td>${mill?.pointOfContact || 'N/A'}</td>
                            <td>${CalcEngine.formatCurrency(load.computed?.millReceivable || 0)}</td>
                            <td><span class="badge badge-${load.millPaymentStatus === 'Complete' ? 'success' : 'warning'}">${load.millPaymentStatus}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function filterReceipts() {
    const fromDate = document.getElementById('receipts-from-date').value;
    const toDate = document.getElementById('receipts-to-date').value;
    const filteredLoads = AppState.loads.filter(l => l.date >= fromDate && l.date <= toDate);
    document.getElementById('receipts-table-container').innerHTML = renderReceiptsTable(filteredLoads);
}

function clearReceiptsFilter() {
    document.getElementById('receipts-table-container').innerHTML = renderReceiptsTable(AppState.loads);
}

function showPayouts() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date().toISOString().slice(0, 8) + '01';

    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">Farmer Payouts</div>
            <div class="form-group" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <label>From Date</label>
                    <input type="date" id="payouts-from-date" value="${firstDayOfMonth}">
                </div>
                <div>
                    <label>To Date</label>
                    <input type="date" id="payouts-to-date" value="${today}">
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button class="btn btn-primary" onclick="filterPayouts()">Filter</button>
                    <button class="btn" onclick="clearPayoutsFilter()" style="margin-left: 0.5rem;">Clear</button>
                </div>
            </div>
            <div id="payouts-table-container">
                ${renderPayoutsTable(AppState.loads)}
            </div>
        </div>
    `;
}

function renderPayoutsTable(loads) {
    const pendingLoads = loads.filter(l => l.farmerPaymentStatus !== 'Complete');
    const completedLoads = loads.filter(l => l.farmerPaymentStatus === 'Complete');

    const totalPending = pendingLoads.reduce((sum, load) => sum + (load.computed?.farmerPayable || 0), 0);
    const totalCompleted = completedLoads.reduce((sum, load) => sum + (load.computed?.farmerPayable || 0), 0);

    return `
        <div style="margin-bottom: 1.5rem;">
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-label">Pending Payouts</div>
                    <div class="stat-value">${CalcEngine.formatCurrency(totalPending)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Completed Payouts</div>
                    <div class="stat-value">${CalcEngine.formatCurrency(totalCompleted)}</div>
                </div>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Farmer</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${loads.map(load => {
                    const farmer = AppState.farmers.find(f => f.id === load.farmerId);
                    return `
                        <tr>
                            <td>${load.date}</td>
                            <td>${farmer?.name || 'Unknown'}</td>
                            <td>${CalcEngine.formatCurrency(load.computed?.farmerPayable || 0)}</td>
                            <td><span class="badge badge-${load.farmerPaymentStatus === 'Complete' ? 'success' : 'warning'}">${load.farmerPaymentStatus}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function filterPayouts() {
    const fromDate = document.getElementById('payouts-from-date').value;
    const toDate = document.getElementById('payouts-to-date').value;
    const filteredLoads = AppState.loads.filter(l => l.date >= fromDate && l.date <= toDate);
    document.getElementById('payouts-table-container').innerHTML = renderPayoutsTable(filteredLoads);
}

function clearPayoutsFilter() {
    document.getElementById('payouts-table-container').innerHTML = renderPayoutsTable(AppState.loads);
}

function showReports() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date().toISOString().slice(0, 8) + '01';

    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">Reports</div>
            <div class="form-group" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <label>From Date</label>
                    <input type="date" id="report-from-date" value="${firstDayOfMonth}">
                </div>
                <div>
                    <label>To Date</label>
                    <input type="date" id="report-to-date" value="${today}">
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button class="btn btn-primary" onclick="filterReports()">Generate Report</button>
                </div>
            </div>
            <div id="report-results"></div>
        </div>
    `;

    filterReports();
}

function filterReports() {
    const fromDate = document.getElementById('report-from-date').value;
    const toDate = document.getElementById('report-to-date').value;

    const filteredLoads = AppState.loads.filter(l => l.date >= fromDate && l.date <= toDate);

    let totalCommission = 0;
    let totalFinanceCharges = 0;
    let totalCompanyExpenses = 0;
    let totalMillReceivable = 0;
    let totalFarmerPayable = 0;
    let totalGrossKg = 0;
    let totalNetKg = 0;

    filteredLoads.forEach(load => {
        const computed = load.computed || {};
        totalCommission += computed.commissionAmount || 0;
        totalFinanceCharges += computed.financeChargesPerLoad || 0;
        totalCompanyExpenses += computed.companyExpensesTotal || 0;
        totalMillReceivable += computed.millReceivable || 0;
        totalFarmerPayable += computed.farmerPayable || 0;
        totalGrossKg += load.grossKg || 0;
        totalNetKg += computed.netKg || 0;
    });

    const profit = totalCommission + totalFinanceCharges - totalCompanyExpenses;

    // Calculate pending amounts
    let pendingFromMills = 0;
    let completedFromMills = 0;
    let pendingToFarmers = 0;
    let completedToFarmers = 0;

    filteredLoads.forEach(load => {
        const computed = load.computed || {};
        if (load.millPaymentStatus !== 'Complete') {
            pendingFromMills += computed.millReceivable || 0;
        } else {
            completedFromMills += computed.millReceivable || 0;
        }
        if (load.farmerPaymentStatus !== 'Complete') {
            pendingToFarmers += computed.farmerPayable || 0;
        } else {
            completedToFarmers += computed.farmerPayable || 0;
        }
    });

    document.getElementById('report-results').innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-label">Total Loads</div>
                <div class="stat-value">${filteredLoads.length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Gross Weight</div>
                <div class="stat-value">${CalcEngine.formatNumber(totalGrossKg)} kg</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Net Weight</div>
                <div class="stat-value">${CalcEngine.formatNumber(totalNetKg)} kg</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Commission Income</div>
                <div class="stat-value">${CalcEngine.formatCurrency(totalCommission)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Finance Charges</div>
                <div class="stat-value">${CalcEngine.formatCurrency(totalFinanceCharges)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Company Expenses</div>
                <div class="stat-value">${CalcEngine.formatCurrency(totalCompanyExpenses)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Net Profit</div>
                <div class="stat-value">${CalcEngine.formatCurrency(profit)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Mill Receivable</div>
                <div class="stat-value">${CalcEngine.formatCurrency(totalMillReceivable)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pending from Mills</div>
                <div class="stat-value">${CalcEngine.formatCurrency(pendingFromMills)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Received from Mills</div>
                <div class="stat-value">${CalcEngine.formatCurrency(completedFromMills)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Farmer Payable</div>
                <div class="stat-value">${CalcEngine.formatCurrency(totalFarmerPayable)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pending to Farmers</div>
                <div class="stat-value">${CalcEngine.formatCurrency(pendingToFarmers)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Paid to Farmers</div>
                <div class="stat-value">${CalcEngine.formatCurrency(completedToFarmers)}</div>
            </div>
        </div>

        <div style="margin-top: 2rem;">
            <h3>Load Details</h3>
            ${renderLoadsTable(filteredLoads.reverse())}
        </div>
    `;
}

async function showSettings() {
    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">Global Settings</div>
            <form onsubmit="saveSettings(event)">
                <div class="form-group">
                    <label>Bag Weight (Kg)</label>
                    <input type="number" name="bagKg" value="${AppState.settings.bagKg}" required>
                </div>
                <div class="form-group">
                    <label>Case 1: Deduction per Bag (Kg)</label>
                    <input type="number" name="case1DeductPerBagKg" value="${AppState.settings.case1DeductPerBagKg}" required step="0.1">
                </div>
                <div class="form-group">
                    <label>Case 2: Deduction per Ton (Kg)</label>
                    <input type="number" name="case2DeductPerTonKg" value="${AppState.settings.case2DeductPerTonKg}" required step="0.1">
                </div>
                <div class="form-group">
                    <label>Commission per Bag (₹)</label>
                    <input type="number" name="commissionPerBag" value="${AppState.settings.commissionPerBag}" required>
                </div>
                <div class="form-group">
                    <label>Companion per Bag (₹)</label>
                    <input type="number" name="companionPerBag" value="${AppState.settings.companionPerBag}" required>
                </div>
                <div class="form-group">
                    <label>Payout Rounding (₹)</label>
                    <select name="payoutRounding" required>
                        <option value="1" ${AppState.settings.payoutRounding === 1 ? 'selected' : ''}>₹1</option>
                        <option value="10" ${AppState.settings.payoutRounding === 10 ? 'selected' : ''}>₹10</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Default Commission Policy</label>
                    <select name="defaultCommissionPolicy" required>
                        <option value="FARMER" ${AppState.settings.defaultCommissionPolicy === 'FARMER' ? 'selected' : ''}>Farmer Pays</option>
                        <option value="MILL" ${AppState.settings.defaultCommissionPolicy === 'MILL' ? 'selected' : ''}>Mill Pays</option>
                        <option value="SPLIT" ${AppState.settings.defaultCommissionPolicy === 'SPLIT' ? 'selected' : ''}>Split</option>
                        <option value="NONE" ${AppState.settings.defaultCommissionPolicy === 'NONE' ? 'selected' : ''}>None</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Default Split Percent (Farmer %)</label>
                    <input type="number" name="defaultCommissionSplitPercent" value="${AppState.settings.defaultCommissionSplitPercent}" min="0" max="100" required>
                </div>
                <button type="submit" class="btn btn-success">Save Settings</button>
            </form>
        </div>
    `;
}

async function saveSettings(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const settings = {
        id: 'default',
        bagKg: parseFloat(formData.get('bagKg')),
        case1DeductPerBagKg: parseFloat(formData.get('case1DeductPerBagKg')),
        case2DeductPerTonKg: parseFloat(formData.get('case2DeductPerTonKg')),
        commissionPerBag: parseFloat(formData.get('commissionPerBag')),
        companionPerBag: parseFloat(formData.get('companionPerBag')),
        payoutRounding: parseInt(formData.get('payoutRounding')),
        defaultCommissionPolicy: formData.get('defaultCommissionPolicy'),
        defaultCommissionSplitPercent: parseInt(formData.get('defaultCommissionSplitPercent'))
    };
    
    await DB.put('settings', settings);
    await loadSettings();
    alert('Settings saved successfully!');
}

function showBackup() {
    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">Backup & Restore</div>
            
            <div style="margin-bottom: 2rem;">
                <h3>Export Data</h3>
                <p>Download all your data as a JSON file. Keep this file safe!</p>
                <button class="btn btn-primary" onclick="exportData()">📥 Export All Data</button>
            </div>
            
            <div>
                <h3>Import Data</h3>
                <p>Restore data from a previously exported JSON file.</p>
                <input type="file" id="import-file" accept=".json">
                <button class="btn btn-success" onclick="importData()">📤 Import Data</button>
            </div>
        </div>
    `;
}

async function exportData() {
    const allData = {
        farmers: AppState.farmers,
        mills: AppState.mills,
        vehicles: AppState.vehicles,
        loads: AppState.loads,
        advances: AppState.advances,
        receipts: AppState.receipts,
        payouts: AppState.payouts,
        settings: AppState.settings,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `rice-trade-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    alert('Data exported successfully!');
}

async function importData() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file first!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);

            for (const storeName of ['farmers', 'mills', 'vehicles', 'loads', 'advances', 'receipts', 'payouts', 'settings']) {
                if (data[storeName]) {
                    const items = Array.isArray(data[storeName]) ? data[storeName] : [data[storeName]];
                    for (const item of items) {
                        await DB.put(storeName, item);
                    }
                }
            }
            
            await loadAllData();
            await loadSettings();
            
            alert('Data imported successfully! Refreshing...');
            location.reload();
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

init();