const CalcEngine = {
    computeSettlement(settings, load, advancesForLoad = []) {
        const {
            bagKg,
            case1DeductPerBagKg,
            case2DeductPerTonKg,
            commissionPerBag,
            companionPerBag,
            payoutRounding
        } = settings;

        const {
            grossKg,
            declaredBags,
            case: caseType,
            buyRatePerBag,
            sellRatePerBag,
            useDeclaredForCommission,
            policy,
            splitPct,
            expenses
        } = load;

        let deductionKg = 0;
        if (caseType === 'CASE1') {
            deductionKg = declaredBags * case1DeductPerBagKg;
        } else {
            deductionKg = grossKg * (case2DeductPerTonKg / 1000);
        }

        const netKg = Math.max(0, grossKg - deductionKg);
        const amountBags = Math.round(netKg / bagKg);
        const commissionBags = useDeclaredForCommission ? 
            declaredBags : 
            Math.ceil(netKg / bagKg);

        const commissionAmount = commissionBags * commissionPerBag;

        let farmerCommissionShare = 0;
        let millCommissionShare = 0;

        switch(policy) {
            case 'FARMER':
                farmerCommissionShare = commissionAmount;
                break;
            case 'MILL':
                millCommissionShare = commissionAmount;
                break;
            case 'SPLIT':
                farmerCommissionShare = Math.round(commissionAmount * splitPct / 100);
                millCommissionShare = commissionAmount - farmerCommissionShare;
                break;
            case 'NONE':
                break;
        }

        const defaultCompanion = commissionBags * companionPerBag;
        const actualCompanion = expenses.companion !== undefined ? 
            expenses.companion : 
            defaultCompanion;

        const expenseItems = {
            labour: expenses.labour || 0,
            companion: actualCompanion,
            weightFee: expenses.weightFee || 0,
            vehicleRent: expenses.vehicleRent || 0
        };

        let farmerExpensesTotal = 0;
        let millExpensesTotal = 0;
        let companyExpensesTotal = 0;

        for (const [key, amount] of Object.entries(expenseItems)) {
            const payer = expenses.route[key];
            if (payer === 'FARMER') farmerExpensesTotal += amount;
            else if (payer === 'MILL') millExpensesTotal += amount;
            else if (payer === 'COMPANY') companyExpensesTotal += amount;
        }

        let financeChargesPerLoad = 0;
        const loadDate = new Date(load.date);
        
        for (const advance of advancesForLoad) {
            const advanceDate = new Date(advance.date);
            const daysDiff = Math.floor((loadDate - advanceDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff >= 0 && daysDiff <= 7) {
                financeChargesPerLoad += Math.round(advance.amount * 0.01);
            }
        }

        const farmerPayable = (amountBags * buyRatePerBag) - 
            farmerExpensesTotal - 
            farmerCommissionShare - 
            financeChargesPerLoad;

        const millReceivable = (amountBags * sellRatePerBag) - 
            millExpensesTotal - 
            millCommissionShare;

        const farmerPayableRounded = Math.round(farmerPayable / payoutRounding) * payoutRounding;
        const millReceivableRounded = Math.round(millReceivable / payoutRounding) * payoutRounding;

        return {
            deductionKg: Math.round(deductionKg * 100) / 100,
            netKg: Math.round(netKg * 100) / 100,
            amountBags,
            commissionBags,
            commissionAmount,
            farmerCommissionShare,
            millCommissionShare,
            farmerExpensesTotal,
            millExpensesTotal,
            companyExpensesTotal,
            financeChargesPerLoad,
            farmerPayable: farmerPayableRounded,
            millReceivable: millReceivableRounded,
            expenseItems
        };
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    },

    formatNumber(num) {
        return new Intl.NumberFormat('en-IN').format(num || 0);
    }
};