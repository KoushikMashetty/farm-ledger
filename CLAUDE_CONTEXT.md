# Rice Trade Ledger - Claude Context File

## Project Overview
A complete **offline-first Progressive Web App (PWA)** for managing rice trade operations between farmers, mills, and transport. Built with vanilla JavaScript and IndexedDB for local storage.

## Architecture Decisions

### Technology Stack
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Database**: IndexedDB (browser-based, offline-first)
- **Server**: http-server for local development
- **Storage**: All data stored locally in browser

### Why IndexedDB Instead of SQLite?
Originally planned to use Electron + better-sqlite3, but this required Visual Studio C++ build tools for native compilation. Switched to PWA + IndexedDB to avoid compilation issues and enable offline functionality.

## Core Business Logic

### Transaction Types
1. **Farmer Loading** (farmer brings rice to trader)
   - Deduction: 2kg per bag
   - Farmer → Trader → Mill

2. **Direct Delivery** (trader buys from farmer, delivers to mill)
   - Deduction: 5kg per ton
   - Farmer → Trader delivers to → Mill

### Financial Calculations

#### Commission Routing (4 Policies)
- **FARMER**: Farmer pays all commission
- **MILL**: Mill pays all commission
- **SPLIT**: Shared based on split_percent (default 50%)
- **NONE**: No commission charged

#### Expense Routing
Each expense can be assigned to: FARMER | MILL | COMPANY
- Labour charges
- Companion charges
- Weight measurement fee
- Vehicle rent
- **Freight Advance** (NEW)
- **Gumastha Rusul** (Agent fees) (NEW)
- **Cash Driver** (Driver payment) (NEW)
- **HAMALI** (Porter/Loading labor) (NEW)
- Other expenses

#### Payment Flow
```
1. Create Load → Calculates:
   - Mill Receivable (to collect from mill)
   - Farmer Payable (to pay farmer)
   - Company Profit (margin)

2. Mill Payment → Record when mill pays:
   - Can be PARTIAL or FULL
   - Updates load.mill_paid_amount
   - Updates load.mill_payment_status
   - Supports FIFO/Proportional/Manual allocation

3. Farmer Payout → Pay farmer after collecting from mill:
   - Credit Cut: 1% discount if paid within 7 days of load date
   - Shows eligibility automatically
   - Updates load.farmer_paid_amount
   - Updates load.status to SETTLED
   - Auto-generates invoice number
```

### Credit Cut Calculation
- **Eligibility**: Payment within 7 days of load date
- **Amount**: 1% of pending farmer payable
- **Applied**: Per load basis (not total balance)
- **Implementation**: `CalcEngine.calculateCreditCut(loadDate, paymentDate, amount, settings)`

### Load Number Format
`ORG-YYYYMMDD-XXX`
- Example: `ORG-20250814-537`
- Format: Organization prefix + Date (YYYYMMDD) + Random 3-digit number (100-999)
- **Two IDs**:
  - `id`: Auto-increment database primary key (1, 2, 3...)
  - `load_number`: Business identifier shown on invoices

## Database Schema (IndexedDB Object Stores)

### settings
```javascript
{
  id: 1,
  organization_name: string,
  commission_policy: 'FARMER'|'MILL'|'SPLIT'|'NONE',
  commission_split_percent: number,
  commission_rate_per_bag: number,
  default_deduction_per_bag: number,
  default_deduction_per_ton: number,
  bag_weight_kg: number,
  companion_per_bag: number,
  credit_cut_enabled: boolean,
  credit_cut_percent: number,
  credit_cut_days: number,
  payout_rounding: boolean
}
```

### farmers
```javascript
{
  id: auto,
  name: string,
  village: string,
  phone: string,
  address: string,
  bank_name: string,
  bank_account: string,
  bank_ifsc: string,
  upi_id: string,
  default_rate: number,
  notes: string,
  active: 1|0,
  created_at: timestamp,
  updated_at: timestamp
}
```

