-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    organization_name TEXT DEFAULT 'Rice Trade Organization',
    bag_weight_kg REAL DEFAULT 75,
    case1_deduct_per_bag_kg REAL DEFAULT 2,
    case2_deduct_per_ton_kg REAL DEFAULT 5,
    commission_per_bag REAL DEFAULT 10,
    companion_per_bag REAL DEFAULT 2,
    credit_cut_percent REAL DEFAULT 1,
    credit_cut_days INTEGER DEFAULT 7,
    default_commission_policy TEXT DEFAULT 'FARMER',
    default_split_percent INTEGER DEFAULT 50,
    payout_rounding INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (id = 1)
);

-- Insert default settings
INSERT OR IGNORE INTO settings (id) VALUES (1);

-- Farmers Table
CREATE TABLE IF NOT EXISTS farmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    village TEXT NOT NULL,
    phone TEXT,
    bank_account TEXT,
    bank_ifsc TEXT,
    default_rate REAL,
    notes TEXT,
    tags TEXT,
    active INTEGER DEFAULT 1,
    total_loads INTEGER DEFAULT 0,
    total_bags INTEGER DEFAULT 0,
    total_paid REAL DEFAULT 0,
    outstanding_balance REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_farmers_name ON farmers(name);
CREATE INDEX IF NOT EXISTS idx_farmers_village ON farmers(village);
CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);

-- Mills Table
CREATE TABLE IF NOT EXISTS mills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    village TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    address TEXT,
    gstin TEXT,
    default_rate REAL,
    payment_terms TEXT,
    commission_policy TEXT,
    commission_split_percent INTEGER,
    notes TEXT,
    tags TEXT,
    active INTEGER DEFAULT 1,
    total_loads INTEGER DEFAULT 0,
    total_bags INTEGER DEFAULT 0,
    total_due REAL DEFAULT 0,
    total_paid REAL DEFAULT 0,
    outstanding_balance REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_mills_name ON mills(name);
CREATE INDEX IF NOT EXISTS idx_mills_village ON mills(village);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'TRUCK',
    capacity_kg REAL,
    driver_name TEXT,
    driver_phone TEXT,
    driver_license TEXT,
    active INTEGER DEFAULT 1,
    total_trips INTEGER DEFAULT 0,
    total_bags INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_vehicles_number ON vehicles(number);

