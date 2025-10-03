const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

let mainWindow;
let db;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../build/icon.png')
    });

    mainWindow.loadFile('index.html');

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function initDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'ricetrade.db');

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);

    console.log('Database initialized at:', dbPath);
    return dbPath;
}

app.whenReady().then(() => {
    const dbPath = initDatabase();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (db) db.close();
        app.quit();
    }
});

// IPC Handlers - Settings
ipcMain.handle('db:getSettings', () => {
    const stmt = db.prepare('SELECT * FROM settings WHERE id = 1');
    return stmt.get();
});

ipcMain.handle('db:updateSettings', (event, settings) => {
    const stmt = db.prepare(`
        UPDATE settings SET
            organization_name = ?,
            bag_weight_kg = ?,
            case1_deduct_per_bag_kg = ?,
            case2_deduct_per_ton_kg = ?,
            commission_per_bag = ?,
            companion_per_bag = ?,
            credit_cut_percent = ?,
            credit_cut_days = ?,
            default_commission_policy = ?,
            default_split_percent = ?,
            payout_rounding = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    `);
    return stmt.run(
        settings.organization_name,
        settings.bag_weight_kg,
        settings.case1_deduct_per_bag_kg,
        settings.case2_deduct_per_ton_kg,
        settings.commission_per_bag,
        settings.companion_per_bag,
        settings.credit_cut_percent,
        settings.credit_cut_days,
        settings.default_commission_policy,
        settings.default_split_percent,
        settings.payout_rounding
    );
});