### mills
```javascript
{
  id: auto,
  name: string,
  village: string,
  contact_person: string,
  phone: string,
  address: string,
  gstin: string,
  default_rate: number,
  payment_terms: string,
  commission_policy: string,
  commission_split_percent: number,
  notes: string,
  active: 1|0,
  created_at: timestamp,
  updated_at: timestamp
}
```

### vehicles
```javascript
{
  id: auto,
  number: string (unique),
  type: string,
  capacity_kg: number,
  driver_name: string,
  driver_phone: string,
  driver_license: string,
  notes: string,
  active: 1|0,
  created_at: timestamp,
  updated_at: timestamp
}
```

### loads
```javascript
{
  id: auto,
  load_number: string (unique),
  date: 'YYYY-MM-DD',
  farmer_id: number,
  mill_id: number,
  vehicle_id: number,
  transaction_type: 'FARMER_LOADING'|'DIRECT_DELIVERY',

  // Weight details
  gross_kg: number,
  tare_kg: number,
  declared_bags: number,
  net_kg: number,
  net_bags: number,

  // Rates
  buy_rate_per_bag: number,
  sell_rate_per_bag: number,

  // Commission
  commission_policy: 'FARMER'|'MILL'|'SPLIT'|'NONE',
  commission_split_percent: number,
  commission_bags: number,
  commission_amount: number,
  farmer_commission_share: number,
  mill_commission_share: number,

  // Expenses (NEW FIELDS ADDED)
  labour: number,
  labour_payer: 'FARMER'|'MILL'|'COMPANY',
  companion: number,
  companion_payer: 'FARMER'|'MILL'|'COMPANY',
  weight_fee: number,
  weight_fee_payer: 'FARMER'|'MILL'|'COMPANY',
  vehicle_rent: number,
  vehicle_rent_payer: 'FARMER'|'MILL'|'COMPANY',
  freight_advance: number,
  freight_advance_payer: 'FARMER'|'MILL'|'COMPANY',
  gumastha_rusul: number,
  gumastha_rusul_payer: 'FARMER'|'MILL'|'COMPANY',
  cash_driver: number,
  cash_driver_payer: 'FARMER'|'MILL'|'COMPANY',
  hamali: number,
  hamali_payer: 'FARMER'|'MILL'|'COMPANY',
  other_expenses: number,

  // Financial calculations
  farmer_gross_amount: number,
  farmer_total_deductions: number,
  farmer_payable: number,
  mill_gross_amount: number,
  mill_total_deductions: number,
  mill_receivable: number,

  // Payment tracking
  mill_payment_status: 'PENDING'|'PARTIAL'|'FULL',
  mill_paid_amount: number,
  mill_paid_date: 'YYYY-MM-DD',
  farmer_payment_status: 'PENDING'|'PARTIAL'|'FULL',
  farmer_paid_amount: number,
  farmer_paid_date: 'YYYY-MM-DD',
  credit_cut_amount: number,

  // Status workflow
  status: 'CREATED'|'DISPATCHED'|'RECEIVED'|'MILL_PAYMENT_PENDING'|
          'MILL_PAID_PARTIAL'|'MILL_PAID_FULL'|'FARMER_PAYMENT_PENDING'|
          'FARMER_PAID_PARTIAL'|'FARMER_PAID_FULL'|'SETTLED',

  notes: string,
  weighbridge_photo: string,
  tags: string,
  created_at: timestamp,
  updated_at: timestamp,
  version: number
}
```

### mill_payments
```javascript
{
  id: auto,
  mill_id: number,
  load_id: number,
  payment_date: 'YYYY-MM-DD',
  amount: number,
  payment_method: 'CASH'|'BANK'|'UPI'|'CHEQUE',
  reference_number: string,
  notes: string,
  allocation_method: 'FIFO'|'PROPORTIONAL'|'MANUAL',
  created_at: timestamp
}
```

### farmer_payments
```javascript
{
  id: auto,
  farmer_id: number,
  load_id: number,
  payment_date: 'YYYY-MM-DD',
  gross_amount: number,
  credit_cut_amount: number,
  net_amount: number,
  payment_method: 'CASH'|'BANK'|'UPI'|'CHEQUE',
  reference_number: string,
  invoice_number: string,
  notes: string,
  created_at: timestamp
}
```