-- Loads Table (Main Transaction)
CREATE TABLE IF NOT EXISTS loads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    load_number TEXT NOT NULL UNIQUE,
    date DATE NOT NULL,
    farmer_id INTEGER NOT NULL,
    mill_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('FARMER_LOADING', 'DIRECT_DELIVERY')),

    -- Weight details
    gross_kg REAL NOT NULL,
    tare_kg REAL DEFAULT 0,
    declared_bags INTEGER NOT NULL,
    net_kg REAL NOT NULL,
    net_bags INTEGER NOT NULL,

    -- Rates
    buy_rate_per_bag REAL NOT NULL,
    sell_rate_per_bag REAL NOT NULL,

    -- Commission
    commission_policy TEXT NOT NULL CHECK(commission_policy IN ('FARMER', 'MILL', 'SPLIT', 'NONE')),
    commission_split_percent INTEGER DEFAULT 50,
    commission_bags INTEGER NOT NULL,
    commission_amount REAL NOT NULL,
    farmer_commission_share REAL DEFAULT 0,
    mill_commission_share REAL DEFAULT 0,

    -- Expenses
    labour REAL DEFAULT 0,
    companion REAL DEFAULT 0,
    weight_fee REAL DEFAULT 0,
    vehicle_rent REAL DEFAULT 0,
    freight_advance REAL DEFAULT 0,
    gumastha_rusul REAL DEFAULT 0,
    cash_driver REAL DEFAULT 0,
    hamali REAL DEFAULT 0,
    other_expenses REAL DEFAULT 0,

    -- Expense payers
    labour_payer TEXT DEFAULT 'MILL' CHECK(labour_payer IN ('FARMER', 'MILL', 'COMPANY')),
    companion_payer TEXT DEFAULT 'FARMER' CHECK(companion_payer IN ('FARMER', 'MILL', 'COMPANY')),
    weight_fee_payer TEXT DEFAULT 'MILL' CHECK(weight_fee_payer IN ('FARMER', 'MILL', 'COMPANY')),
    vehicle_rent_payer TEXT DEFAULT 'MILL' CHECK(vehicle_rent_payer IN ('FARMER', 'MILL', 'COMPANY')),
    freight_advance_payer TEXT DEFAULT 'MILL' CHECK(freight_advance_payer IN ('FARMER', 'MILL', 'COMPANY')),
    gumastha_rusul_payer TEXT DEFAULT 'FARMER' CHECK(gumastha_rusul_payer IN ('FARMER', 'MILL', 'COMPANY')),
    cash_driver_payer TEXT DEFAULT 'FARMER' CHECK(cash_driver_payer IN ('FARMER', 'MILL', 'COMPANY')),
    hamali_payer TEXT DEFAULT 'FARMER' CHECK(hamali_payer IN ('FARMER', 'MILL', 'COMPANY')),

    -- Financial calculations
    farmer_gross_amount REAL NOT NULL,
    farmer_total_deductions REAL DEFAULT 0,
    farmer_payable REAL NOT NULL,

    mill_gross_amount REAL NOT NULL,
    mill_total_deductions REAL DEFAULT 0,
    mill_receivable REAL NOT NULL,

    -- Payment tracking
    mill_payment_status TEXT DEFAULT 'PENDING' CHECK(mill_payment_status IN ('PENDING', 'PARTIAL', 'FULL')),
    mill_paid_amount REAL DEFAULT 0,
    mill_paid_date DATE,

    farmer_payment_status TEXT DEFAULT 'PENDING' CHECK(farmer_payment_status IN ('PENDING', 'PARTIAL', 'FULL')),
    farmer_paid_amount REAL DEFAULT 0,
    farmer_paid_date DATE,
    credit_cut_amount REAL DEFAULT 0,

    -- Status workflow
    status TEXT DEFAULT 'CREATED' CHECK(status IN (
        'CREATED', 'DISPATCHED', 'RECEIVED', 'MILL_PAYMENT_PENDING',
        'MILL_PAID_PARTIAL', 'MILL_PAID_FULL', 'FARMER_PAYMENT_PENDING',
        'FARMER_PAID_PARTIAL', 'FARMER_PAID_FULL', 'SETTLED'
    )),

    -- Metadata
    notes TEXT,
    weighbridge_photo TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,

    FOREIGN KEY (farmer_id) REFERENCES farmers(id),
    FOREIGN KEY (mill_id) REFERENCES mills(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE INDEX IF NOT EXISTS idx_loads_date ON loads(date);
CREATE INDEX IF NOT EXISTS idx_loads_farmer ON loads(farmer_id);
CREATE INDEX IF NOT EXISTS idx_loads_mill ON loads(mill_id);
CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);
CREATE INDEX IF NOT EXISTS idx_loads_number ON loads(load_number);

-- Mill Payments Table
CREATE TABLE IF NOT EXISTS mill_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mill_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('CASH', 'BANK', 'UPI', 'CHEQUE')),
    reference_number TEXT,
    notes TEXT,
    receipt_photo TEXT,
    allocation_method TEXT DEFAULT 'FIFO' CHECK(allocation_method IN ('FIFO', 'PROPORTIONAL', 'MANUAL')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (mill_id) REFERENCES mills(id)
);

CREATE INDEX IF NOT EXISTS idx_mill_payments_date ON mill_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_mill_payments_mill ON mill_payments(mill_id);

-- Mill Payment Allocations
CREATE TABLE IF NOT EXISTS mill_payment_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    load_id INTEGER NOT NULL,
    allocated_amount REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES mill_payments(id),
    FOREIGN KEY (load_id) REFERENCES loads(id)
);

-- Farmer Payments Table
CREATE TABLE IF NOT EXISTS farmer_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER NOT NULL,
    load_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    gross_amount REAL NOT NULL,
    credit_cut_amount REAL DEFAULT 0,
    net_amount REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('CASH', 'BANK', 'UPI', 'CHEQUE')),
    reference_number TEXT,
    notes TEXT,
    invoice_number TEXT,
    invoice_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id),
    FOREIGN KEY (load_id) REFERENCES loads(id)
);

CREATE INDEX IF NOT EXISTS idx_farmer_payments_date ON farmer_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_farmer ON farmer_payments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_load ON farmer_payments(load_id);

-- Change Log Table (Audit Trail)
CREATE TABLE IF NOT EXISTS change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_fields TEXT,
    old_values TEXT,
    new_values TEXT,
    user_name TEXT DEFAULT 'Admin',
    device_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_change_log_table ON change_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_change_log_date ON change_log(created_at);
