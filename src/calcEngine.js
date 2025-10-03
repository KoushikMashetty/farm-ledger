/**
 * =============================================================================
 * CALCULATION ENGINE - Business Logic for Rice Trade Calculations
 * =============================================================================
 *
 * Purpose: Central module for all financial calculations in rice trade operations
 *
 * Key Calculations:
 * 1. Net weight and bag calculations (with deductions)
 * 2. Commission distribution (Farmer/Mill/Split/None)
 * 3. Expense allocation (Farmer/Mill/Company)
 * 4. Farmer payable amount
 * 5. Mill receivable amount
 * 6. Credit cut (early payment discount)
 * 7. Invoice breakdown (ADD/LESS sections)
 *
 * Business Rules:
 * - Farmer Loading: Deduct 2kg per bag (case1_deduct_per_bag_kg)
 * - Direct Delivery: Deduct 5kg per ton (case2_deduct_per_ton_kg)
 * - Credit Cut: 1% discount if paid within 7 days
 * - Commission: Can be paid by Farmer, Mill, Split, or None
 *
 * Author: Rice Trade Solutions
 * Last Updated: 2025-01-03
 * =============================================================================
 */

const CalcEngine = {
    /**
     * =================================================================
     * MAIN CALCULATION FUNCTION
     * =================================================================
     * Computes complete load settlement including all financial details
     *
     * @param {Object} settings - Global settings from database
     * @param {Object} loadData - Load details from form
     * @returns {Object} Complete calculation results
     */
    computeLoad(settings, loadData) {
        // ============================================================
        // Step 1: Extract Settings
        // ============================================================
        const {
            bag_weight_kg: bagKg,                           // Standard bag weight (75kg)
            case1_deduct_per_bag_kg: case1Deduct,          // Farmer loading deduction (2kg)
            case2_deduct_per_ton_kg: case2Deduct,          // Direct delivery deduction (5kg)
            commission_per_bag: commissionPerBag,          // Commission rate per bag
            companion_per_bag: companionPerBag,            // Companion charge per bag
            credit_cut_percent: creditCutPercent,          // Credit cut percentage (1%)
            credit_cut_days: creditCutDays,                // Credit cut eligibility days (7)
            payout_rounding: payoutRounding                // Rounding for final amounts
        } = settings;

        // ============================================================
        // Step 2: Extract Load Data
        // ============================================================
        const {
            transaction_type: transactionType,             // FARMER_LOADING or DIRECT_DELIVERY
            gross_kg: grossKg,                             // Gross weight from weighbridge
            tare_kg: tareKg,                               // Empty vehicle weight
            declared_bags: declaredBags,                   // Number of bags declared
            buy_rate_per_bag: buyRate,                     // Rate to pay farmer
            sell_rate_per_bag: sellRate,                   // Rate to charge mill
            commission_policy: policy,                     // Who pays commission
            commission_split_percent: splitPercent,        // Split percentage if applicable

            // Expenses
            labour, companion, weight_fee: weightFee,
            vehicle_rent: vehicleRent, freight_advance: freightAdvance,
            gumastha_rusul: gumasthaRusul, cash_driver: cashDriver,
            hamali, other_expenses: otherExpenses,

            // Expense payers
            labour_payer: labourPayer, companion_payer: companionPayer,
            weight_fee_payer: weightFeePayer, vehicle_rent_payer: vehicleRentPayer,
            freight_advance_payer: freightAdvancePayer,
            gumastha_rusul_payer: gumasthaRusulPayer,
            cash_driver_payer: cashDriverPayer, hamali_payer: hamaliPayer
        } = loadData;

        // ============================================================
        // Step 3: Calculate Net Weight
        // ============================================================
        let deductionKg = 0;

        if (transactionType === 'FARMER_LOADING') {
            // Case 1: Farmer brings rice to trader
            // Deduct 2kg per bag for husk removal
            deductionKg = declaredBags * case1Deduct;
        } else {
            // Case 2: Trader delivers to mill
            // Deduct 5kg per ton for wastage
            deductionKg = grossKg * (case2Deduct / 1000);
        }

        // Calculate net weight and bags
        const netKg = Math.max(0, grossKg - tareKg - deductionKg);
        const netBags = Math.round(netKg / bagKg);

        // ============================================================
        // Step 4: Calculate Commission
        // ============================================================
        const commissionBags = netBags;  // Always use net bags for commission
        const commissionAmount = commissionBags * commissionPerBag;

        // Initialize commission shares
        let farmerCommissionShare = 0;
        let millCommissionShare = 0;

        // Distribute commission based on policy
        switch(policy) {
            case 'FARMER':
                // Farmer pays all commission
                farmerCommissionShare = commissionAmount;
                break;

            case 'MILL':
                // Mill pays all commission
                millCommissionShare = commissionAmount;
                break;

            case 'SPLIT':
                // Split commission between farmer and mill
                farmerCommissionShare = Math.round(commissionAmount * splitPercent / 100);
                millCommissionShare = commissionAmount - farmerCommissionShare;
                break;

            case 'NONE':
                // No commission charged
                break;
        }

        // ============================================================
        // Step 5: Calculate Companion Charges
        // ============================================================
        // Companion is auto-calculated if not provided
        const companionAmount = companion !== undefined && companion !== null
            ? companion
            : (commissionBags * companionPerBag);

        // ============================================================
        // Step 6: Prepare Expense Object
        // ============================================================
        const expenses = {
            labour: labour || 0,
            companion: companionAmount,
            weightFee: weightFee || 0,
            vehicleRent: vehicleRent || 0,
            freightAdvance: freightAdvance || 0,
            gumasthaRusul: gumasthaRusul || 0,
            cashDriver: cashDriver || 0,
            hamali: hamali || 0,
            other: otherExpenses || 0
        };

        // ============================================================
        // Step 7: Prepare Expense Payers Object
        // ============================================================
        const payers = {
            labour: labourPayer || 'MILL',
            companion: companionPayer || 'FARMER',
            weightFee: weightFeePayer || 'MILL',
            vehicleRent: vehicleRentPayer || 'MILL',
            freightAdvance: freightAdvancePayer || 'MILL',
            gumasthaRusul: gumasthaRusulPayer || 'FARMER',
            cashDriver: cashDriverPayer || 'FARMER',
            hamali: hamaliPayer || 'FARMER',
            other: 'COMPANY'  // Company always pays other expenses
        };

        // ============================================================
        // Step 8: Allocate Expenses to Payers
        // ============================================================
        let farmerExpenses = 0;
        let millExpenses = 0;
        let companyExpenses = 0;

        // Loop through each expense and add to appropriate payer
        Object.keys(expenses).forEach(key => {
            const amount = expenses[key];
            const payer = payers[key];

            if (payer === 'FARMER') {
                farmerExpenses += amount;
            } else if (payer === 'MILL') {
                millExpenses += amount;
            } else if (payer === 'COMPANY') {
                companyExpenses += amount;
            }
        });

        // ============================================================
        // Step 9: Calculate Farmer Settlement
        // ============================================================
        // Gross amount = Number of bags × Buy rate
        const farmerGrossAmount = netBags * buyRate;

        // Total deductions = Commission + Expenses
        const farmerTotalDeductions = farmerCommissionShare + farmerExpenses;

        // Payable amount = Gross - Deductions
        const farmerPayable = farmerGrossAmount - farmerTotalDeductions;

        // Round to nearest rupee (or 10 rupees based on settings)
        const farmerPayableRounded = Math.round(farmerPayable / payoutRounding) * payoutRounding;

        // ============================================================
        // Step 10: Calculate Mill Settlement
        // ============================================================
        // Gross amount = Number of bags × Sell rate
        const millGrossAmount = netBags * sellRate;

        // Total deductions = Commission + Expenses
        const millTotalDeductions = millCommissionShare + millExpenses;

        // Receivable amount = Gross - Deductions
        const millReceivable = millGrossAmount - millTotalDeductions;

        // Round to nearest rupee (or 10 rupees based on settings)
        const millReceivableRounded = Math.round(millReceivable / payoutRounding) * payoutRounding;

        // ============================================================
        // Step 11: Generate Unique Load Number
        // ============================================================
        const loadNumber = this.generateLoadNumber(loadData.date);

        // ============================================================
        // Step 12: Return Complete Calculation Results
        // ============================================================
        return {
            // Load identification
            load_number: loadNumber,

            // Weight calculations
            net_kg: this.roundTo2(netKg),
            net_bags: netBags,

            // Commission calculations
            commission_bags: commissionBags,
            commission_amount: commissionAmount,
            farmer_commission_share: farmerCommissionShare,
            mill_commission_share: millCommissionShare,

            // Individual expenses
            labour: expenses.labour,
            companion: expenses.companion,
            weight_fee: expenses.weightFee,
            vehicle_rent: expenses.vehicleRent,
            freight_advance: expenses.freightAdvance,
            gumastha_rusul: expenses.gumasthaRusul,
            cash_driver: expenses.cashDriver,
            hamali: expenses.hamali,
            other_expenses: expenses.other,

            // Farmer settlement
            farmer_gross_amount: farmerGrossAmount,
            farmer_total_deductions: farmerTotalDeductions,
            farmer_payable: farmerPayableRounded,

            // Mill settlement
            mill_gross_amount: millGrossAmount,
            mill_total_deductions: millTotalDeductions,
            mill_receivable: millReceivableRounded,

            // Expense breakdown by payer
            company_expenses: companyExpenses,
            farmer_expenses: farmerExpenses,
            mill_expenses: millExpenses,
            expense_breakdown: {
                farmer: farmerExpenses,
                mill: millExpenses,
                company: companyExpenses
            }
        };
    },

    /**
     * =================================================================
     * CREDIT CUT CALCULATION
     * =================================================================
     * Calculate early payment discount for farmers
     * Applied PER LOAD (not on total balance)
     *
     * @param {string} loadDate - Date when load was created (YYYY-MM-DD)
     * @param {string} paymentDate - Date when payment is made (YYYY-MM-DD)
     * @param {number} farmerPayable - Amount to pay farmer
     * @param {Object} settings - Global settings
     * @returns {Object} Credit cut details
     */
    calculateCreditCut(loadDate, paymentDate, farmerPayable, settings) {
        // Convert dates to Date objects
        const loadDateObj = new Date(loadDate);
        const paymentDateObj = new Date(paymentDate);

        // Calculate days difference
        const daysDiff = Math.floor((paymentDateObj - loadDateObj) / (1000 * 60 * 60 * 24));

        // Check if payment is within credit cut period
        if (daysDiff >= 0 && daysDiff <= settings.credit_cut_days) {
            // Calculate credit cut amount (1% of payable)
            const creditCut = Math.round(farmerPayable * (settings.credit_cut_percent / 100));

            // Calculate net payment after discount
            const netPayment = farmerPayable - creditCut;

            return {
                creditCut,           // Discount amount
                netPayment,          // Amount after discount
                eligible: true,      // Eligible for discount
                daysDiff            // Days between load and payment
            };
        }

        // Not eligible for credit cut
        return {
            creditCut: 0,
            netPayment: farmerPayable,
            eligible: false,
            daysDiff
        };
    },

    /**
     * =================================================================
     * LOAD NUMBER GENERATOR
     * =================================================================
     * Generate unique load number in format: ORG-YYYYMMDD-XXX
     * Example: ORG-20250103-537
     *
     * @param {string} date - Load date in YYYY-MM-DD format
     * @returns {string} Unique load number
     */
    generateLoadNumber(date) {
        // Remove dashes from date (YYYY-MM-DD → YYYYMMDD)
        const dateStr = date.replace(/-/g, '');

        // Generate random 3-digit number (100-999)
        const random = Math.floor(Math.random() * 900) + 100;

        // Return formatted load number
        return `ORG-${dateStr}-${random}`;
    },

    /**
     * =================================================================
     * CURRENCY FORMATTER
     * =================================================================
     * Format numbers as Indian Rupees (₹)
     *
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    },

    /**
     * =================================================================
     * NUMBER FORMATTER
     * =================================================================
     * Format numbers with Indian numbering system (lakhs, crores)
     *
     * @param {number} num - Number to format
     * @returns {string} Formatted number string
     */
    formatNumber(num) {
        return new Intl.NumberFormat('en-IN').format(num || 0);
    },

    /**
     * =================================================================
     * DECIMAL ROUNDER
     * =================================================================
     * Round number to 2 decimal places
     *
     * @param {number} num - Number to round
     * @returns {number} Rounded number
     */
    roundTo2(num) {
        return Math.round((num || 0) * 100) / 100;
    },

    /**
     * =================================================================
     * LOAD VALIDATOR
     * =================================================================
     * Validate load data before saving
     *
     * @param {Object} loadData - Load data to validate
     * @returns {Object} Validation result {valid, errors}
     */
    validateLoad(loadData) {
        const errors = [];

        // ============================================================
        // Required Field Validations
        // ============================================================
        if (!loadData.date) errors.push('Date is required');
        if (!loadData.farmer_id) errors.push('Farmer is required');
        if (!loadData.mill_id) errors.push('Mill is required');
        if (!loadData.vehicle_id) errors.push('Vehicle is required');
        if (!loadData.transaction_type) errors.push('Transaction type is required');

        // ============================================================
        // Numeric Field Validations
        // ============================================================
        if (!loadData.gross_kg || loadData.gross_kg <= 0) {
            errors.push('Gross weight must be greater than 0');
        }
        if (!loadData.declared_bags || loadData.declared_bags <= 0) {
            errors.push('Declared bags must be greater than 0');
        }
        if (!loadData.buy_rate_per_bag || loadData.buy_rate_per_bag <= 0) {
            errors.push('Buy rate must be greater than 0');
        }
        if (!loadData.sell_rate_per_bag || loadData.sell_rate_per_bag <= 0) {
            errors.push('Sell rate must be greater than 0');
        }

        // ============================================================
        // Business Logic Validations
        // ============================================================
        // Gross weight must be greater than tare weight
        if (loadData.gross_kg && loadData.tare_kg && loadData.gross_kg <= loadData.tare_kg) {
            errors.push('Gross weight must be greater than tare weight');
        }

        // Warn if sell rate is less than buy rate (negative margin)
        if (loadData.sell_rate_per_bag && loadData.buy_rate_per_bag &&
            loadData.sell_rate_per_bag < loadData.buy_rate_per_bag) {
            errors.push('Warning: Sell rate is less than buy rate (negative margin)');
        }

        // Prevent future dates
        const today = new Date().toISOString().split('T')[0];
        if (loadData.date > today) {
            errors.push('Cannot create load for future date');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * =================================================================
     * PROFIT CALCULATOR
     * =================================================================
     * Calculate profit for a load
     *
     * @param {Object} load - Complete load object
     * @returns {Object} Profit breakdown
     */
    calculateProfit(load) {
        // Rate margin = Difference between sell and buy rates
        const rateMargin = (load.sell_rate_per_bag - load.buy_rate_per_bag) * load.net_bags;

        // Total income = Commission + Credit cut + Rate margin
        const totalIncome = load.commission_amount + (load.credit_cut_amount || 0) + rateMargin;

        // Total expenses = Company expenses only
        const totalExpenses = load.other_expenses || 0;

        // Net profit = Income - Expenses
        const netProfit = totalIncome - totalExpenses;

        return {
            rateMargin,                                    // Margin from rate difference
            commissionIncome: load.commission_amount,     // Commission earned
            creditCutIncome: load.credit_cut_amount || 0, // Credit cut saved
            totalIncome,                                  // Total income
            totalExpenses,                                // Total expenses
            netProfit                                     // Final profit
        };
    },

    /**
     * =================================================================
     * INVOICE BREAKDOWN GENERATOR
     * =================================================================
     * Generate ADD/LESS breakdown for professional invoices
     * Matches industry standard invoice format
     *
     * @param {Object} load - Complete load object
     * @returns {Object} Invoice breakdown with ADD and LESS sections
     */
    generateInvoiceBreakdown(load) {
        // ============================================================
        // ADD Section (Additions to base amount)
        // ============================================================
        const addItems = [];

        if (load.commission_amount > 0) {
            addItems.push({ label: 'Brokerage', amount: load.commission_amount });
        }
        if (load.freight_advance > 0) {
            addItems.push({ label: 'Freight Advance', amount: load.freight_advance });
        }
        if (load.vehicle_rent > 0) {
            addItems.push({ label: 'Freight/Vehicle Rent', amount: load.vehicle_rent });
        }

        // Calculate total additions
        const totalAdd = addItems.reduce((sum, item) => sum + item.amount, 0);

        // ============================================================
        // LESS Section (Deductions from total)
        // ============================================================
        const lessItems = [];

        if (load.gumastha_rusul > 0) {
            lessItems.push({ label: 'Gumastha Rusul', amount: load.gumastha_rusul });
        }
        if (load.weight_fee > 0) {
            lessItems.push({ label: 'Weightment', amount: load.weight_fee });
        }
        if (load.cash_driver > 0) {
            lessItems.push({ label: 'Cash Driver', amount: load.cash_driver });
        }
        if (load.hamali > 0) {
            lessItems.push({ label: 'HAMALI', amount: load.hamali });
        }
        if (load.labour > 0) {
            lessItems.push({ label: 'Labour', amount: load.labour });
        }
        if (load.companion > 0) {
            lessItems.push({ label: 'Companion', amount: load.companion });
        }
        if (load.other_expenses > 0) {
            lessItems.push({ label: 'Other Expenses', amount: load.other_expenses });
        }

        // Calculate total deductions
        const totalLess = lessItems.reduce((sum, item) => sum + item.amount, 0);

        // ============================================================
        // Final Calculation
        // ============================================================
        const baseAmount = load.mill_gross_amount || (load.net_bags * load.sell_rate_per_bag);
        const amountAfterAdd = baseAmount + totalAdd;
        const finalAmount = amountAfterAdd - totalLess;

        return {
            addItems,           // Array of items to add
            totalAdd,           // Total additions
            lessItems,          // Array of items to deduct
            totalLess,          // Total deductions
            baseAmount,         // Base amount (net bags × rate)
            amountAfterAdd,     // Amount after additions
            finalAmount         // Final amount after all calculations
        };
    }
};

// ============================================================
// Export for Both Node.js (Electron) and Browser
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalcEngine;
}