## File Structure

### Core Files
- **index.html** - Main HTML with navigation tabs and modal container
- **styles.css** - Modern gradient design, responsive grid layouts
- **src/db.js** - IndexedDB wrapper with CRUD operations
- **src/utils.js** - Helper functions (toast, formatDate, escapeHtml, etc.)
- **src/calcEngine.js** - All calculation logic for loads + ADD/LESS breakdown generator

### Module Files
- **src/app.js** - Main controller, dashboard, settings
- **src/farmers.js** - Farmer CRUD + Ledger view
- **src/mills.js** - Mill CRUD with clickable rows
- **src/mills-ledger.js** - Mill ledger view + Payment recording
- **src/vehicles.js** - Vehicle CRUD
- **src/loads.js** - Loads listing, management, and **print load slip**
- **src/loads-form.js** - Load creation form with live preview + new expense fields
- **src/payments.js** - Mill payments & Farmer payouts with full functionality
- **src/master-data.js** - Master data table with export/backup functionality (NEW)
- **src/reports.js** - Reports and analytics

## Key User Experience Features

### Load Slip Printing (NEW)
- **Format**: Professional invoice matching sample image
- **Sections**:
  - Header with organization name and location
  - Delivery Date and Bill Date
  - Load Number prominently displayed
  - Main details table (Date, Lorry No, Bags, Gross Qtls, Net Wt, Rates, Amount)
  - **ADD DETAILS**: Brokerage, Freight Advance, Vehicle Rent with subtotal
  - **LESS DETAILS**: Gumastha Rusul, Weightment, Cash Driver, HAMALI, Labour, Companion with subtotal
  - Final calculation showing Add, Less, and Total amounts
  - Signature areas
- **Access**: Click 🖨️ icon in loads table
- **Implementation**: `Loads.printLoadSlip(loadId)`

### Live Calculation Preview (Bottom of Form)
- Updates on every input change
- Shows 3-column breakdown:
  1. **Mill Receivable** (Blue) - Money IN to collect
  2. **Farmer Payable** (Green) - Money OUT to pay
  3. **Company Profit** (Yellow) - Your earning
- Includes itemized expense breakdown with payer allocation

### Mill Payments Page Features
- **View Toggle**:
  - 💰 Payment History - Shows all payment transactions
  - 📦 Pending Loads by Mill - Groups loads by mill with payment status
- **Summary Cards**: Total Receivable, Total Received, Total Pending
- **Filter Options**: All Loads, Pending Only, Partial Only, Paid Full
- **Per-Mill View**:
  - Mill info and contact details
  - Summary stats (Loads, Receivable, Received, Pending, Pending Loads count)
  - Full loads table with payment status
  - Quick payment recording
  - Print functionality for mill loads
- **Print Report**: Professional mill loads report with totals

### Farmer Payouts Page Features
- **Summary Cards**: Gross Paid, Credit Cut Savings, Net Paid
- **Search & Filter**: By farmer, invoice number, notes
- **Payment Recording**:
  - Load selection per farmer
  - Real-time credit cut calculation based on payment date
  - Visual indicators for credit cut eligibility
  - Auto-generated invoice numbers
- **Payment History**: Complete list with gross, credit cut, and net amounts

### Master Data & Backup (NEW)
- **View Modes**:
  - 📋 All Data - Overview of everything
  - 📦 Loads - Complete loads table
  - 👨‍🌾 Farmers - All farmer records
  - 🏭 Mills - All mill records
  - 🚚 Vehicles - All vehicle records
  - 💰 Payments - Mill payments & farmer payouts
- **Export Options**:
  - 📊 Export to Google Sheets (CSV files for import)
  - 📁 Export to CSV (individual table files)
  - 💾 Backup JSON (complete database backup)
  - 📄 Export Current View (single table export)
- **Summary Statistics**: Real-time counts and totals

