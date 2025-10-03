// Dummy Data Generator for Rice Trade Ledger
// Run this in browser console after app loads: generateDummyData()

async function generateDummyData() {
    console.log('Generating dummy data...');

    // Clear existing data (except settings)
    const stores = ['farmers', 'mills', 'vehicles', 'loads', 'mill_payments', 'farmer_payments'];
    for (const store of stores) {
        const items = await DB.getAll(store);
        for (const item of items) {
            await DB.delete(store, item.id);
        }
    }

    // Farmer names (Indian names)
    const farmerFirstNames = ['Rajesh', 'Suresh', 'Ramesh', 'Mukesh', 'Dinesh', 'Mahesh', 'Prakash', 'Rakesh', 'Naresh', 'Ganesh', 'Vijay', 'Ajay', 'Sanjay', 'Anil', 'Sunil', 'Ravi', 'Mohan', 'Rohan', 'Sohan', 'Krishna', 'Hari', 'Shyam', 'Gopal', 'Kishore', 'Ashok', 'Vinod', 'Manoj', 'Arun', 'Tarun', 'Varun', 'Kiran', 'Pavan', 'Chetan', 'Nitin', 'Sachin', 'Rahul', 'Amit', 'Sumit', 'Rohit', 'Mohit', 'Vivek', 'Deepak', 'Sandeep', 'Pradeep', 'Kuldeep', 'Jagdish', 'Pankaj', 'Neeraj', 'Saurabh', 'Gaurav'];
    const farmerLastNames = ['Kumar', 'Singh', 'Patel', 'Reddy', 'Rao', 'Sharma', 'Gupta', 'Joshi', 'Desai', 'Naik'];
    const villages = ['Rampur', 'Sultanpur', 'Kashipur', 'Fatehpur', 'Sitapur', 'Islampur', 'Udaipur', 'Jalalpur', 'Nandgaon', 'Gopalganj', 'Kishanganj', 'Rajapur', 'Chandpur', 'Bharatpur', 'Deoghar'];

    // Generate 50 Farmers
    const farmerIds = [];
    console.log('Creating 50 farmers...');
    for (let i = 0; i < 50; i++) {
        const firstName = farmerFirstNames[i % farmerFirstNames.length];
        const lastName = farmerLastNames[Math.floor(Math.random() * farmerLastNames.length)];
        const village = villages[Math.floor(Math.random() * villages.length)];

        const farmer = {
            name: `${firstName} ${lastName}`,
            village: village,
            phone: `${9000000000 + Math.floor(Math.random() * 99999999)}`,
            address: `House ${Math.floor(Math.random() * 200) + 1}, ${village}`,
            bank_name: ['SBI', 'HDFC', 'ICICI', 'PNB', 'BOB'][Math.floor(Math.random() * 5)],
            account_number: `${Math.floor(Math.random() * 900000000000) + 100000000000}`,
            ifsc_code: `SBIN000${Math.floor(Math.random() * 9999)}`,
            upi_id: `${firstName.toLowerCase()}@paytm`,
            notes: Math.random() > 0.7 ? 'Regular supplier' : null,
            active: 1
        };

        const id = await DB.add('farmers', farmer);
        farmerIds.push(id);
    }

    // Generate 10 Mills
    const millNames = ['Shri Ram Rice Mill', 'Laxmi Rice Industries', 'Sai Rice Processing', 'Krishna Modern Mill', 'Balaji Rice Works', 'Ganesh Grain Processing', 'Durga Rice Mill', 'Ambika Rice Industries', 'Prakash Rice Mill', 'Shivam Rice Processing'];
    const millIds = [];
    console.log('Creating 10 mills...');
    for (let i = 0; i < 10; i++) {
        const village = villages[Math.floor(Math.random() * villages.length)];

        const mill = {
            name: millNames[i],
            village: village,
            contact_person: farmerFirstNames[Math.floor(Math.random() * farmerFirstNames.length)] + ' ' + farmerLastNames[Math.floor(Math.random() * farmerLastNames.length)],
            phone: `${9100000000 + Math.floor(Math.random() * 99999999)}`,
            address: `Industrial Area, ${village}`,
            gstin: `29${Math.floor(Math.random() * 10000000000)}${Math.floor(Math.random() * 100)}`,
            default_rate: 2500 + Math.floor(Math.random() * 500),
            payment_terms: ['15 days', '30 days', 'COD', '7 days'][Math.floor(Math.random() * 4)],
            commission_policy: ['FARMER', 'MILL', 'SPLIT', null][Math.floor(Math.random() * 4)],
            commission_split_percent: 50,
            notes: Math.random() > 0.8 ? 'Premium buyer' : null,
            active: 1
        };

        const id = await DB.add('mills', mill);
        millIds.push(id);
    }

    // Generate 5 Vehicles
    const vehicleNumbers = ['KA01AB1234', 'KA02CD5678', 'KA03EF9012', 'MH12GH3456', 'TN09IJ7890'];
    const vehicleIds = [];
    console.log('Creating 5 vehicles...');
    for (let i = 0; i < 5; i++) {
        const vehicle = {
            vehicle_number: vehicleNumbers[i],
            vehicle_type: ['TATA ACE', 'EICHER 10.90', 'MAHINDRA BOLERO', 'TATA 407', 'ASHOK LEYLAND'][i],
            driver_name: farmerFirstNames[Math.floor(Math.random() * farmerFirstNames.length)] + ' ' + farmerLastNames[Math.floor(Math.random() * farmerLastNames.length)],
            driver_phone: `${9200000000 + Math.floor(Math.random() * 99999999)}`,
            empty_weight: 1500 + Math.floor(Math.random() * 1000),
            capacity: 3000 + Math.floor(Math.random() * 2000),
            rent_per_trip: 4000 + Math.floor(Math.random() * 3000),
            notes: null,
            active: 1
        };

        const id = await DB.add('vehicles', vehicle);
        vehicleIds.push(id);
    }

    // Get settings
    const settings = await DB.get('settings', 1);

    // Generate 100 Loads over past 30 days
    console.log('Creating 100 loads over past 30 days...');
    const today = new Date();

    for (let i = 0; i < 100; i++) {
        // Random date in past 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const loadDate = new Date(today);
        loadDate.setDate(loadDate.getDate() - daysAgo);
        const dateStr = loadDate.toISOString().split('T')[0];

        // Random selections
        const farmerId = farmerIds[Math.floor(Math.random() * farmerIds.length)];
        const millId = millIds[Math.floor(Math.random() * millIds.length)];
        const vehicleId = vehicleIds[Math.floor(Math.random() * vehicleIds.length)];
        const vehicle = await DB.get('vehicles', vehicleId);

        const transactionType = Math.random() > 0.5 ? 'FARMER_LOADING' : 'DIRECT_DELIVERY';

        // Random weights and rates
        const emptyWeight = vehicle.empty_weight + Math.floor(Math.random() * 200) - 100;
        const loadedWeight = emptyWeight + 2000 + Math.floor(Math.random() * 2000);
        const grossWeight = loadedWeight - emptyWeight;
        const declaredBags = Math.floor(grossWeight / 75) + Math.floor(Math.random() * 5) - 2;

        const buyRate = 2400 + Math.floor(Math.random() * 400);
        const sellRate = buyRate + 50 + Math.floor(Math.random() * 200);

        // Random expenses
        const labourCharges = Math.random() > 0.3 ? 400 + Math.floor(Math.random() * 300) : 0;
        const companionCharges = Math.random() > 0.5 ? 100 + Math.floor(Math.random() * 100) : 0;
        const weightFee = Math.random() > 0.4 ? 100 + Math.floor(Math.random() * 100) : 0;
        const vehicleRent = 4000 + Math.floor(Math.random() * 3000);

        const expensePayers = ['FARMER', 'MILL', 'COMPANY'];

        const loadData = {
            date: dateStr,
            transaction_type: transactionType,
            gross_kg: grossWeight,
            tare_kg: 0,
            declared_bags: declaredBags,
            buy_rate_per_bag: buyRate,
            sell_rate_per_bag: sellRate,
            commission_policy: '',
            commission_split_percent: 50,
            labour: labourCharges,
            companion: companionCharges,
            weight_fee: weightFee,
            vehicle_rent: vehicleRent,
            labour_payer: labourCharges > 0 ? expensePayers[Math.floor(Math.random() * 3)] : 'MILL',
            companion_payer: companionCharges > 0 ? expensePayers[Math.floor(Math.random() * 3)] : 'FARMER',
            weight_fee_payer: weightFee > 0 ? expensePayers[Math.floor(Math.random() * 3)] : 'MILL',
            vehicle_rent_payer: expensePayers[Math.floor(Math.random() * 3)]
        };

        // Calculate using CalcEngine
        const calc = CalcEngine.computeLoad(settings, loadData);

        // Save load with calculated values
        const load = {
            date: dateStr,
            transaction_type: transactionType,
            farmer_id: farmerId,
            mill_id: millId,
            vehicle_id: vehicleId,
            empty_vehicle_weight: emptyWeight,
            loaded_vehicle_weight: loadedWeight,
            gross_kg: grossWeight,
            tare_kg: 0,
            declared_bags: declaredBags,
            buy_rate_per_bag: buyRate,
            sell_rate_per_bag: sellRate,
            commission_policy: '',
            commission_split_percent: 50,
            labour: labourCharges,
            companion: calc.companion,
            weight_fee: weightFee,
            vehicle_rent: vehicleRent,
            labour_payer: loadData.labour_payer,
            companion_payer: loadData.companion_payer,
            weight_fee_payer: loadData.weight_fee_payer,
            vehicle_rent_payer: loadData.vehicle_rent_payer,
            load_number: calc.load_number,
            net_kg: calc.net_kg,
            net_bags: calc.net_bags,
            commission_amount: calc.commission_amount,
            farmer_commission_share: calc.farmer_commission_share,
            mill_commission_share: calc.mill_commission_share,
            farmer_expenses: calc.farmer_expenses,
            mill_expenses: calc.mill_expenses,
            company_expenses: calc.company_expenses,
            farmer_payable: calc.farmer_payable,
            mill_receivable: calc.mill_receivable,
            mill_payment_status: 'PENDING',
            mill_paid_amount: 0,
            mill_paid_date: null,
            farmer_payment_status: 'PENDING',
            farmer_paid_amount: 0,
            farmer_paid_date: null,
            credit_cut_amount: 0,
            status: 'PENDING',
            notes: Math.random() > 0.9 ? 'Quality rice' : null
        };

        const loadId = await DB.add('loads', load);

        // Simulate some payments (70% mill paid, 50% farmer paid)
        const millPaidChance = Math.random();
        if (millPaidChance < 0.7 && daysAgo > 2) {
            // Mill payment
            const paymentDaysAfter = 1 + Math.floor(Math.random() * 10);
            const millPaymentDate = new Date(loadDate);
            millPaymentDate.setDate(millPaymentDate.getDate() + paymentDaysAfter);

            const isPartial = Math.random() < 0.2;
            const millPaymentAmount = isPartial
                ? Math.floor(load.mill_receivable * (0.5 + Math.random() * 0.4))
                : load.mill_receivable;

            const millPayment = {
                mill_id: millId,
                load_id: loadId,
                payment_date: millPaymentDate.toISOString().split('T')[0],
                amount: millPaymentAmount,
                payment_method: ['CASH', 'BANK', 'UPI', 'CHEQUE'][Math.floor(Math.random() * 4)],
                reference_number: Math.random() > 0.5 ? `TXN${Math.floor(Math.random() * 1000000)}` : null,
                notes: null,
                allocation_method: 'MANUAL'
            };

            await DB.add('mill_payments', millPayment);

            const isFull = millPaymentAmount >= load.mill_receivable;
            await DB.update('loads', loadId, {
                mill_paid_amount: millPaymentAmount,
                mill_payment_status: isFull ? 'FULL' : 'PARTIAL',
                mill_paid_date: millPayment.payment_date,
                status: isFull ? 'MILL_PAID_FULL' : 'MILL_PAID_PARTIAL'
            });

            // Farmer payment (only if mill paid full)
            if (isFull && Math.random() < 0.6 && daysAgo > 5) {
                const farmerPaymentDaysAfter = paymentDaysAfter + 1 + Math.floor(Math.random() * 5);
                const farmerPaymentDate = new Date(loadDate);
                farmerPaymentDate.setDate(farmerPaymentDate.getDate() + farmerPaymentDaysAfter);
                const paymentDateStr = farmerPaymentDate.toISOString().split('T')[0];

                const daysSinceLoad = Math.floor((farmerPaymentDate - loadDate) / (1000 * 60 * 60 * 24));
                const creditCutResult = CalcEngine.calculateCreditCut(
                    dateStr,
                    paymentDateStr,
                    load.farmer_payable,
                    settings
                );

                const farmerPayment = {
                    farmer_id: farmerId,
                    load_id: loadId,
                    payment_date: paymentDateStr,
                    gross_amount: load.farmer_payable,
                    credit_cut_amount: creditCutResult.creditCut,
                    net_amount: creditCutResult.netPayment,
                    payment_method: ['CASH', 'BANK', 'UPI'][Math.floor(Math.random() * 3)],
                    reference_number: Math.random() > 0.5 ? `PAY${Math.floor(Math.random() * 1000000)}` : null,
                    notes: creditCutResult.eligible ? `Credit cut applied (${daysSinceLoad} days)` : null
                };

                await DB.add('farmer_payments', farmerPayment);

                await DB.update('loads', loadId, {
                    farmer_paid_amount: farmerPayment.net_amount,
                    farmer_payment_status: 'FULL',
                    farmer_paid_date: farmerPayment.payment_date,
                    credit_cut_amount: creditCutResult.creditCut,
                    status: 'SETTLED'
                });
            }
        }

        if ((i + 1) % 20 === 0) {
            console.log(`Created ${i + 1} loads...`);
        }
    }

    // Reload app data
    await App.loadAllData();

    console.log('✅ Dummy data generation complete!');
    console.log('📊 Summary:');
    console.log('  - 50 Farmers');
    console.log('  - 10 Mills');
    console.log('  - 5 Vehicles');
    console.log('  - 100 Loads (past 30 days)');
    console.log('  - ~70 Mill payments');
    console.log('  - ~35 Farmer payments');
    console.log('\nRefresh the page or switch tabs to see the data!');
}

// Add to window for easy access
window.generateDummyData = generateDummyData;

console.log('Dummy data generator loaded!');
console.log('Run: generateDummyData()');
