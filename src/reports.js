// Reports Module - Placeholder
const Reports = {
    async show() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">Reports & Analytics</div>
                <p class="no-data">Reports module - Coming soon in next update</p>
                <div class="quick-actions">
                    <button class="btn btn-secondary" disabled>📊 Farmer Ledger</button>
                    <button class="btn btn-secondary" disabled>📊 Mill Ledger</button>
                    <button class="btn btn-secondary" disabled>📊 Monthly Summary</button>
                    <button class="btn btn-secondary" disabled>📊 Outstanding Report</button>
                </div>
            </div>
        `;
    }
};