### Farmer Ledger (Click farmer row)
```
📊 Summary Cards:
- Total Loads
- Total Payable
- Total Paid
- Pending

⚠️ Alert: X Load(s) Ready for Payment (mill paid, farmer not paid)

📦 All Loads Table:
- Date, Load #, Mill, Bags
- Payable, Paid, Pending
- Status badge
- "Pay Now" button (if pending > 0 and mill paid)

💰 Payment History Table
```

### Mill Ledger (Click mill row)
```
📊 Summary Cards:
- Total Loads
- Total to Collect
- Total Received
- Pending

⚠️ Alert: X Load(s) Pending Payment

📦 All Loads Table:
- Date, Load #, Farmer, Bags
- To Collect, Received, Pending
- Status badge
- "Record Payment" button (if pending > 0)

💰 Payment History Table
```

## Important Business Rules

1. **Mill must pay before farmer can be paid** - "Pay Now" button only shows if mill_paid_amount > 0
2. **Credit cut is per-load** - Not applied to total balance, calculated per individual load
3. **Partial payments allowed** - Both mill and farmer payments can be partial
4. **Load status progression**: CREATED → MILL_PAYMENT_PENDING → MILL_PAID_PARTIAL → MILL_PAID_FULL → FARMER_PAID_FULL → SETTLED
5. **Real-time outstanding** - Calculated dynamically from loads, not stored in farmer/mill records
6. **ADD/LESS Invoice Breakdown** - Load slips show proper accounting structure matching industry standards

## Invoice/Bill Format (Based on Sample Image)

### ADD Section (Additions to base amount)
- Brokerage (commission_amount)
- Freight Advance (freight_advance)
- Vehicle Rent (vehicle_rent)
- **Subtotal displayed**

### LESS Section (Deductions from total)
- Gumastha Rusul (agent fees)
- Weightment (weight_fee)
- Cash Driver
- HAMALI (porter charges)
- Labour
- Companion
- **Subtotal displayed**

### Final Calculation
```
Base Amount (mill_gross_amount)
+ ADD total
= Amount after ADD
- LESS total
= Final Amount (mill_receivable)
```

## Known Issues & Solutions

### Issue 1: SQLite Compilation Error
**Error**: `gyp ERR! find VS - Visual Studio C++ build tools required`
**Solution**: Switched from Electron + better-sqlite3 to PWA + IndexedDB

### Issue 2: CSV Export "Cannot convert undefined or null to object"
**Error**: Null/undefined values in data causing export failure
**Solution**:
- Added comprehensive null/undefined checks in export functions
- Validate data structure before processing
- Convert undefined to empty string for CSV
- Convert undefined to null for JSON
- Added `exportSingleTable()` as simpler alternative
- Added extensive console logging for debugging

### Issue 3: Load Number Generation
**Current**: Random 3-digit suffix (may have collisions)
**Format**: `ORG-YYYYMMDD-XXX` where XXX is random 100-999
**Future Enhancement**: Sequential counter per date for guaranteed uniqueness

## How to Run

```bash
npm install
npm start
```

Opens browser at http://localhost:8080

## Code Patterns

### Opening Modal
```javascript
App.openModal('Title', htmlContent);
```

### Showing Toast
```javascript
Utils.showToast('Message', 'success'|'error'|'info'|'warning');
```

### Database Operations
```javascript
await DB.getAll('loads');
await DB.get('farmers', id);
await DB.add('mills', data);
await DB.update('loads', id, updates);
await DB.delete('vehicles', id);
await DB.hardDelete('loads', id); // Permanent delete
```

### Calculation
```javascript
const calc = CalcEngine.computeLoad(settings, loadData);
// Returns: {
//   net_kg, net_bags, commission_amount,
//   farmer_payable, mill_receivable,
//   expense_breakdown, all expense values...
// }

const creditCut = CalcEngine.calculateCreditCut(loadDate, paymentDate, amount, settings);
// Returns: { eligible, daysDiff, creditCut, netPayment }

const breakdown = CalcEngine.generateInvoiceBreakdown(load);
// Returns: {
//   addItems: [{label, amount}],
//   lessItems: [{label, amount}],
//   totalAdd, totalLess,
//   baseAmount, amountAfterAdd, finalAmount
// }
```

