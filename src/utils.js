/**
 * =============================================================================
 * UTILITY FUNCTIONS - Helper Methods for UI and Data Operations
 * =============================================================================
 *
 * Purpose: Provides reusable utility functions used throughout the application
 *
 * Categories:
 * 1. UI Notifications (toast messages, confirmations)
 * 2. Date Formatting and Manipulation
 * 3. Data Export (CSV, JSON)
 * 4. Security (XSS prevention)
 * 5. Performance (debounce)
 * 6. Display Helpers (status badges, formatting)
 *
 * Author: Rice Trade Solutions
 * Last Updated: 2025-01-03
 * =============================================================================
 */

const Utils = {
    /**
     * =================================================================
     * TOAST NOTIFICATION SYSTEM
     * =================================================================
     * Display temporary notification messages to user
     * Auto-dismisses after 3 seconds
     *
     * @param {string} message - Message to display
     * @param {string} type - Notification type (success, error, info, warning)
     */
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Get or create toast container
        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Trigger show animation after a brief delay (for CSS transition)
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            // Remove from DOM after fade-out animation
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * =================================================================
     * CONFIRMATION DIALOG
     * =================================================================
     * Show native browser confirmation dialog
     *
     * @param {string} message - Confirmation message
     * @returns {Promise<boolean>} True if user confirms, false otherwise
     */
    async confirm(message) {
        return new Promise((resolve) => {
            const result = window.confirm(message);
            resolve(result);
        });
    },

    /**
     * =================================================================
     * DATE FORMATTER
     * =================================================================
     * Format date string for display
     * Converts YYYY-MM-DD to DD-MM-YYYY (Indian format)
     *
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @returns {string} Formatted date in DD-MM-YYYY format
     */
    formatDate(dateStr) {
        if (!dateStr) return '';

        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    },

    /**
     * =================================================================
     * GET TODAY'S DATE
     * =================================================================
     * Get current date in YYYY-MM-DD format (for date inputs)
     *
     * @returns {string} Today's date in YYYY-MM-DD format
     */
    getToday() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * =================================================================
     * DEBOUNCE FUNCTION
     * =================================================================
     * Delays function execution until after user stops typing
     * Used for search inputs to avoid excessive database queries
     *
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     *
     * Example:
     * const debouncedSearch = debounce(searchFunction, 300);
     * inputElement.addEventListener('input', debouncedSearch);
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * =================================================================
     * XSS PROTECTION
     * =================================================================
     * Escape HTML characters to prevent XSS attacks
     * IMPORTANT: Use this before displaying user input in HTML
     *
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML-safe text
     *
     * Example:
     * const safeHtml = escapeHtml(userInput);
     * element.innerHTML = safeHtml;
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * =================================================================
     * UNIQUE ID GENERATOR
     * =================================================================
     * Generate unique identifier for temporary use
     *
     * @returns {string} Unique ID
     */
    generateId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * =================================================================
     * CSV EXPORT
     * =================================================================
     * Export array of objects to CSV file
     * Triggers download in browser
     *
     * @param {Array<Object>} data - Array of objects to export
     * @param {string} filename - Filename (without extension)
     *
     * Example:
     * exportToCSV(farmers, 'farmers-export');
     * // Downloads: farmers-export-2025-01-03.csv
     */
    exportToCSV(data, filename) {
        // Validate input
        if (!data || data.length === 0) {
            Utils.showToast('No data to export', 'warning');
            return;
        }

        // Extract headers from first object
        const headers = Object.keys(data[0]);

        // Build CSV content
        const csvContent = [
            // Header row
            headers.join(','),
            // Data rows
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Wrap values containing commas in quotes
                    return typeof value === 'string' && value.includes(',')
                        ? `"${value}"`
                        : value;
                }).join(',')
            )
        ].join('\n');

        // Create Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}-${Utils.getToday()}.csv`;
        link.click();

        // Clean up
        URL.revokeObjectURL(link.href);
    },

    /**
     * =================================================================
     * CSV PARSER
     * =================================================================
     * Parse CSV file content into array of objects
     *
     * @param {File} file - CSV file from file input
     * @returns {Promise<Array<Object>>} Parsed data
     *
     * Example:
     * const data = await parseCSV(fileInput.files[0]);
     */
    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n');

                    // Parse header row
                    const headers = lines[0].split(',').map(h => h.trim());
                    const data = [];

                    // Parse data rows
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue; // Skip empty lines

                        const values = lines[i].split(',').map(v => v.trim());
                        const obj = {};

                        // Map values to headers
                        headers.forEach((header, index) => {
                            obj[header] = values[index];
                        });

                        data.push(obj);
                    }

                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    /**
     * =================================================================
     * STATUS BADGE COLOR
     * =================================================================
     * Get appropriate badge color for status
     *
     * @param {string} status - Status value
     * @returns {string} Badge color class (success, warning, error, info)
     */
    getStatusColor(status) {
        const colors = {
            // Load statuses
            'CREATED': 'info',
            'DISPATCHED': 'info',
            'RECEIVED': 'info',
            'MILL_PAYMENT_PENDING': 'warning',
            'MILL_PAID_PARTIAL': 'warning',
            'MILL_PAID_FULL': 'success',
            'FARMER_PAYMENT_PENDING': 'warning',
            'FARMER_PAID_PARTIAL': 'warning',
            'FARMER_PAID_FULL': 'success',
            'SETTLED': 'success',

            // Payment statuses
            'PENDING': 'warning',
            'PARTIAL': 'warning',
            'FULL': 'success'
        };

        return colors[status] || 'secondary';
    },

    /**
     * =================================================================
     * STATUS FORMATTER
     * =================================================================
     * Format status for display (Title Case, no underscores)
     *
     * @param {string} status - Status to format
     * @returns {string} Formatted status
     *
     * Example:
     * formatStatus('MILL_PAID_FULL') => 'Mill Paid Full'
     */
    formatStatus(status) {
        return status
            .replace(/_/g, ' ')            // Replace underscores with spaces
            .toLowerCase()                 // Convert to lowercase
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
    },

    /**
     * =================================================================
     * DAYS BETWEEN CALCULATOR
     * =================================================================
     * Calculate number of days between two dates
     *
     * @param {string} date1 - First date (YYYY-MM-DD)
     * @param {string} date2 - Second date (YYYY-MM-DD)
     * @returns {number} Number of days between dates
     *
     * Example:
     * daysBetween('2025-01-01', '2025-01-10') => 9
     */
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    },

    /**
     * =================================================================
     * SAFE NUMBER PARSER
     * =================================================================
     * Parse string to number, return 0 if invalid
     *
     * @param {any} value - Value to parse
     * @returns {number} Parsed number or 0
     */
    parseNumber(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    },

    /**
     * =================================================================
     * SAFE INTEGER PARSER
     * =================================================================
     * Parse string to integer, return 0 if invalid
     *
     * @param {any} value - Value to parse
     * @returns {number} Parsed integer or 0
     */
    parseInt(value) {
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
    },

    /**
     * =================================================================
     * VALIDATE PHONE NUMBER
     * =================================================================
     * Basic phone number validation (10 digits)
     *
     * @param {string} phone - Phone number to validate
     * @returns {boolean} True if valid
     */
    validatePhone(phone) {
        if (!phone) return false;
        const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
        return cleaned.length === 10;
    },

    /**
     * =================================================================
     * VALIDATE EMAIL
     * =================================================================
     * Basic email validation
     *
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    validateEmail(email) {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * =================================================================
     * TRUNCATE TEXT
     * =================================================================
     * Truncate long text with ellipsis
     *
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     *
     * Example:
     * truncate('Very long text here', 10) => 'Very long...'
     */
    truncate(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * =================================================================
     * CAPITALIZE FIRST LETTER
     * =================================================================
     * Capitalize first letter of string
     *
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * =================================================================
     * FORMAT FILE SIZE
     * =================================================================
     * Format file size in bytes to human-readable format
     *
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     *
     * Example:
     * formatFileSize(1024) => '1.00 KB'
     * formatFileSize(1048576) => '1.00 MB'
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * =================================================================
     * DEEP CLONE OBJECT
     * =================================================================
     * Create deep copy of object (simple version)
     *
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * =================================================================
     * IS EMPTY
     * =================================================================
     * Check if value is empty (null, undefined, '', [], {})
     *
     * @param {any} value - Value to check
     * @returns {boolean} True if empty
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        if (Array.isArray(value) && value.length === 0) return true;
        if (typeof value === 'object' && Object.keys(value).length === 0) return true;
        return false;
    }
};
