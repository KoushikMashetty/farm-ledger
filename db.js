const DB = {
    dbName: 'RiceTradeDB',
    version: 1,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('farmers')) {
                    db.createObjectStore('farmers', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('mills')) {
                    db.createObjectStore('mills', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('vehicles')) {
                    db.createObjectStore('vehicles', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('loads')) {
                    const loadStore = db.createObjectStore('loads', { keyPath: 'id', autoIncrement: true });
                    loadStore.createIndex('farmerId', 'farmerId', { unique: false });
                    loadStore.createIndex('millId', 'millId', { unique: false });
                    loadStore.createIndex('date', 'date', { unique: false });
                }
                if (!db.objectStoreNames.contains('advances')) {
                    const advanceStore = db.createObjectStore('advances', { keyPath: 'id', autoIncrement: true });
                    advanceStore.createIndex('farmerId', 'farmerId', { unique: false });
                }
                if (!db.objectStoreNames.contains('receipts')) {
                    const receiptStore = db.createObjectStore('receipts', { keyPath: 'id', autoIncrement: true });
                    receiptStore.createIndex('millId', 'millId', { unique: false });
                }
                if (!db.objectStoreNames.contains('receiptAllocations')) {
                    db.createObjectStore('receiptAllocations', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('payouts')) {
                    const payoutStore = db.createObjectStore('payouts', { keyPath: 'id', autoIncrement: true });
                    payoutStore.createIndex('farmerId', 'farmerId', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }
            };
        });
    },

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
  async seedData() {
        const settings = await this.get('settings', 'default');
        if (!settings) {
            await this.put('settings', {
                id: 'default',
                bagKg: 75,
                case1DeductPerBagKg: 2,
                case2DeductPerTonKg: 5,
                commissionPerBag: 10,
                companionPerBag: 2,
                payoutRounding: 1,
                defaultCommissionPolicy: 'FARMER',
                defaultCommissionSplitPercent: 50
            });
        }

        const farmers = await this.getAll('farmers');
        if (farmers.length === 0) {
            await this.add('farmers', {
                name: 'Ravi Kumar',
                village: 'Kharkhoda',
                phone: '9876543210'
            });
            await this.add('farmers', {
                name: 'Suresh Singh',
                village: 'Panipat',
                phone: '9876543211'
            });
        }

        const mills = await this.getAll('mills');
        if (mills.length === 0) {
            await this.add('mills', {
                name: 'Shree Rice Mill',
                village: 'Panipat',
                phone: '9876543220',
                pointOfContact: 'Rajesh Kumar',
                commissionDefault: 'FARMER',
                commissionSplitPercent: 50
            });
            await this.add('mills', {
                name: 'Modern Rice Mill',
                village: 'Karnal',
                phone: '9876543221',
                pointOfContact: 'Amit Sharma',
                commissionDefault: 'MILL',
                commissionSplitPercent: 50
            });
        }

        const vehicles = await this.getAll('vehicles');
        if (vehicles.length === 0) {
            await this.add('vehicles', {
                number: 'AP12AB3456',
                driverPhone: '9876543230'
            });
        }

        const loads = await this.getAll('loads');
        if (loads.length === 0) {
            const today = new Date().toISOString().split('T')[0];
            const settings = await this.get('settings', 'default');
            
            const load1 = {
                date: today,
                farmerId: 1,
                millId: 1,
                vehicleId: 1,
                movement: 'LOADING',
                grossKg: 9000,
                declaredBags: 120,
                case: 'CASE1',
                buyRatePerBag: 2100,
                sellRatePerBag: 2200,
                useDeclaredForCommission: false,
                policy: 'FARMER',
                splitPct: 50,
                expenses: {
                    labour: 1800,
                    companion: 240,
                    weightFee: 200,
                    vehicleRent: 3000,
                    route: {
                        labour: 'MILL',
                        companion: 'FARMER',
                        weightFee: 'MILL',
                        vehicleRent: 'MILL'
                    }
                },
                status: 'Registered',
                farmerPaymentStatus: 'Pending',
                millPaymentStatus: 'Pending'
            };
            load1.computed = CalcEngine.computeSettlement(settings, load1, []);
            await this.add('loads', load1);
            
            const load2 = {
                date: today,
                farmerId: 2,
                millId: 2,
                vehicleId: 1,
                movement: 'DELIVERY',
                grossKg: 10000,
                declaredBags: 130,
                case: 'CASE2',
                buyRatePerBag: 2000,
                sellRatePerBag: 2120,
                useDeclaredForCommission: false,
                policy: 'SPLIT',
                splitPct: 60,
                expenses: {
                    labour: 1500,
                    companion: 260,
                    weightFee: 150,
                    vehicleRent: 2500,
                    route: {
                        labour: 'MILL',
                        companion: 'FARMER',
                        weightFee: 'MILL',
                        vehicleRent: 'COMPANY'
                    }
                },
                status: 'Registered',
                farmerPaymentStatus: 'Pending',
                millPaymentStatus: 'Pending'
            };
            load2.computed = CalcEngine.computeSettlement(settings, load2, []);
            await this.add('loads', load2);
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 5);
            
            await this.add('advances', {
                farmerId: 1,
                date: sevenDaysAgo.toISOString().split('T')[0],
                amount: 50000
            });
            
            await this.add('advances', {
                farmerId: 1,
                date: sevenDaysAgo.toISOString().split('T')[0],
                amount: 20000
            });
        }
    }
};