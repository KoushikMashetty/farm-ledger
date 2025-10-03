/**
 * =============================================================================
 * DATABASE MODULE - IndexedDB Wrapper
 * =============================================================================
 *
 * Purpose: Provides a clean interface for all database operations using IndexedDB
 *
 * Features:
 * - Offline-first data storage in the browser
 * - CRUD operations for all entities (Create, Read, Update, Delete)
 * - Change logging for audit trail
 * - Automatic timestamps and versioning
 * - Data export/import for backup
 *
 * Author: Rice Trade Solutions
 * Last Updated: 2025-01-03
 * =============================================================================
 */

const DB = {
    // Database configuration
    dbName: 'RiceTradeLedgerDB',
    version: 1,
    db: null,

    /**
     * Initialize the IndexedDB database
     * Creates all necessary object stores (tables) and indexes
     * @returns {Promise<IDBDatabase>} Database instance
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            // This event only fires when database is created or version is upgraded
            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // ============================================================
                // Create Settings Store
                // ============================================================
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }

                // ============================================================
                // Create Farmers Store
                // ============================================================
                if (!db.objectStoreNames.contains('farmers')) {
                    const farmerStore = db.createObjectStore('farmers', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    // Indexes for faster searching
                    farmerStore.createIndex('name', 'name', { unique: false });
                    farmerStore.createIndex('village', 'village', { unique: false });
                    farmerStore.createIndex('phone', 'phone', { unique: false });
                }

                // ============================================================
                // Create Mills Store
                // ============================================================
                if (!db.objectStoreNames.contains('mills')) {
                    const millStore = db.createObjectStore('mills', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    millStore.createIndex('name', 'name', { unique: false });
                    millStore.createIndex('village', 'village', { unique: false });
                }

                // ============================================================
                // Create Vehicles Store
                // ============================================================
                if (!db.objectStoreNames.contains('vehicles')) {
                    const vehicleStore = db.createObjectStore('vehicles', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    // Unique index on vehicle number
                    vehicleStore.createIndex('number', 'number', { unique: true });
                }

                // ============================================================
                // Create Loads Store (Main Transaction Table)
                // ============================================================
                if (!db.objectStoreNames.contains('loads')) {
                    const loadStore = db.createObjectStore('loads', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    // Indexes for efficient querying
                    loadStore.createIndex('load_number', 'load_number', { unique: true });
                    loadStore.createIndex('date', 'date', { unique: false });
                    loadStore.createIndex('farmer_id', 'farmer_id', { unique: false });
                    loadStore.createIndex('mill_id', 'mill_id', { unique: false });
                    loadStore.createIndex('status', 'status', { unique: false });
                }

                // ============================================================
                // Create Mill Payments Store
                // ============================================================
                if (!db.objectStoreNames.contains('mill_payments')) {
                    const paymentStore = db.createObjectStore('mill_payments', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    paymentStore.createIndex('mill_id', 'mill_id', { unique: false });
                    paymentStore.createIndex('payment_date', 'payment_date', { unique: false });
                }

                // ============================================================
                // Create Mill Payment Allocations Store
                // ============================================================
                if (!db.objectStoreNames.contains('mill_payment_allocations')) {
                    const allocStore = db.createObjectStore('mill_payment_allocations', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    allocStore.createIndex('payment_id', 'payment_id', { unique: false });
                    allocStore.createIndex('load_id', 'load_id', { unique: false });
                }

                // ============================================================
                // Create Farmer Payments Store
                // ============================================================
                if (!db.objectStoreNames.contains('farmer_payments')) {
                    const farmerPayStore = db.createObjectStore('farmer_payments', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    farmerPayStore.createIndex('farmer_id', 'farmer_id', { unique: false });
                    farmerPayStore.createIndex('load_id', 'load_id', { unique: false });
                    farmerPayStore.createIndex('payment_date', 'payment_date', { unique: false });
                }

                // ============================================================
                // Create Change Log Store (Audit Trail)
                // ============================================================
                if (!db.objectStoreNames.contains('change_log')) {
                    const logStore = db.createObjectStore('change_log', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    logStore.createIndex('table_name', 'table_name', { unique: false });
                    logStore.createIndex('created_at', 'created_at', { unique: false });
                }
            };
        });
    },

    /**
     * Get all records from a store
     * @param {string} storeName - Name of the object store
     * @param {string} indexName - Optional: Name of index to query
     * @param {any} query - Optional: Value to search for in the index
     * @returns {Promise<Array>} Array of all records
     */
    async getAll(storeName, indexName = null, query = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            let request;

            // If index and query provided, search by index
            if (indexName && query) {
                const index = store.index(indexName);
                request = index.getAll(query);
            } else {
                // Otherwise get all records
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get a single record by ID
     * @param {string} storeName - Name of the object store
     * @param {number|string} id - Primary key of the record
     * @returns {Promise<Object>} Single record or undefined if not found
     */
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Add a new record to the store
     * Automatically adds: created_at, updated_at, version, active
     * @param {string} storeName - Name of the object store
     * @param {Object} data - Record data to insert
     * @returns {Promise<number>} ID of the newly created record
     */
    async add(storeName, data) {
        // Add metadata to the record
        data.created_at = new Date().toISOString();
        data.updated_at = new Date().toISOString();
        data.version = 1;
        data.active = data.active !== undefined ? data.active : 1;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => {
                // Log the change for audit trail
                this.logChange(storeName, request.result, 'INSERT', data);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Update an existing record
     * Automatically increments version and updates updated_at timestamp
     * @param {string} storeName - Name of the object store
     * @param {number|string} id - ID of record to update
     * @param {Object} data - New data (partial update supported)
     * @returns {Promise<number>} ID of the updated record
     */
    async update(storeName, id, data) {
        // Get existing record first
        const existing = await this.get(storeName, id);
        if (!existing) {
            throw new Error('Record not found');
        }

        // Merge with new data, increment version
        const updated = {
            ...existing,
            ...data,
            id: id, // Ensure ID doesn't change
            updated_at: new Date().toISOString(),
            version: (existing.version || 1) + 1
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(updated);

            request.onsuccess = () => {
                // Log the change with old and new values
                this.logChange(storeName, id, 'UPDATE', updated, existing);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Soft delete - sets active flag to 0
     * Record is not actually removed, just marked inactive
     * @param {string} storeName - Name of the object store
     * @param {number|string} id - ID of record to delete
     * @returns {Promise<number>} ID of the deleted record
     */
    async delete(storeName, id) {
        return this.update(storeName, id, { active: 0 });
    },

    /**
     * Hard delete - permanently removes record from database
     * WARNING: This cannot be undone!
     * @param {string} storeName - Name of the object store
     * @param {number|string} id - ID of record to permanently delete
     * @returns {Promise<void>}
     */
    async hardDelete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                // Log the permanent deletion
                this.logChange(storeName, id, 'DELETE', null);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Search records by multiple fields
     * @param {string} storeName - Name of the object store
     * @param {Array<string>} searchFields - Fields to search in
     * @param {string} searchTerm - Term to search for
     * @returns {Promise<Array>} Matching records (active only)
     */
    async search(storeName, searchFields, searchTerm) {
        const all = await this.getAll(storeName);
        const term = searchTerm.toLowerCase();

        return all.filter(item => {
            // Skip inactive records
            if (item.active === 0) return false;

            // Check if any field contains the search term
            return searchFields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(term);
            });
        });
    },

    /**
     * Log changes to the change_log store for audit trail
     * @param {string} tableName - Name of table that changed
     * @param {number|string} recordId - ID of record that changed
     * @param {string} action - Action performed (INSERT, UPDATE, DELETE)
     * @param {Object} newValues - New values after change
     * @param {Object} oldValues - Old values before change (for updates)
     */
    async logChange(tableName, recordId, action, newValues, oldValues = null) {
        try {
            const log = {
                table_name: tableName,
                record_id: recordId,
                action,
                new_values: JSON.stringify(newValues),
                old_values: oldValues ? JSON.stringify(oldValues) : null,
                user_name: 'Admin', // TODO: Replace with actual user when auth is implemented
                created_at: new Date().toISOString()
            };

            const transaction = this.db.transaction('change_log', 'readwrite');
            const store = transaction.objectStore('change_log');
            store.add(log);
        } catch (error) {
            console.error('Error logging change:', error);
            // Don't throw - logging errors shouldn't break the main operation
        }
    },

    /**
     * Seed initial data on first run
     * Creates default settings and sample farmers, mills, vehicles
     */
    async seedData() {
        // ============================================================
        // Seed Settings
        // ============================================================
        const settings = await this.get('settings', 1);
        if (!settings) {
            await this.add('settings', {
                id: 1,
                organization_name: 'Rice Trade Organization',
                bag_weight_kg: 75,
                case1_deduct_per_bag_kg: 2,
                case2_deduct_per_ton_kg: 5,
                commission_per_bag: 10,
                companion_per_bag: 2,
                credit_cut_percent: 1,
                credit_cut_days: 7,
                default_commission_policy: 'FARMER',
                default_split_percent: 50,
                payout_rounding: 1
            });
        }

        // ============================================================
        // Seed Sample Farmers
        // ============================================================
        const farmers = await this.getAll('farmers');
        if (farmers.length === 0) {
            await this.add('farmers', {
                name: 'Ravi Kumar',
                village: 'Kharkhoda',
                phone: '9876543210',
                bank_account: '1234567890',
                bank_ifsc: 'SBIN0001234',
                default_rate: 2100,
                notes: 'Sample farmer',
                tags: 'regular',
                total_loads: 0,
                total_bags: 0,
                total_paid: 0,
                outstanding_balance: 0
            });

            await this.add('farmers', {
                name: 'Suresh Singh',
                village: 'Panipat',
                phone: '9876543211',
                bank_account: '0987654321',
                bank_ifsc: 'HDFC0001234',
                default_rate: 2050,
                notes: 'Sample farmer 2',
                tags: 'new',
                total_loads: 0,
                total_bags: 0,
                total_paid: 0,
                outstanding_balance: 0
            });
        }

        // ============================================================
        // Seed Sample Mills
        // ============================================================
        const mills = await this.getAll('mills');
        if (mills.length === 0) {
            await this.add('mills', {
                name: 'Shree Rice Mill',
                village: 'Panipat',
                contact_person: 'Rajesh Sharma',
                phone: '9876543220',
                address: 'Industrial Area, Panipat',
                gstin: '06ABCDE1234F1Z5',
                default_rate: 2200,
                payment_terms: '15 days',
                commission_policy: 'FARMER',
                commission_split_percent: 50,
                notes: 'Main mill partner',
                tags: 'trusted',
                total_loads: 0,
                total_bags: 0,
                total_due: 0,
                total_paid: 0,
                outstanding_balance: 0
            });

            await this.add('mills', {
                name: 'Modern Rice Mill',
                village: 'Karnal',
                contact_person: 'Amit Verma',
                phone: '9876543221',
                address: 'GT Road, Karnal',
                gstin: '06FGHIJ5678K1Z5',
                default_rate: 2150,
                payment_terms: '7 days',
                commission_policy: 'MILL',
                commission_split_percent: 50,
                notes: 'Quick payment mill',
                tags: 'premium',
                total_loads: 0,
                total_bags: 0,
                total_due: 0,
                total_paid: 0,
                outstanding_balance: 0
            });
        }

        // ============================================================
        // Seed Sample Vehicles
        // ============================================================
        const vehicles = await this.getAll('vehicles');
        if (vehicles.length === 0) {
            await this.add('vehicles', {
                number: 'HR38AB1234',
                type: 'TRUCK',
                capacity_kg: 10000,
                driver_name: 'Ramesh Kumar',
                driver_phone: '9876543230',
                driver_license: 'DL123456789',
                total_trips: 0,
                total_bags: 0
            });

            await this.add('vehicles', {
                number: 'PB12CD5678',
                type: 'TRACTOR',
                capacity_kg: 5000,
                driver_name: 'Vikram Singh',
                driver_phone: '9876543231',
                driver_license: 'DL987654321',
                total_trips: 0,
                total_bags: 0
            });
        }
    },

    /**
     * Export entire database to JSON
     * Used for backup purposes
     * @returns {Promise<Object>} Complete database export
     */
    async exportDatabase() {
        const data = {};
        const stores = [
            'settings', 'farmers', 'mills', 'vehicles', 'loads',
            'mill_payments', 'mill_payment_allocations', 'farmer_payments'
        ];

        // Get all data from each store
        for (const storeName of stores) {
            data[storeName] = await this.getAll(storeName);
        }

        // Add metadata
        data.export_date = new Date().toISOString();
        data.version = this.version;

        return data;
    },

    /**
     * Import data from backup JSON
     * Overwrites existing data with imported data
     * @param {Object} data - Exported database object
     */
    async importDatabase(data) {
        const stores = [
            'settings', 'farmers', 'mills', 'vehicles', 'loads',
            'mill_payments', 'mill_payment_allocations', 'farmer_payments'
        ];

        for (const storeName of stores) {
            if (data[storeName]) {
                const transaction = this.db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);

                // Import each record
                for (const item of data[storeName]) {
                    await new Promise((resolve, reject) => {
                        const request = store.put(item);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }
            }
        }
    },

    /**
     * Clear all data from database (except settings)
     * Used for resetting the database to initial state
     */
    async clearAll() {
        const stores = [
            'farmers', 'mills', 'vehicles', 'loads',
            'mill_payments', 'mill_payment_allocations',
            'farmer_payments', 'change_log'
        ];

        for (const storeName of stores) {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        // Re-seed initial data
        await this.seedData();
    },

    /**
     * Get settings (convenience method)
     * @returns {Promise<Object>} Settings object
     */
    async getSettings() {
        return await this.get('settings', 1);
    }
};