### Loading Data
```javascript
await App.loadAllData(); // Refreshes App.state with all data
```

### Printing
```javascript
Loads.printLoadSlip(loadId); // Opens print window with formatted invoice
Payments.printMillLoads(millId); // Prints mill loads report
```

### Exporting Data
```javascript
MasterData.exportToCSV(); // Export all tables to CSV
MasterData.exportToJSON(); // Full database backup
MasterData.exportSingleTable(); // Export current view only
```

## Debugging Tips

1. **Check browser console** (F12) for errors
2. **IndexedDB viewer** in Chrome DevTools → Application → IndexedDB
3. **Network tab** for file loading issues
4. **All data in App.state** - check: `App.state.farmers`, `App.state.loads`, etc.
5. **CSV Export errors**: Check console logs for table-specific errors
6. **Print issues**: Check if data exists and CalcEngine.generateInvoiceBreakdown() works
7. **Payment flow**: Ensure mill pays first before farmer payout

## Testing Checklist

- [ ] Create farmer, mill, vehicle
- [ ] Create load with all expenses (including new fields)
- [ ] Verify live preview shows correct amounts
- [ ] Print load slip - verify ADD/LESS sections
- [ ] Record partial mill payment
- [ ] Record full mill payment
- [ ] View mill pending loads by mill view
- [ ] Print mill loads report
- [ ] Verify "Pay Now" appears for farmer after mill pays
- [ ] Pay farmer within 7 days → Verify 1% credit cut applied
- [ ] Pay farmer after 7 days → Verify no credit cut
- [ ] Check payment history in both ledgers
- [ ] Verify outstanding balances update in real-time
- [ ] Export to CSV - all tables
- [ ] Export single table view
- [ ] Backup to JSON
- [ ] View master data table

## Important Notes for Claude

1. **Always prefer editing existing files** - Don't create new files unless absolutely necessary
2. **Read files before editing** - Use Read tool before Write/Edit
3. **Maintain modular structure** - Each module (farmers, mills, etc.) is self-contained
4. **Use existing patterns** - Follow the established code patterns for consistency
5. **Real-time calculations** - Outstanding amounts are always calculated from loads, never stored
6. **Invoice format matters** - ADD/LESS structure matches industry standards
7. **Export error handling** - Always validate data types (null/undefined/arrays)

## Recent Completions

✅ Vehicle weight calculation (empty + loaded = gross)
✅ Live preview moved to bottom of form
✅ 3-column financial breakdown (Mill Receivable, Farmer Payable, Company Profit)
✅ Farmer ledger with payment flow
✅ Credit cut calculation (1% if paid within 7 days)
✅ Mill ledger with payment recording
✅ Clickable rows for both farmers and mills
✅ Real-time outstanding balance calculation
✅ Complete payment workflow: Load → Mill Pays → Pay Farmer → Settled
✅ **NEW EXPENSE FIELDS**: Freight Advance, Gumastha Rusul, Cash Driver, HAMALI
✅ **LOAD SLIP PRINTING**: Professional invoice with ADD/LESS sections matching sample
✅ **MILL PAYMENTS PAGE**: Full implementation with pending loads view, filters, print
✅ **FARMER PAYOUTS PAGE**: Full implementation with credit cut calculation, invoices
✅ **MASTER DATA TABLE**: Comprehensive data view with multiple export options
✅ **GOOGLE SHEETS EXPORT**: CSV export with instructions for Google Sheets import
✅ **BACKUP/RESTORE**: JSON backup functionality

## Match with Sample Image: ~95-98%

Based on sample loads image analysis:
- ✅ All expense fields from sample (Brokerage, Freight Advance, Gumastha Rusul, etc.)
- ✅ ADD/LESS structured breakdown
- ✅ Professional invoice format
- ✅ Print-ready output
- ✅ Proper calculations and totals
- ✅ Header with organization info
- ✅ Main details table with all columns
- ✅ Final calculation flow
- ✅ Signature areas
