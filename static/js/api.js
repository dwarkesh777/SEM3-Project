// API Service Module - Handles all API communications
class ApiService {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(email, password) {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);

        const response = await fetch(`${this.baseURL}/login`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (response.ok) {
            this.token = data.access_token;
            if (this.token) {
                localStorage.setItem('access_token', this.token);
            }
        }
        
        return data;
    }

    async register(userData) {
        const formData = new FormData();
        Object.keys(userData).forEach(key => {
            formData.append(key, userData[key]);
        });

        const response = await fetch(`${this.baseURL}/register`, {
            method: 'POST',
            body: formData
        });

        return await response.json();
    }

    async logout() {
        try {
            await this.request('/logout');
        } finally {
            this.token = null;
            localStorage.removeItem('access_token');
            sessionStorage.removeItem('access_token');
        }
    }

    // Hostel methods
    async getHostels(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/api/hostels?${queryString}`);
    }

    async getHostel(id) {
        return await this.request(`/api/hostels/${id}`);
    }

    async searchHostels(query) {
        const formData = new FormData();
        formData.append('query', query);

        const response = await fetch(`${this.baseURL}/search`, {
            method: 'POST',
            body: formData
        });

        return await response.json();
    }

    async addHostel(hostelData) {
        const formData = new FormData();
        Object.keys(hostelData).forEach(key => {
            if (Array.isArray(hostelData[key])) {
                hostelData[key].forEach(item => formData.append(key, item));
            } else {
                formData.append(key, hostelData[key]);
            }
        });

        const response = await fetch(`${this.baseURL}/add`, {
            method: 'POST',
            body: formData
        });

        return await response.json();
    }

    // User profile methods
    async updateProfile(profileData) {
        return await this.request('/update-profile', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }

    async getUserProfile() {
        return await this.request('/api/user/profile');
    }

    // OAuth methods
    async googleOAuth() {
        window.location.href = `${this.baseURL}/auth/google`;
    }

    async facebookOAuth() {
        window.location.href = `${this.baseURL}/auth/facebook`;
    }

    async firebaseGoogleAuth(idToken, userData) {
        return await this.request('/auth/firebase/google', {
            method: 'POST',
            body: JSON.stringify({ idToken, user: userData })
        });
    }
}

// Export as singleton
const apiService = new ApiService();
export default apiService;