// IPC Handlers - Farmers
ipcMain.handle('db:getFarmers', (event, { search, limit, offset }) => {
    let query = 'SELECT * FROM farmers WHERE active = 1';
    const params = [];

    if (search) {
        query += ' AND (name LIKE ? OR village LIKE ? OR phone LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY name ASC';

    if (limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset || 0);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
});

ipcMain.handle('db:getFarmer', (event, id) => {
    const stmt = db.prepare('SELECT * FROM farmers WHERE id = ?');
    return stmt.get(id);
});

ipcMain.handle('db:addFarmer', (event, farmer) => {
    const stmt = db.prepare(`
        INSERT INTO farmers (name, village, phone, bank_account, bank_ifsc, default_rate, notes, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        farmer.name,
        farmer.village,
        farmer.phone || null,
        farmer.bank_account || null,
        farmer.bank_ifsc || null,
        farmer.default_rate || null,
        farmer.notes || null,
        farmer.tags || null
    );
    return result.lastInsertRowid;
});

ipcMain.handle('db:updateFarmer', (event, id, farmer) => {
    const stmt = db.prepare(`
        UPDATE farmers SET
            name = ?,
            village = ?,
            phone = ?,
            bank_account = ?,
            bank_ifsc = ?,
            default_rate = ?,
            notes = ?,
            tags = ?,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = ?
    `);
    return stmt.run(
        farmer.name,
        farmer.village,
        farmer.phone || null,
        farmer.bank_account || null,
        farmer.bank_ifsc || null,
        farmer.default_rate || null,
        farmer.notes || null,
        farmer.tags || null,
        id
    );
});

ipcMain.handle('db:deleteFarmer', (event, id) => {
    const stmt = db.prepare('UPDATE farmers SET active = 0 WHERE id = ?');
    return stmt.run(id);
});

// IPC Handlers - Mills
ipcMain.handle('db:getMills', (event, { search, limit, offset }) => {
    let query = 'SELECT * FROM mills WHERE active = 1';
    const params = [];

    if (search) {
        query += ' AND (name LIKE ? OR village LIKE ? OR phone LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY name ASC';

    if (limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset || 0);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
});

ipcMain.handle('db:getMill', (event, id) => {
    const stmt = db.prepare('SELECT * FROM mills WHERE id = ?');
    return stmt.get(id);
});

ipcMain.handle('db:addMill', (event, mill) => {
    const stmt = db.prepare(`
        INSERT INTO mills (name, village, contact_person, phone, address, gstin, default_rate,
                          payment_terms, commission_policy, commission_split_percent, notes, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        mill.name,
        mill.village,
        mill.contact_person || null,
        mill.phone || null,
        mill.address || null,
        mill.gstin || null,
        mill.default_rate || null,
        mill.payment_terms || null,
        mill.commission_policy || null,
        mill.commission_split_percent || null,
        mill.notes || null,
        mill.tags || null
    );
    return result.lastInsertRowid;
});

ipcMain.handle('db:updateMill', (event, id, mill) => {
    const stmt = db.prepare(`
        UPDATE mills SET
            name = ?,
            village = ?,
            contact_person = ?,
            phone = ?,
            address = ?,
            gstin = ?,
            default_rate = ?,
            payment_terms = ?,
            commission_policy = ?,
            commission_split_percent = ?,
            notes = ?,
            tags = ?,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = ?
    `);
    return stmt.run(
        mill.name,
        mill.village,
        mill.contact_person || null,
        mill.phone || null,
        mill.address || null,
        mill.gstin || null,
        mill.default_rate || null,
        mill.payment_terms || null,
        mill.commission_policy || null,
        mill.commission_split_percent || null,
        mill.notes || null,
        mill.tags || null,
        id
    );
});

ipcMain.handle('db:deleteMill', (event, id) => {
    const stmt = db.prepare('UPDATE mills SET active = 0 WHERE id = ?');
    return stmt.run(id);
});

// IPC Handlers - Vehicles
ipcMain.handle('db:getVehicles', (event, { search }) => {
    let query = 'SELECT * FROM vehicles WHERE active = 1 ORDER BY number ASC';
    const params = [];

    if (search) {
        query = 'SELECT * FROM vehicles WHERE active = 1 AND number LIKE ? ORDER BY number ASC';
        params.push(`%${search}%`);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
});

ipcMain.handle('db:addVehicle', (event, vehicle) => {
    const stmt = db.prepare(`
        INSERT INTO vehicles (number, type, capacity_kg, driver_name, driver_phone, driver_license)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        vehicle.number,
        vehicle.type || 'TRUCK',
        vehicle.capacity_kg || null,
        vehicle.driver_name || null,
        vehicle.driver_phone || null,
        vehicle.driver_license || null
    );
    return result.lastInsertRowid;
});

ipcMain.handle('db:updateVehicle', (event, id, vehicle) => {
    const stmt = db.prepare(`
        UPDATE vehicles SET
            number = ?,
            type = ?,
            capacity_kg = ?,
            driver_name = ?,
            driver_phone = ?,
            driver_license = ?,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = ?
    `);
    return stmt.run(
        vehicle.number,
        vehicle.type,
        vehicle.capacity_kg || null,
        vehicle.driver_name || null,
        vehicle.driver_phone || null,
        vehicle.driver_license || null,
        id
    );
});

ipcMain.handle('db:deleteVehicle', (event, id) => {
    const stmt = db.prepare('UPDATE vehicles SET active = 0 WHERE id = ?');
    return stmt.run(id);
});

// IPC Handlers - Loads
ipcMain.handle('db:getLoads', (event, { search, status, limit, offset }) => {
    let query = `
        SELECT l.*,
               f.name as farmer_name, f.village as farmer_village,
               m.name as mill_name, m.village as mill_village,
               v.number as vehicle_number
        FROM loads l
        LEFT JOIN farmers f ON l.farmer_id = f.id
        LEFT JOIN mills m ON l.mill_id = m.id
        LEFT JOIN vehicles v ON l.vehicle_id = v.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ' AND (l.load_number LIKE ? OR f.name LIKE ? OR m.name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
        query += ' AND l.status = ?';
        params.push(status);
    }

    query += ' ORDER BY l.date DESC, l.created_at DESC';

    if (limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset || 0);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
});

ipcMain.handle('db:getLoad', (event, id) => {
    const stmt = db.prepare(`
        SELECT l.*,
               f.name as farmer_name, f.village as farmer_village,
               m.name as mill_name, m.village as mill_village,
               v.number as vehicle_number
        FROM loads l
        LEFT JOIN farmers f ON l.farmer_id = f.id
        LEFT JOIN mills m ON l.mill_id = m.id
        LEFT JOIN vehicles v ON l.vehicle_id = v.id
        WHERE l.id = ?
    `);
    return stmt.get(id);
});

ipcMain.handle('db:addLoad', (event, load) => {
    const stmt = db.prepare(`
        INSERT INTO loads (
            load_number, date, farmer_id, mill_id, vehicle_id, transaction_type,
            gross_kg, tare_kg, declared_bags, buy_rate_per_bag, sell_rate_per_bag,
            commission_policy, commission_split_percent,
            net_kg, net_bags, commission_bags, commission_amount,
            farmer_commission_share, mill_commission_share,
            labour, companion, weight_fee, vehicle_rent, other_expenses,
            labour_payer, companion_payer, weight_fee_payer, vehicle_rent_payer,
            farmer_gross_amount, farmer_total_deductions, farmer_payable,
            mill_gross_amount, mill_total_deductions, mill_receivable,
            status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        load.load_number, load.date, load.farmer_id, load.mill_id, load.vehicle_id, load.transaction_type,
        load.gross_kg, load.tare_kg || 0, load.declared_bags, load.buy_rate_per_bag, load.sell_rate_per_bag,
        load.commission_policy, load.commission_split_percent || 50,
        load.net_kg, load.net_bags, load.commission_bags, load.commission_amount,
        load.farmer_commission_share, load.mill_commission_share,
        load.labour || 0, load.companion || 0, load.weight_fee || 0, load.vehicle_rent || 0, load.other_expenses || 0,
        load.labour_payer || 'MILL', load.companion_payer || 'FARMER',
        load.weight_fee_payer || 'MILL', load.vehicle_rent_payer || 'MILL',
        load.farmer_gross_amount, load.farmer_total_deductions, load.farmer_payable,
        load.mill_gross_amount, load.mill_total_deductions, load.mill_receivable,
        load.status || 'CREATED', load.notes || null
    );

    return result.lastInsertRowid;
});

// IPC Handlers - Dashboard Statistics
ipcMain.handle('db:getDashboardStats', () => {
    const stats = {};

    // Today's loads
    const today = new Date().toISOString().split('T')[0];
    stats.todayLoads = db.prepare('SELECT COUNT(*) as count FROM loads WHERE date = ?').get(today).count;
    stats.todayBags = db.prepare('SELECT COALESCE(SUM(net_bags), 0) as total FROM loads WHERE date = ?').get(today).total;

    // Pending payments
    stats.pendingFromMills = db.prepare(`
        SELECT COALESCE(SUM(mill_receivable - mill_paid_amount), 0) as total
        FROM loads WHERE mill_payment_status != 'FULL'
    `).get().total;

    stats.pendingToFarmers = db.prepare(`
        SELECT COALESCE(SUM(farmer_payable - farmer_paid_amount), 0) as total
        FROM loads WHERE farmer_payment_status != 'FULL'
    `).get().total;

    // Month profit
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    const profit = db.prepare(`
        SELECT
            COALESCE(SUM(commission_amount), 0) as commission,
            COALESCE(SUM(credit_cut_amount), 0) as creditCut,
            COALESCE(SUM((sell_rate_per_bag - buy_rate_per_bag) * net_bags), 0) as margin
        FROM loads WHERE date >= ?
    `).get(monthStart);

    stats.monthProfit = profit.commission + profit.creditCut + profit.margin;

    // Active loads by status
    stats.loadsByStatus = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM loads
        GROUP BY status
    `).all();

    return stats;
});

// Backup functionality
ipcMain.handle('db:backup', async () => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Backup',
            defaultPath: `ricetrade-backup-${new Date().toISOString().split('T')[0]}.db`,
            filters: [{ name: 'Database', extensions: ['db'] }]
        });

        if (filePath) {
            const userDataPath = app.getPath('userData');
            const dbPath = path.join(userDataPath, 'ricetrade.db');
            fs.copyFileSync(dbPath, filePath);
            return { success: true, path: filePath };
        }
        return { success: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:restore', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Restore Backup',
            filters: [{ name: 'Database', extensions: ['db'] }],
            properties: ['openFile']
        });

        if (filePaths && filePaths[0]) {
            db.close();
            const userDataPath = app.getPath('userData');
            const dbPath = path.join(userDataPath, 'ricetrade.db');
            fs.copyFileSync(filePaths[0], dbPath);
            db = new Database(dbPath);
            db.pragma('journal_mode = WAL');
            return { success: true };
        }
        return { success: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
