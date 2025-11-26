// API Client for Timesheet Server Communication

class TimesheetAPI {
    constructor() {
        this.serverUrl = '';
        this.token = null;
    }

    async initialize() {
        // Load server URL from settings
        if (typeof window.electronAPI !== 'undefined') {
            try {
                const result = await window.electronAPI.loadSettings();
                if (result.success && result.settings) {
                    this.serverUrl = result.settings.serverUrl || '';
                }
            } catch (error) {
                console.error('Error loading server URL:', error);
            }
        }
    }

    async request(endpoint, options = {}) {
        if (!this.serverUrl) {
            throw new Error('Server URL not configured');
        }

        const url = `${this.serverUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Public endpoints (no auth required)

    async testConnection() {
        try {
            const data = await this.request('/api/health');
            return data.status === 'ok';
        } catch (error) {
            return false;
        }
    }

    async getSupervisors() {
        return await this.request('/api/supervisors/list');
    }

    async submitTimesheet(timesheetData) {
        return await this.request('/api/timesheets/submit', {
            method: 'POST',
            body: JSON.stringify(timesheetData)
        });
    }

    // Supervisor endpoints (auth required)

    async supervisorLogin(username, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (data.success && data.token) {
            this.token = data.token;
        }

        return data;
    }

    async supervisorLogout(token) {
        return await this.request('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    async getPendingTimesheets(token) {
        return await this.request('/api/timesheets/pending', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    async getApprovedTimesheets(token) {
        return await this.request('/api/timesheets/approved', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    async getRejectedTimesheets(token) {
        return await this.request('/api/timesheets/rejected', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    async getTimesheet(id, token) {
        return await this.request(`/api/timesheets/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    async approveTimesheet(id, token, supervisorSignature, signatureDate) {
        return await this.request(`/api/timesheets/${id}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                supervisorSignature,
                supervisorSignatureDate: signatureDate
            })
        });
    }

    async rejectTimesheet(id, token, reason) {
        return await this.request(`/api/timesheets/${id}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason })
        });
    }

    // Load saved token on initialization
    async restoreSession() {
        if (typeof window.electronAPI !== 'undefined') {
            try {
                const result = await window.electronAPI.loadSettings();
                if (result.success && result.settings && result.settings.supervisorToken) {
                    this.token = result.settings.supervisorToken;
                    return true;
                }
            } catch (error) {
                console.error('Error restoring session:', error);
            }
        }
        return false;
    }
}

// Create global instance
window.timesheetAPI = new TimesheetAPI();
