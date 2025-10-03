# Rice Trade Ledger - Complete Farmer-Mill Management System

## 🎯 Overview

A complete offline-first desktop application for managing rice trade operations between farmers and mills. Built with Electron, SQLite, and vanilla JavaScript.

## ✨ Core Features

### 1. **Load Management**
- Two transaction types:
  - **Farmer Loading**: Deduct 2kg/bag (husk removal)
  - **Direct Delivery**: Deduct 5kg/ton (wastage)
- Auto-calculate net weight and net bags
- Flexible commission routing (Farmer/Mill/Split/None)
- Expense management with routing
- Real-time calculation preview
- Unique load numbering: `ORG-YYYYMMDD-XXX`

### 2. **Payment Tracking**
- **Mill Payments**: FIFO/Proportional/Manual allocation
- **Farmer Payouts**: Credit cut (1% if paid within 7 days)
- Installment tracking
- Receipt generation
- Telugu invoice support

### 3. **Master Data**
- Farmers (with CRUD operations)
- Mills (with CRUD operations)
- Vehicles (with CRUD operations)
- Search, filter, and pagination

### 4. **Reporting**
- Dashboard with real-time statistics
- Farmer/Mill ledgers
- Monthly profit reports
- Outstanding balances
- Top performers
- Date range filtering

### 5. **Data Management**
- SQLite database (offline-first)
- Version control on all records
- Change audit trail
- Backup/Restore functionality
- CSV import/export

## 📁 Project Structure

```
rice-trade-app/
├── electron/
│   ├── main.js          # Electron main process
│   ├── preload.js       # IPC bridge
│   └── schema.sql       # Database schema
├── src/
│   ├── app.js           # Main application controller
│   ├── calcEngine.js    # Calculation engine
│   ├── utils.js         # Utility functions
│   ├── ui.js            # UI helpers
│   ├── farmers.js       # Farmer management
│   ├── mills.js         # Mill management
│   ├── vehicles.js      # Vehicle management
│   ├── loads.js         # Load management
│   ├── payments.js      # Payment management
│   └── reports.js       # Reporting module
├── index.html           # Main HTML
├── styles.css           # Styles
├── package.json         # Dependencies
└── README.md           # This file
```

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   # Windows
   npm run build:win

   # Mac
   npm run build:mac

   # Linux
   npm run build:linux
   ```

## 💾 Database Schema

### Core Tables
- `settings` - Global configuration
- `farmers` - Farmer master data
- `mills` - Mill master data
- `vehicles` - Vehicle master data
- `loads` - Main transaction table
- `mill_payments` - Payments from mills
- `mill_payment_allocations` - Payment allocation to loads
- `farmer_payments` - Payments to farmers
- `change_log` - Audit trail

### Key Features
- Foreign key constraints
- Auto-increment primary keys
- Indexes on frequently queried columns
- Version tracking on all records
- Timestamps (created_at, updated_at)

## 🧮 Calculation Engine

### Load Settlement Formula

```javascript
// Step 1: Net Weight
if (transaction_type === 'FARMER_LOADING') {
    deduction = declared_bags × 2kg
} else {
    deduction = gross_kg × (5/1000)
}
net_kg = gross_kg - tare_kg - deduction
net_bags = round(net_kg / 75kg)

// Step 2: Commission
commission_amount = net_bags × commission_per_bag
// Route based on policy: FARMER/MILL/SPLIT/NONE

// Step 3: Expenses
// Route: labour, companion, weight_fee, vehicle_rent
// Payer: FARMER/MILL/COMPANY

// Step 4: Farmer Settlement
farmer_gross = net_bags × buy_rate
farmer_deductions = commission + expenses
farmer_payable = gross - deductions

// Step 5: Mill Settlement
mill_gross = net_bags × sell_rate
mill_deductions = commission + expenses
mill_receivable = gross - deductions
```

### Credit Cut (Early Payment Discount)

```javascript
// Applied PER LOAD, not on total balance
if (payment_date - load_date <= 7 days) {
    credit_cut = farmer_payable × 1%
    net_payment = farmer_payable - credit_cut
    // Credit cut is additional income for company
}
```

## 🎨 User Interface

### Dashboard
- Today's loads count
- Month profit
- Pending from mills
- Pending to farmers
- Loads by status
- Recent loads table

### Forms
- Auto-complete for farmers/mills/vehicles
- Real-time validation
- Calculation preview
- Keyboard shortcuts (Tab navigation)
- Success/Error notifications

### Tables
- Pagination (50 per page)
- Search and filter
- Sort by columns
- Export to CSV
- Responsive design

## 🔒 Data Security

- SQLite with WAL mode (Write-Ahead Logging)
- Foreign key constraints enforced
- Version control on all edits
- Complete audit trail
- Soft deletes (active flag)
- Input validation and sanitization

## 📊 Reports Available

1. **Dashboard** - Real-time overview
2. **Farmer Ledger** - Complete transaction history per farmer
3. **Mill Ledger** - Complete transaction history per mill
4. **Monthly Summary** - Profit/loss statement
5. **Outstanding Report** - Pending payments
6. **Top Performers** - Rankings by volume
7. **Commission Report** - Income breakdown
8. **Credit Cut Analysis** - Early payment trends

## 🌐 Multi-Language Support

- English for data entry
- Telugu for invoices and receipts
- Font: Noto Sans Telugu (embedded in PDFs)
- Bilingual templates

## 🛠️ Development

### Code Style
- ES6+ JavaScript
- Modular architecture
- Async/await for database calls
- Error handling with try-catch
- JSDoc comments

### Testing
- Sample data generation
- Database reset function
- Debug mode (--dev flag)

### Performance
- Indexed queries (<100ms)
- Pagination for large datasets
- Debounced search
- Optimistic UI updates

## 📱 Platform Support

- ✅ Windows (64-bit)
- ✅ macOS (Intel + Apple Silicon)
- ✅ Linux (AppImage + DEB)

## 🔄 Backup & Restore

### Manual Backup
1. Click backup icon in header
2. Choose save location
3. Database file saved as `.db`

### Manual Restore
1. Click restore icon
2. Select backup file
3. Confirm overwrite
4. App restarts with restored data

### Auto-Backup (Future Phase)
- Scheduled daily backups
- Google Drive integration
- Cloud sync (Supabase)

## 📝 License

MIT License - Free for commercial use

## 🤝 Support

For issues and feature requests, contact support.

---

## 🚦 Getting Started Guide

### First-Time Setup

1. **Configure Settings:**
   - Go to Settings tab
   - Set organization name
   - Configure default rates and policies
   - Save settings

2. **Add Master Data:**
   - Add farmers (at least 2-3)
   - Add mills (at least 2-3)
   - Add vehicles (at least 1)

3. **Create First Load:**
   - Go to Loads tab
   - Click "New Load"
   - Fill in details
   - Review calculation preview
   - Save load

4. **Record Payments:**
   - When mill pays, go to Mill Payments
   - Record payment and allocate to loads
   - When paying farmer, go to Farmer Payouts
   - Select load and record payment

5. **View Reports:**
   - Check Dashboard for overview
   - View detailed reports as needed
   - Export data to CSV/Excel

### Tips for Efficient Use

- Use keyboard shortcuts (Tab to navigate)
- Search by name/village/phone in all master tables
- Filter loads by status for focused work
- Export backups regularly
- Review monthly reports for business insights

---

**Version:** 1.0.0
**Last Updated:** 2025-01-03
**Built with:** Electron + SQLite + Vanilla JS
