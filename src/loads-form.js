// Improved Loads Form with better calculation preview
const LoadsForm = {
    showNewForm() {
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
                <!-- Basic Info -->
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" name="date" value="${today}" required max="${today}">
                </div>

                <div class="form-group">
                    <label>Transaction Type *</label>
                    <select name="transaction_type" required onchange="LoadsForm.updateFormLabels()">
                        <option value="FARMER_LOADING">Farmer Loading (2kg/bag deduction)</option>
                        <option value="DIRECT_DELIVERY">Direct Delivery (5kg/ton deduction)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Farmer *</label>
                    <select name="farmer_id" required onchange="LoadsForm.updateFarmerDefaults()">
                        <option value="">Select Farmer</option>
                        ${farmers.map(f => `<option value="${f.id}" data-rate="${f.default_rate || ''}">${f.name} - ${f.village}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Mill *</label>
                    <select name="mill_id" required onchange="LoadsForm.updateMillDefaults()">
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

                <!-- Weight Measurements -->
                <h3 class="full-width" style="margin-top: 1rem; color: var(--primary);">⚖️ Weight Measurements</h3>

                <div class="form-group">
                    <label>Empty Vehicle Weight (Kg)</label>
                    <input type="number" name="empty_vehicle_kg" min="0" step="0.01" oninput="LoadsForm.calculateGrossWeight()">
                </div>

                <div class="form-group">
                    <label>Loaded Vehicle Weight (Kg)</label>
                    <input type="number" name="loaded_vehicle_kg" min="0" step="0.01" oninput="LoadsForm.calculateGrossWeight()">
                </div>

                <div class="form-group">
                    <label>Gross Weight (Kg) * <small>(auto-calculated or manual)</small></label>
                    <input type="number" name="gross_kg" id="gross_kg" required min="0" step="0.01" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label id="tare-label">Tare Weight (Kg)</label>
                    <input type="number" name="tare_kg" value="0" min="0" step="0.01" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>Declared Bags * <small>(editable)</small></label>
                    <input type="number" name="declared_bags" id="declared_bags" required min="1" oninput="LoadsForm.recalculate()">
                </div>

                <!-- Rates -->
                <h3 class="full-width" style="margin-top: 1rem; color: var(--primary);">💰 Rates</h3>

                <div class="form-group">
                    <label>Buy Rate (₹/bag) *</label>
                    <input type="number" name="buy_rate_per_bag" required min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>Sell Rate (₹/bag) *</label>
                    <input type="number" name="sell_rate_per_bag" required min="0" oninput="LoadsForm.recalculate()">
                </div>

                <!-- Commission -->
                <h3 class="full-width" style="margin-top: 1rem; color: var(--primary);">📋 Commission</h3>

                <div class="form-group">
                    <label>Commission Policy *</label>
                    <select name="commission_policy" required onchange="LoadsForm.toggleSplitPercent(); LoadsForm.recalculate();">
                        <option value="FARMER">Farmer Pays</option>
                        <option value="MILL">Mill Pays</option>
                        <option value="SPLIT">Split</option>
                        <option value="NONE">None</option>
                    </select>
                </div>

                <div class="form-group" id="split-percent-group" style="display: none;">
                    <label>Farmer Split %</label>
                    <input type="number" name="commission_split_percent" value="50" min="0" max="100" oninput="LoadsForm.recalculate()">
                </div>

                <!-- Expenses -->
                <h3 class="full-width" style="margin-top: 1rem; color: var(--primary);">💸 Expenses</h3>

                <div class="form-group">
                    <label>Labour (₹)</label>
                    <input type="number" name="labour" value="0" min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>Labour Paid By</label>
                    <select name="labour_payer" onchange="LoadsForm.recalculate()">
                        <option value="MILL">Mill</option>
                        <option value="FARMER">Farmer</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Companion (₹, auto-calc)</label>
                    <input type="number" name="companion" id="companion-input" min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>Companion Paid By</label>
                    <select name="companion_payer" onchange="LoadsForm.recalculate()">
                        <option value="FARMER">Farmer</option>
                        <option value="MILL">Mill</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Weight Fee (₹)</label>
                    <input type="number" name="weight_fee" value="0" min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>Weight Fee Paid By</label>
                    <select name="weight_fee_payer" onchange="LoadsForm.recalculate()">
                        <option value="MILL">Mill</option>
                        <option value="FARMER">Farmer</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Vehicle Rent (₹)</label>
                    <input type="number" name="vehicle_rent" value="0" min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>Vehicle Rent Paid By</label>
                    <select name="vehicle_rent_payer" onchange="LoadsForm.recalculate()">
                        <option value="MILL">Mill</option>
                        <option value="FARMER">Farmer</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Freight Advance (₹)</label>
                    <input type="number" name="freight_advance" value="0" min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>Freight Advance Paid By</label>
                    <select name="freight_advance_payer" onchange="LoadsForm.recalculate()">
                        <option value="MILL">Mill</option>
                        <option value="FARMER">Farmer</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Gumastha Rusul (₹)</label>
                    <input type="number" name="gumastha_rusul" value="0" min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>Gumastha Rusul Paid By</label>
                    <select name="gumastha_rusul_payer" onchange="LoadsForm.recalculate()">
                        <option value="FARMER">Farmer</option>
                        <option value="MILL">Mill</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Cash Driver (₹)</label>
                    <input type="number" name="cash_driver" value="0" min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>Cash Driver Paid By</label>
                    <select name="cash_driver_payer" onchange="LoadsForm.recalculate()">
                        <option value="FARMER">Farmer</option>
                        <option value="MILL">Mill</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>HAMALI (₹)</label>
                    <input type="number" name="hamali" value="0" min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group">
                    <label>HAMALI Paid By</label>
                    <select name="hamali_payer" onchange="LoadsForm.recalculate()">
                        <option value="FARMER">Farmer</option>
                        <option value="MILL">Mill</option>
                        <option value="COMPANY">Company</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Other Expenses (₹)</label>
                    <input type="number" name="other_expenses" value="0" min="0" oninput="LoadsForm.recalculate()">
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>

                <!-- LIVE PREVIEW AT BOTTOM -->
                <div id="calc-preview" class="full-width" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 1.5rem; border-radius: 0.75rem; border: 2px solid #3b82f6; margin-top: 1rem;">
                    <h3 style="color: #1e40af; margin-bottom: 1rem;">📊 Live Calculation Preview</h3>
                    <div id="calc-details" style="color: #6b7280;">Fill in the form to see calculations...</div>
                </div>

                <div class="form-group full-width" style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="submit" class="btn btn-success">💾 Save Load</button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                </div>
            </form>
        `;

        App.openModal('Create New Load', form);

        document.getElementById('load-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await Loads.saveLoad(e.target);
        });

        setTimeout(() => this.recalculate(), 100);
    },

    calculateGrossWeight() {
        const form = document.getElementById('load-form');
        if (!form) return;

        const emptyWeight = parseFloat(form.empty_vehicle_kg.value) || 0;
        const loadedWeight = parseFloat(form.loaded_vehicle_kg.value) || 0;

        if (emptyWeight > 0 && loadedWeight > 0 && loadedWeight > emptyWeight) {
            const grossWeight = loadedWeight - emptyWeight;
            form.gross_kg.value = grossWeight.toFixed(2);

            // Auto-calculate declared bags based on standard bag weight
            const bagWeight = App.state.settings.bag_weight_kg || 75;
            const estimatedBags = Math.round(grossWeight / bagWeight);
            if (!form.declared_bags.value) {
                form.declared_bags.value = estimatedBags;
            }

            this.recalculate();
        }
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
        this.recalculate();
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
            const calc = CalcEngine.computeLoad(App.state.settings, loadData);

            // Auto-fill companion
            const companionInput = document.getElementById('companion-input');
            if (companionInput && !companionInput.value) {
                companionInput.value = calc.companion;
            }

            const rateMargin = (loadData.sell_rate_per_bag - loadData.buy_rate_per_bag) * calc.net_bags;
            const companyProfit = calc.commission_amount + rateMargin - calc.company_expenses;

            document.getElementById('calc-details').innerHTML = `
                <!-- Summary Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: white; padding: 1rem; border-radius: 0.75rem; border-left: 4px solid #3b82f6;">
                        <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 0.25rem;">LOAD NUMBER</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #1f2937;">${calc.load_number}</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 0.75rem; border-left: 4px solid #8b5cf6;">
                        <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 0.25rem;">NET WEIGHT</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #1f2937;">${calc.net_kg} kg</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 0.75rem; border-left: 4px solid #ec4899;">
                        <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 0.25rem;">NET BAGS</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #1f2937;">${calc.net_bags}</div>
                    </div>
                </div>

                <!-- Main Financial Breakdown -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">

                    <!-- MILL PAYABLE (Money IN) -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 1.25rem; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <span style="font-size: 1.5rem;">💰</span>
                            <div>
                                <div style="font-size: 0.7rem; color: #78350f; font-weight: 600; text-transform: uppercase;">To Collect from Mill</div>
                                <div style="font-size: 0.65rem; color: #92400e;">Money IN</div>
                            </div>
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: #78350f; margin-bottom: 0.5rem;">
                            ${CalcEngine.formatCurrency(calc.mill_receivable)}
                        </div>
                        <div style="background: rgba(255,255,255,0.6); padding: 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; color: #78350f;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Sale Amount:</span>
                                <span style="font-weight: 600;">+${CalcEngine.formatCurrency(calc.mill_gross_amount)}</span>
                            </div>
                            ${calc.mill_commission_share > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Commission:</span>
                                <span style="font-weight: 600;">-${CalcEngine.formatCurrency(calc.mill_commission_share)}</span>
                            </div>
                            ` : ''}
                            ${calc.mill_expenses > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Mill Expenses:</span>
                                <span style="font-weight: 600;">-${CalcEngine.formatCurrency(calc.mill_expenses)}</span>
                            </div>
                            ` : ''}
                            <div style="border-top: 1px solid #d97706; margin-top: 0.25rem; padding-top: 0.25rem; display: flex; justify-content: space-between;">
                                <span style="font-weight: 700;">Net Payable:</span>
                                <span style="font-weight: 700;">${CalcEngine.formatCurrency(calc.mill_receivable)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- FARMER PAYABLE (Money OUT) -->
                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 1.25rem; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <span style="font-size: 1.5rem;">👨‍🌾</span>
                            <div>
                                <div style="font-size: 0.7rem; color: #065f46; font-weight: 600; text-transform: uppercase;">To Pay Farmer</div>
                                <div style="font-size: 0.65rem; color: #047857;">Money OUT</div>
                            </div>
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: #065f46; margin-bottom: 0.5rem;">
                            ${CalcEngine.formatCurrency(calc.farmer_payable)}
                        </div>
                        <div style="background: rgba(255,255,255,0.6); padding: 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; color: #065f46;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Purchase Amount:</span>
                                <span style="font-weight: 600;">+${CalcEngine.formatCurrency(calc.farmer_gross_amount)}</span>
                            </div>
                            ${calc.farmer_commission_share > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Commission:</span>
                                <span style="font-weight: 600;">-${CalcEngine.formatCurrency(calc.farmer_commission_share)}</span>
                            </div>
                            ` : ''}
                            ${calc.farmer_expenses > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Farmer Expenses:</span>
                                <span style="font-weight: 600;">-${CalcEngine.formatCurrency(calc.farmer_expenses)}</span>
                            </div>
                            ` : ''}
                            <div style="border-top: 1px solid #059669; margin-top: 0.25rem; padding-top: 0.25rem; display: flex; justify-content: space-between;">
                                <span style="font-weight: 700;">Net Payable:</span>
                                <span style="font-weight: 700;">${CalcEngine.formatCurrency(calc.farmer_payable)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- COMPANY PROFIT -->
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 1.25rem; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <span style="font-size: 1.5rem;">🏢</span>
                            <div>
                                <div style="font-size: 0.7rem; color: #1e40af; font-weight: 600; text-transform: uppercase;">Company Profit</div>
                                <div style="font-size: 0.65rem; color: #1e3a8a;">Your Earning</div>
                            </div>
                        </div>
                        <div style="font-size: 2rem; font-weight: 800; color: ${companyProfit >= 0 ? '#1e40af' : '#dc2626'}; margin-bottom: 0.5rem;">
                            ${CalcEngine.formatCurrency(companyProfit)}
                        </div>
                        <div style="background: rgba(255,255,255,0.6); padding: 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; color: #1e40af;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Commission:</span>
                                <span style="font-weight: 600; color: #059669;">+${CalcEngine.formatCurrency(calc.commission_amount)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Rate Margin:</span>
                                <span style="font-weight: 600; color: ${rateMargin >= 0 ? '#059669' : '#dc2626'};">${rateMargin >= 0 ? '+' : ''}${CalcEngine.formatCurrency(rateMargin)}</span>
                            </div>
                            ${calc.company_expenses > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Company Expenses:</span>
                                <span style="font-weight: 600; color: #dc2626;">-${CalcEngine.formatCurrency(calc.company_expenses)}</span>
                            </div>
                            ` : ''}
                            <div style="border-top: 1px solid #3b82f6; margin-top: 0.25rem; padding-top: 0.25rem; display: flex; justify-content: space-between;">
                                <span style="font-weight: 700;">Net Profit:</span>
                                <span style="font-weight: 700; color: ${companyProfit >= 0 ? '#059669' : '#dc2626'};">${CalcEngine.formatCurrency(companyProfit)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Summary Bar -->
                <div style="background: #f9fafb; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; font-size: 0.8rem;">
                        <div>
                            <span style="color: #6b7280;">Buy Rate:</span>
                            <span style="font-weight: 600; margin-left: 0.25rem;">${CalcEngine.formatCurrency(loadData.buy_rate_per_bag)}/bag</span>
                        </div>
                        <div>
                            <span style="color: #6b7280;">Sell Rate:</span>
                            <span style="font-weight: 600; margin-left: 0.25rem;">${CalcEngine.formatCurrency(loadData.sell_rate_per_bag)}/bag</span>
                        </div>
                        <div>
                            <span style="color: #6b7280;">Margin:</span>
                            <span style="font-weight: 600; margin-left: 0.25rem; color: ${rateMargin >= 0 ? '#059669' : '#dc2626'};">${CalcEngine.formatCurrency(loadData.sell_rate_per_bag - loadData.buy_rate_per_bag)}/bag</span>
                        </div>
                        <div>
                            <span style="color: #6b7280;">Total Margin:</span>
                            <span style="font-weight: 600; margin-left: 0.25rem; color: ${rateMargin >= 0 ? '#059669' : '#dc2626'};">${CalcEngine.formatCurrency(rateMargin)}</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            document.getElementById('calc-details').innerHTML = `<p style="color: #ef4444;">❌ Error: ${error.message}</p>`;
        }
    }
};
